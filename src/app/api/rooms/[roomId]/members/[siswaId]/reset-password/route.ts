import { randomInt } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { refreshTokens, roomMembers, rooms, users } from "@/db/schema";
import { hashPassword, requireUser } from "@/lib/auth";
import { handler, HttpError } from "@/lib/http";

type Ctx = { params: Promise<{ roomId: string; siswaId: string }> };

// Password baru yang mudah dibacakan guru ke siswa: 8 huruf/angka tanpa
// karakter ambigu (0/O, 1/l/I).
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const generatePassword = () =>
  Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

// POST /api/rooms/{roomId}/members/{siswaId}/reset-password — jalur "lupa
// password" tanpa email: guru pemilik kelas me-reset password siswanya.
export const POST = handler<Ctx>(async (req, ctx) => {
  const user = await requireUser(req);
  const { roomId, siswaId } = await ctx.params;
  const db = getDb();

  const [room] = await db
    .select()
    .from(rooms)
    .where(eq(rooms.id, roomId))
    .limit(1);
  if (!room) throw new HttpError(404, "Kelas tidak ditemukan.");
  if (user.role !== "guru" || room.guru_id !== user.id) {
    throw new HttpError(403, "Hanya guru pemilik kelas yang dapat me-reset password.");
  }

  // Target harus siswa DAN anggota kelas ini
  const [target] = await db
    .select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .innerJoin(
      roomMembers,
      and(eq(roomMembers.siswa_id, users.id), eq(roomMembers.room_id, roomId)),
    )
    .where(eq(users.id, siswaId))
    .limit(1);
  if (!target || target.role !== "siswa") {
    throw new HttpError(404, "Siswa tidak ditemukan di kelas ini.");
  }

  const newPassword = generatePassword();
  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ password_hash: await hashPassword(newPassword) })
      .where(eq(users.id, target.id));
    // Paksa logout semua perangkat lama siswa tersebut
    await tx.delete(refreshTokens).where(eq(refreshTokens.user_id, target.id));
  });

  // Password baru hanya dikembalikan SEKALI di respons ini (tidak disimpan
  // dalam bentuk apa pun selain hash).
  return NextResponse.json({ name: target.name, new_password: newPassword });
});
