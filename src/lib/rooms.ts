import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { roomMembers, rooms } from "@/db/schema";
import type { AuthUser } from "@/lib/auth";
import { HttpError } from "@/lib/http";

// Cek akses room ala rooms.py: guru harus pemilik, siswa harus anggota.
export async function loadRoomChecked(roomId: string, user: AuthUser) {
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
  if (user.role === "siswa") {
    const membership = await db
      .select()
      .from(roomMembers)
      .where(
        and(eq(roomMembers.room_id, room.id), eq(roomMembers.siswa_id, user.id)),
      )
      .limit(1);
    if (membership.length === 0) {
      throw new HttpError(403, "Anda bukan anggota kelas ini.");
    }
  }
  return room;
}
