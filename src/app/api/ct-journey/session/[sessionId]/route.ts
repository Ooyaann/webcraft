import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { ctJourneySessions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { handler, HttpError } from "@/lib/http";

type Ctx = { params: Promise<{ sessionId: string }> };

// GET /api/ct-journey/session/{sessionId}
export const GET = handler<Ctx>(async (req, ctx) => {
  const user = await requireUser(req);
  const { sessionId } = await ctx.params;

  const [session] = await getDb()
    .select()
    .from(ctJourneySessions)
    .where(eq(ctJourneySessions.id, sessionId))
    .limit(1);
  if (!session) throw new HttpError(404, "Sesi CT Journey tidak ditemukan.");

  // Cek kepemilikan (cegah IDOR): siswa hanya boleh membaca sesinya sendiri.
  if (user.role === "siswa" && session.siswa_id !== user.id) {
    throw new HttpError(403, "Anda tidak memiliki akses ke sesi CT Journey ini.");
  }
  return NextResponse.json(session);
});
