import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { rooms } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { handler, HttpError, parseBody } from "@/lib/http";
import { loadRoomChecked } from "@/lib/rooms";

type Ctx = { params: Promise<{ roomId: string }> };

// GET /api/rooms/{roomId}
export const GET = handler<Ctx>(async (req, ctx) => {
  const user = await requireUser(req);
  const { roomId } = await ctx.params;
  const room = await loadRoomChecked(roomId, user);
  return NextResponse.json(room);
});

const roomUpdateSchema = z.object({
  name: z.string().max(100).nullish(),
  is_active: z.boolean().nullish(),
  announcement: z.string().max(2000).nullish(),
});

// PUT /api/rooms/{roomId} — hanya guru pembuat
export const PUT = handler<Ctx>(async (req, ctx) => {
  const user = await requireUser(req);
  const { roomId } = await ctx.params;
  const body = await parseBody(req, roomUpdateSchema);
  const db = getDb();

  const [room] = await db
    .select()
    .from(rooms)
    .where(eq(rooms.id, roomId))
    .limit(1);
  if (!room) throw new HttpError(404, "Kelas tidak ditemukan.");
  if (room.guru_id !== user.id) {
    throw new HttpError(403, "Hanya guru pembuat kelas yang dapat mengedit kelas ini.");
  }

  const changes = {
    ...(body.name != null ? { name: body.name } : {}),
    ...(body.is_active != null ? { is_active: body.is_active } : {}),
    ...(body.announcement != null ? { announcement: body.announcement } : {}),
  };
  if (Object.keys(changes).length === 0) return NextResponse.json(room);

  const [updated] = await db
    .update(rooms)
    .set(changes)
    .where(eq(rooms.id, roomId))
    .returning();
  return NextResponse.json(updated);
});
