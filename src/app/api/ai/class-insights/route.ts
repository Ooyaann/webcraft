import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import {
  learningSubmissions,
  learningTasks,
  pertemuan,
  users,
} from "@/db/schema";
import { generateTeacherInsights } from "@/lib/ai";
import { requireUser } from "@/lib/auth";
import { handler, HttpError, parseBody } from "@/lib/http";
import { enforceAiRateLimit } from "@/lib/rateLimit";

const requestSchema = z.object({
  room_id: z.string(),
  pertemuan_id: z.string().nullish(),
});

// POST /api/ai/class-insights — heatmap error kelas + saran AI (guru)
export const POST = handler(async (req) => {
  const user = await requireUser(req);
  enforceAiRateLimit(req, user);
  if (user.role !== "guru") {
    throw new HttpError(403, "Akses ditolak. Endpoint ini hanya untuk akun Guru.");
  }
  const body = await parseBody(req, requestSchema);
  const db = getDb();

  const rows = await db
    .select({ sub: learningSubmissions, studentName: users.name })
    .from(learningSubmissions)
    .innerJoin(learningTasks, eq(learningSubmissions.task_id, learningTasks.id))
    .innerJoin(pertemuan, eq(learningTasks.pertemuan_id, pertemuan.id))
    .innerJoin(users, eq(learningSubmissions.siswa_id, users.id))
    .where(eq(pertemuan.room_id, body.room_id));

  if (!rows.length) {
    // Fallback anggun bila belum ada pengerjaan (100% dari DB, tanpa data dummy)
    return NextResponse.json({
      ct_class_average: 0,
      error_heatmap: [],
      struggling_students: [],
      recommendations:
        "Belum ada data pengerjaan dari siswa untuk membuat analisis rekomendasi belajar kelas.",
    });
  }

  const classData: Record<string, unknown>[] = [];
  let totalScore = 0;
  const errorCounts: Record<string, number> = {};
  const struggling: Record<string, unknown>[] = [];

  for (const { sub, studentName } of rows) {
    totalScore += sub.final_score;
    const snapshots = sub.ast_snapshots_json ?? [];

    for (const snap of snapshots) {
      const errors = (snap["errors"] as Record<string, unknown>[] | undefined) ?? [];
      for (const err of errors) {
        const errMsg = String(err["message"] ?? "Error").toLowerCase();
        const shortName = errMsg.includes("body")
          ? "Elemen di luar body"
          : errMsg.includes("nesting") || errMsg.includes("di dalam")
            ? "Salah nesting tag"
            : errMsg.includes("style")
              ? "CSS style terputus"
              : errMsg.includes("judul")
                ? "Teks judul belum diisi"
                : "Error Validasi";
        errorCounts[shortName] = (errorCounts[shortName] ?? 0) + 1;
      }
    }

    if (sub.attempt_count > 5) {
      let issue = "Banyak melakukan trial-error pada struktur HTML/CSS";
      const lastSnap = snapshots[snapshots.length - 1];
      const lastErrors =
        (lastSnap?.["errors"] as Record<string, unknown>[] | undefined) ?? [];
      if (lastErrors.length) {
        issue = String(lastErrors[0]["message"] ?? issue);
      }
      struggling.push({
        name: studentName,
        error_count: sub.attempt_count,
        issue,
      });
    }

    classData.push({
      student_name: studentName,
      attempts: sub.attempt_count,
      score: sub.final_score,
    });
  }

  const classAvg = Math.round((totalScore / rows.length) * 10) / 10;

  let errorHeatmap = Object.entries(errorCounts)
    .map(([name, count]) => ({
      name,
      percentage: Math.min(100, Math.trunc((count / rows.length) * 100)),
    }))
    .sort((a, b) => b.percentage - a.percentage);
  if (!errorHeatmap.length) {
    errorHeatmap = [{ name: "Semua kriteria terpenuhi", percentage: 0 }];
  }

  const aiInsights = await generateTeacherInsights(classData);
  const recommendations =
    (aiInsights["recommendations"] as string | undefined) ??
    "Semua berjalan lancar. Teruskan bimbingan individual bagi siswa yang membutuhkan.";

  return NextResponse.json({
    ct_class_average: classAvg,
    error_heatmap: errorHeatmap,
    struggling_students: struggling.slice(0, 3),
    recommendations,
  });
});
