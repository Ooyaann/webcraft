import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { learningSubmissions, learningTasks } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { handler } from "@/lib/http";

const pad = (n: number) => String(n).padStart(2, "0");
// Format "%Y-%m-%d %H:%M" (UTC) seperti strftime di submissions.py
function formatDate(d: Date | null): string {
  if (!d) return "-";
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

// GET /api/submissions/learning/me?limit=&offset= — riwayat misi user (terbaru dulu)
export const GET = handler(async (req) => {
  const user = await requireUser(req);
  const url = new URL(req.url);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10) || 50),
  );
  const offset = Math.max(
    0,
    parseInt(url.searchParams.get("offset") ?? "0", 10) || 0,
  );

  const rows = await getDb()
    .select({ sub: learningSubmissions, task: learningTasks })
    .from(learningSubmissions)
    .leftJoin(learningTasks, eq(learningSubmissions.task_id, learningTasks.id))
    .where(eq(learningSubmissions.siswa_id, user.id))
    .orderBy(desc(learningSubmissions.submitted_at))
    .limit(limit)
    .offset(offset);

  const formatted = rows.map(({ sub, task }) => {
    const feedbackTags =
      sub.final_score >= 85
        ? ["Sangat Baik"]
        : sub.final_score >= 70
          ? ["Baik"]
          : ["Perlu Latihan"];

    const lastSnapshot = sub.ast_snapshots_json?.length
      ? sub.ast_snapshots_json[sub.ast_snapshots_json.length - 1]
      : null;

    return {
      id: sub.id,
      task_id: sub.task_id,
      pertemuan_id: task?.pertemuan_id ?? null,
      levelTitle: task?.judul ?? "Misi Belajar",
      date: formatDate(sub.submitted_at),
      accuracy: sub.accuracy_score,
      attempts: sub.attempt_count,
      ctScore: sub.final_score,
      ct_post_score: sub.ct_post_score_json,
      reflection_answers: sub.reflection_answers_json,
      ast: (lastSnapshot?.["ast"] as unknown[] | undefined) ?? [],
      feedbackTags,
      teacherComment:
        sub.ai_feedback || "Kerja bagus! Terus asah logika pemrogramanmu.",
    };
  });

  return NextResponse.json(formatted);
});
