import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { roomMembers, rooms } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { handler, HttpError, parseBody } from "@/lib/http";

const roomJoinSchema = z.object({ code: z.string().min(6).max(6) });

// POST /api/rooms/join — siswa bergabung ke kelas via kode 6 digit
export const POST = handler(async (req) => {
  const user = await requireUser(req);
  const body = await parseBody(req, roomJoinSchema);
  const db = getDb();

  const [room] = await db
    .select()
    .from(rooms)
    .where(eq(rooms.code, body.code))
    .limit(1);
  if (!room) {
    throw new HttpError(404, "Kelas dengan kode tersebut tidak ditemukan.");
  }
  if (!room.is_active) {
    throw new HttpError(400, "Kelas tersebut sudah tidak aktif.");
  }

  const membership = await db
    .select()
    .from(roomMembers)
    .where(
      and(eq(roomMembers.room_id, room.id), eq(roomMembers.siswa_id, user.id)),
    )
    .limit(1);
  if (membership.length === 0) {
    await db
      .insert(roomMembers)
      .values({ room_id: room.id, siswa_id: user.id });
  }

  return NextResponse.json(room);
});
