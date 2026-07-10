import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { ctScores } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { handler, HttpError, parseBody } from "@/lib/http";

const createSchema = z.object({
  decomposition: z.number().int(),
  abstraction: z.number().int(),
  pattern_recognition: z.number().int(),
  algorithm_design: z.number().int(),
  pertemuan_id: z.string(),
});

// POST /api/ct-scores — simpan skor CT siswa
export const POST = handler(async (req) => {
  const user = await requireUser(req);
  if (user.role !== "siswa") {
    throw new HttpError(403, "Hanya siswa yang dapat menyimpan data nilai CT.");
  }
  const body = await parseBody(req, createSchema);

  const composite = Math.trunc(
    (body.decomposition +
      body.abstraction +
      body.pattern_recognition +
      body.algorithm_design) /
      4,
  );

  const [score] = await getDb()
    .insert(ctScores)
    .values({
      id: randomUUID(),
      siswa_id: user.id,
      pertemuan_id: body.pertemuan_id,
      decomposition: body.decomposition,
      abstraction: body.abstraction,
      pattern_recognition: body.pattern_recognition,
      algorithm_design: body.algorithm_design,
      composite_ct_score: composite,
      recorded_at: new Date(),
    })
    .returning();

  return NextResponse.json(score, { status: 201 });
});
