import { randomInt, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { roomMembers, rooms } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { handler, HttpError, parseBody } from "@/lib/http";

// Port dari backend/app/routers/rooms.py

const CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
function generateRoomCode(length = 6): string {
  return Array.from(
    { length },
    () => CODE_CHARS[randomInt(CODE_CHARS.length)],
  ).join("");
}

const roomCreateSchema = z.object({ name: z.string().min(1).max(100) });

// POST /api/rooms — buat kelas (guru saja)
export const POST = handler(async (req) => {
  const user = await requireUser(req);
  if (user.role !== "guru") {
    throw new HttpError(403, "Hanya akun Guru yang diizinkan membuat kelas baru.");
  }
  const body = await parseBody(req, roomCreateSchema);
  const db = getDb();

  let code = generateRoomCode();
  while (
    (await db.select({ id: rooms.id }).from(rooms).where(eq(rooms.code, code)))
      .length > 0
  ) {
    code = generateRoomCode();
  }

  const [room] = await db
    .insert(rooms)
    .values({
      id: randomUUID(),
      guru_id: user.id,
      name: body.name,
      code,
      is_active: true,
    })
    .returning();
  return NextResponse.json(room);
});

// GET /api/rooms — daftar kelas milik guru / yang diikuti siswa
export const GET = handler(async (req) => {
  const user = await requireUser(req);
  const db = getDb();

  if (user.role === "guru") {
    const list = await db.select().from(rooms).where(eq(rooms.guru_id, user.id));
    return NextResponse.json(list);
  }

  const list = await db
    .select({
      id: rooms.id,
      guru_id: rooms.guru_id,
      name: rooms.name,
      code: rooms.code,
      is_active: rooms.is_active,
      announcement: rooms.announcement,
      created_at: rooms.created_at,
    })
    .from(rooms)
    .innerJoin(roomMembers, eq(rooms.id, roomMembers.room_id))
    .where(eq(roomMembers.siswa_id, user.id));
  return NextResponse.json(list);
});
