import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import {
  pertemuan,
  projectSubmissions,
  projectTasks,
  rooms,
  users,
} from "@/db/schema";
import { suggestProjectScore } from "@/lib/ai";
import { requireUser } from "@/lib/auth";
import { handler, HttpError, parseBody } from "@/lib/http";

const submissionSchema = z.object({
  task_id: z.string(),
  final_ast: z.array(z.record(z.string(), z.unknown())),
  ct_session_id: z.string().nullish(),
});

// POST /api/submissions/project — kirim proyek (upsert) + saran skor AI
export const POST = handler(async (req) => {
  const user = await requireUser(req);
  const body = await parseBody(req, submissionSchema);
  const db = getDb();

  const [projectTask] = await db
    .select()
    .from(projectTasks)
    .where(eq(projectTasks.id, body.task_id))
    .limit(1);
  if (!projectTask) {
    throw new HttpError(404, "Tantangan proyek (project task) tidak ditemukan.");
  }

  let aiSuggestion: Record<string, unknown>;
  try {
    aiSuggestion = await suggestProjectScore(
      body.final_ast,
      projectTask.rubrik_json ?? [],
      {
        title: projectTask.judul,
        description:
          projectTask.studi_kasus || "Siswa diminta membuat halaman web mandiri.",
      },
    );
  } catch (err) {
    console.error("Gagal generate AI suggestion:", err);
    aiSuggestion = {
      suggested_scores: { "Sistem Validasi": 80 },
      analysis: "AI Suggestion gagal dimuat. Gunakan penilaian mandiri.",
    };
  }

  const [existing] = await db
    .select({ id: projectSubmissions.id })
    .from(projectSubmissions)
    .where(
      and(
        eq(projectSubmissions.task_id, body.task_id),
        eq(projectSubmissions.siswa_id, user.id),
      ),
    )
    .limit(1);

  let subId: string;
  if (existing) {
    await db
      .update(projectSubmissions)
      .set({
        final_ast_json: body.final_ast,
        ct_session_id: body.ct_session_id ?? null,
        ai_suggestion_json: aiSuggestion,
      })
      .where(eq(projectSubmissions.id, existing.id));
    subId = existing.id;
  } else {
    subId = randomUUID();
    await db.insert(projectSubmissions).values({
      id: subId,
      task_id: body.task_id,
      siswa_id: user.id,
      final_ast_json: body.final_ast,
      ct_session_id: body.ct_session_id ?? null,
      ai_suggestion_json: aiSuggestion,
      is_published_to_gallery: false,
    });
  }

  return NextResponse.json(
    {
      submission_id: subId,
      status: "submitted",
      message: "Proyek berhasil dikirim/diperbarui! Menunggu evaluasi guru.",
    },
    { status: 201 },
  );
});

// GET /api/submissions/project — semua submission proyek di kelas milik guru
export const GET = handler(async (req) => {
  const user = await requireUser(req);
  if (user.role !== "guru") throw new HttpError(403, "Akses ditolak.");
  const db = getDb();

  const rows = await db
    .select({
      sub: projectSubmissions,
      taskJudul: projectTasks.judul,
      roomId: pertemuan.room_id,
      studentName: users.name,
    })
    .from(projectSubmissions)
    .innerJoin(projectTasks, eq(projectSubmissions.task_id, projectTasks.id))
    .innerJoin(pertemuan, eq(projectTasks.pertemuan_id, pertemuan.id))
    .innerJoin(rooms, eq(pertemuan.room_id, rooms.id))
    .innerJoin(users, eq(projectSubmissions.siswa_id, users.id))
    .where(eq(rooms.guru_id, user.id));

  return NextResponse.json(
    rows.map(({ sub, taskJudul, roomId, studentName }) => ({
      id: sub.id,
      task_id: sub.task_id,
      task_title: taskJudul,
      room_id: roomId,
      siswa_id: sub.siswa_id,
      student_name: studentName,
      final_ast: sub.final_ast_json,
      ai_suggestion: sub.ai_suggestion_json,
      teacher_score: sub.teacher_score,
      teacher_comment: sub.teacher_comment,
      rubrik_scores: sub.rubrik_scores_json,
      is_published_to_gallery: sub.is_published_to_gallery,
      submitted_at: sub.submitted_at,
    })),
  );
});
