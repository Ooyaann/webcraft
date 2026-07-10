import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { roomMembers, rooms, users } from "@/db/schema";
import { requireUser, toUserResponse } from "@/lib/auth";
import { handler, HttpError } from "@/lib/http";

type Ctx = { params: Promise<{ roomId: string }> };

// GET /api/rooms/{roomId}/members — daftar siswa anggota kelas
export const GET = handler<Ctx>(async (req, ctx) => {
  const user = await requireUser(req);
  const { roomId } = await ctx.params;
  const db = getDb();

  const [room] = await db
    .select()
    .from(rooms)
    .where(eq(rooms.id, roomId))
    .limit(1);
  if (!room) throw new HttpError(404, "Kelas tidak ditemukan.");
  if (user.role === "guru" && room.guru_id !== user.id) {
    throw new HttpError(403, "Anda bukan pengajar kelas ini.");
  }

  const members = await db
    .select()
    .from(users)
    .innerJoin(roomMembers, eq(users.id, roomMembers.siswa_id))
    .where(eq(roomMembers.room_id, roomId));

  return NextResponse.json(members.map((m) => toUserResponse(m.users)));
});
