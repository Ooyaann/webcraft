import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { creativeProjects } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { handler } from "@/lib/http";

// GET /api/creative/me — semua draft kreasi milik siswa (terbaru dulu)
export const GET = handler(async (req) => {
  const user = await requireUser(req);
  if (user.role !== "siswa") return NextResponse.json([]);

  const list = await getDb()
    .select()
    .from(creativeProjects)
    .where(eq(creativeProjects.siswa_id, user.id))
    .orderBy(desc(creativeProjects.updated_at));
  return NextResponse.json(list);
});
