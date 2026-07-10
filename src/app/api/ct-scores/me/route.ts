import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { ctScores } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { handler } from "@/lib/http";

// GET /api/ct-scores/me — semua skor CT user (urut lama → baru)
export const GET = handler(async (req) => {
  const user = await requireUser(req);
  const list = await getDb()
    .select()
    .from(ctScores)
    .where(eq(ctScores.siswa_id, user.id))
    .orderBy(asc(ctScores.recorded_at));
  return NextResponse.json(list);
});
