import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { learningSubmissions, learningTasks } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { handler, HttpError, parseBody } from "@/lib/http";

const submissionSchema = z.object({
  task_id: z.string(),
  ast_snapshots: z.array(z.record(z.string(), z.unknown())),
  attempt_count: z.number().int(),
  ct_session_id: z.string().nullish(),
  reflection_answers: z.record(z.string(), z.unknown()).nullish(),
  ai_feedback: z.string().nullish(),
  ct_post_score: z.record(z.string(), z.number()).nullish(),
});

// Skor efisiensi proses berdasarkan jumlah percobaan (port submissions.py)
function calculateEfficiencyScore(attempts: number): number {
  if (attempts <= 1) return 100;
  if (attempts === 2) return 90;
  if (attempts === 3) return 80;
  if (attempts === 4) return 70;
  return 60;
}

// POST /api/submissions/learning — kirim hasil misi belajar (upsert per siswa+task)
export const POST = handler(async (req) => {
  const user = await requireUser(req);
  const body = await parseBody(req, submissionSchema);
  const db = getDb();

  const [task] = await db
    .select({ id: learningTasks.id })
    .from(learningTasks)
    .where(eq(learningTasks.id, body.task_id))
    .limit(1);
  if (!task) {
    throw new HttpError(404, "Tugas belajar (learning task) tidak ditemukan.");
  }

  const efficiency = calculateEfficiencyScore(body.attempt_count);
  const lastSnapshot = body.ast_snapshots[body.ast_snapshots.length - 1];
  const finalErrors = (lastSnapshot?.["errors"] as unknown[] | undefined) ?? [];
  const accuracy =
    finalErrors.length === 0 ? 100 : Math.max(0, 100 - finalErrors.length * 15);
  const finalScore = Math.trunc((accuracy + efficiency) / 2);

  // Simpan CT post-assessment hanya bila dikirim klien; jangan mengarang skor
  // supaya analitik guru tidak pernah menampilkan hasil CT fiktif.
  const postScore =
    body.ct_post_score && Object.keys(body.ct_post_score).length
      ? body.ct_post_score
      : null;

  const values = {
    ast_snapshots_json: body.ast_snapshots,
    attempt_count: body.attempt_count,
    final_score: finalScore,
    accuracy_score: accuracy,
    efficiency_score: efficiency,
    ct_session_id: body.ct_session_id ?? null,
    reflection_answers_json: body.reflection_answers ?? null,
    ct_post_score_json: postScore,
    ai_feedback:
      body.ai_feedback || "Kerja bagus! Terus asah logika pemrogramanmu.",
  };

  const [existing] = await db
    .select({ id: learningSubmissions.id })
    .from(learningSubmissions)
    .where(
      and(
        eq(learningSubmissions.task_id, body.task_id),
        eq(learningSubmissions.siswa_id, user.id),
      ),
    )
    .limit(1);

  let subId: string;
  if (existing) {
    await db
      .update(learningSubmissions)
      .set(values)
      .where(eq(learningSubmissions.id, existing.id));
    subId = existing.id;
  } else {
    subId = randomUUID();
    await db.insert(learningSubmissions).values({
      id: subId,
      task_id: body.task_id,
      siswa_id: user.id,
      ...values,
    });
  }

  return NextResponse.json(
    {
      submission_id: subId,
      final_score: finalScore,
      accuracy,
      efficiency,
    },
    { status: 201 },
  );
});
