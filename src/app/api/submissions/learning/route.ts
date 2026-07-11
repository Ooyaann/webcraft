import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import {
  learningSubmissions,
  learningTasks,
  pertemuan,
  roomMembers,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { handler, HttpError, parseBody } from "@/lib/http";
import {
  accuracyFromErrors,
  efficiencyFromAttempts,
  KKM,
  learningFinalScore,
} from "@/lib/scoring";
import { validateAst, type AstNode } from "@/lib/validator";

const submissionSchema = z.object({
  task_id: z.string(),
  // Cap eksplisit: cegah payload snapshot raksasa membengkakkan DB
  ast_snapshots: z.array(z.record(z.string(), z.unknown())).max(100),
  attempt_count: z.number().int().min(0),
  ct_session_id: z.string().nullish(),
  reflection_answers: z.record(z.string(), z.unknown()).nullish(),
  ai_feedback: z.string().nullish(),
  ct_post_score: z.record(z.string(), z.number().min(0).max(100)).nullish(),
});

// POST /api/submissions/learning — kirim hasil misi belajar (upsert per siswa+task)
export const POST = handler(async (req) => {
  const user = await requireUser(req);
  const body = await parseBody(req, submissionSchema);
  const db = getDb();

  const [task] = await db
    .select()
    .from(learningTasks)
    .where(eq(learningTasks.id, body.task_id))
    .limit(1);
  if (!task) {
    throw new HttpError(404, "Tugas belajar (learning task) tidak ditemukan.");
  }

  // Siswa hanya boleh submit ke task milik kelas yang ia ikuti.
  if (user.role === "siswa") {
    const [membership] = await db
      .select({ siswa_id: roomMembers.siswa_id })
      .from(pertemuan)
      .innerJoin(
        roomMembers,
        and(
          eq(roomMembers.room_id, pertemuan.room_id),
          eq(roomMembers.siswa_id, user.id),
        ),
      )
      .where(eq(pertemuan.id, task.pertemuan_id))
      .limit(1);
    if (!membership) {
      throw new HttpError(403, "Anda bukan anggota kelas untuk tugas ini.");
    }
  }

  // Akurasi dihitung ulang di SERVER dari AST final terhadap aturan task —
  // daftar error kiriman klien tidak dipercaya (mencegah skor palsu).
  // ponytail: attempt_count/efficiency masih klaim klien; batas kejujurannya
  // adalah minimal sebanyak snapshot yang dikirim.
  const attemptCount = Math.max(body.attempt_count, body.ast_snapshots.length);
  const efficiency = efficiencyFromAttempts(attemptCount);
  const lastSnapshot = body.ast_snapshots[body.ast_snapshots.length - 1];
  const finalAst = (lastSnapshot?.["ast"] as AstNode[] | undefined) ?? [];
  const serverErrors = validateAst(finalAst, task.validator_rules_json ?? []);
  const accuracy = accuracyFromErrors(serverErrors.length);
  let finalScore = learningFinalScore(accuracy, efficiency);

  const [existing] = await db
    .select({ id: learningSubmissions.id, final_score: learningSubmissions.final_score })
    .from(learningSubmissions)
    .where(
      and(
        eq(learningSubmissions.task_id, body.task_id),
        eq(learningSubmissions.siswa_id, user.id),
      ),
    )
    .limit(1);

  // Aturan remidi: misi yang sudah TUNTAS (≥ KKM) tidak bisa dikirim ulang;
  // pengiriman ulang misi belum tuntas = remidi, nilainya dibatasi maks KKM.
  const isRemedial = !!existing && existing.final_score < KKM;
  if (existing && existing.final_score >= KKM) {
    throw new HttpError(
      400,
      `Misi ini sudah tuntas (nilai ${existing.final_score} ≥ KKM ${KKM}) dan tidak dapat dikirim ulang.`,
    );
  }
  if (isRemedial) {
    finalScore = Math.min(finalScore, KKM);
  }

  // Simpan CT post-assessment hanya bila dikirim klien; jangan mengarang skor
  // supaya analitik guru tidak pernah menampilkan hasil CT fiktif.
  const postScore =
    body.ct_post_score && Object.keys(body.ct_post_score).length
      ? body.ct_post_score
      : null;

  const values = {
    ast_snapshots_json: body.ast_snapshots,
    attempt_count: attemptCount,
    final_score: finalScore,
    accuracy_score: accuracy,
    efficiency_score: efficiency,
    ct_session_id: body.ct_session_id ?? null,
    reflection_answers_json: body.reflection_answers ?? null,
    ct_post_score_json: postScore,
    ai_feedback:
      body.ai_feedback || "Kerja bagus! Terus asah logika pemrogramanmu.",
    is_remedial: isRemedial,
  };

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
      is_remedial: isRemedial,
      kkm: KKM,
      tuntas: finalScore >= KKM,
    },
    { status: 201 },
  );
});
