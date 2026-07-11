import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { pertemuan, roomMembers, rooms } from "@/db/schema";
import type { AuthUser } from "@/lib/auth";
import { HttpError } from "@/lib/http";

// Siswa hanya boleh menulis data (skor CT, sesi CT, apresiasi, submission)
// untuk pertemuan di kelas yang ia ikuti. Guru/admin tidak dibatasi di sini.
export async function assertMemberOfPertemuan(
  user: AuthUser,
  pertemuanId: string,
): Promise<void> {
  if (user.role !== "siswa") return;
  const [membership] = await getDb()
    .select({ siswa_id: roomMembers.siswa_id })
    .from(pertemuan)
    .innerJoin(
      roomMembers,
      and(
        eq(roomMembers.room_id, pertemuan.room_id),
        eq(roomMembers.siswa_id, user.id),
      ),
    )
    .where(eq(pertemuan.id, pertemuanId))
    .limit(1);
  if (!membership) {
    throw new HttpError(403, "Anda bukan anggota kelas untuk aktivitas ini.");
  }
}

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
