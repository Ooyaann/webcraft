import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { ctJourneySessions, learningTasks, projectTasks } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { handler, HttpError, parseBody } from "@/lib/http";

const saveSchema = z.object({
  session_id: z.string().nullish(),
  task_id: z.string().default("easy-1"),
  step: z.string(),
  answer: z.string().max(5000),
  score: z.number().int().min(0).max(100).nullish(),
});

const STEP_MAP = {
  decomposition: { column: "decomposition_answer_json", scoreKey: "decomposition", defaultScore: 85 },
  abstraction: { column: "abstraction_answer_json", scoreKey: "abstraction", defaultScore: 88 },
  pattern: { column: "pattern_answer_json", scoreKey: "pattern_recognition", defaultScore: 80 },
  algorithm: { column: "algorithm_answer_json", scoreKey: "algorithm_design", defaultScore: 85 },
} as const;

// POST /api/ct-journey/session — simpan jawaban satu langkah CT (siswa)
export const POST = handler(async (req) => {
  const user = await requireUser(req);
  if (user.role !== "siswa") {
    throw new HttpError(403, "Akses ditolak. Hanya akun Siswa yang dapat menyimpan data CT Journey.");
  }
  const body = await parseBody(req, saveSchema);
  const db = getDb();

  if (!(body.step in STEP_MAP)) {
    throw new HttpError(400, "Langkah CT (step) tidak valid.");
  }
  const stepInfo = STEP_MAP[body.step as keyof typeof STEP_MAP];

  let session = null;
  if (body.session_id) {
    const [found] = await db
      .select()
      .from(ctJourneySessions)
      .where(eq(ctJourneySessions.id, body.session_id))
      .limit(1);
    session = found ?? null;
  }

  if (!session) {
    // Sesi baru: ambil judul tantangan dari learning/project task terkait
    let challengeTitle = "Misi Coding Web";
    const [lt] = await db
      .select({ judul: learningTasks.judul })
      .from(learningTasks)
      .where(eq(learningTasks.id, body.task_id))
      .limit(1);
    if (lt) {
      challengeTitle = lt.judul;
    } else {
      const [pt] = await db
        .select({ judul: projectTasks.judul })
        .from(projectTasks)
        .where(eq(projectTasks.id, body.task_id))
        .limit(1);
      if (pt) challengeTitle = pt.judul;
    }

    const [created] = await db
      .insert(ctJourneySessions)
      .values({
        id: randomUUID(),
        siswa_id: user.id,
        task_id: body.task_id,
        challenge_context: { title: challengeTitle },
        decomposition_answer_json: [],
        abstraction_answer_json: [],
        pattern_answer_json: [],
        algorithm_answer_json: [],
        ct_pre_score_json: {
          decomposition: 0,
          abstraction: 0,
          pattern_recognition: 0,
          algorithm_design: 0,
        },
      })
      .returning();
    session = created;
  } else if (session.is_locked) {
    throw new HttpError(400, "Sesi CT ini sudah dikunci dan tidak dapat diubah lagi.");
  }

  // Simpan jawaban langkah + skor riil dari klien (default netral bila kosong)
  // supaya DB sinkron dengan yang dilihat siswa di frontend.
  const scores = { ...(session.ct_pre_score_json ?? {}) };
  const scoreValue = body.score ?? stepInfo.defaultScore;
  scores[stepInfo.scoreKey] = Math.max(0, Math.min(100, Math.trunc(scoreValue)));

  await db
    .update(ctJourneySessions)
    .set({
      [stepInfo.column]: body.answer,
      ct_pre_score_json: scores,
      completed_at: new Date(),
      ...(body.step === "algorithm" ? { is_locked: true } : {}),
    })
    .where(eq(ctJourneySessions.id, session.id));

  return NextResponse.json(
    {
      session_id: session.id,
      step_completed: body.step,
      ct_pre_scores: scores,
    },
    { status: 201 },
  );
});
