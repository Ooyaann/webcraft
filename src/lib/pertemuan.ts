import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { learningTasks, pertemuan, rooms } from "@/db/schema";
import type { AuthUser } from "@/lib/auth";
import { HttpError } from "@/lib/http";

// Port _get_owned_learning_task dari pertemuan.py: muat LearningTask via id
// sendiri ('task') atau id pertemuan ('pertemuan'), pastikan guru pemilik kelas.
export async function getOwnedLearningTask(
  taskOrPertemuanId: string,
  user: AuthUser,
  by: "task" | "pertemuan",
) {
  if (user.role !== "guru") {
    throw new HttpError(403, "Hanya guru yang dapat mengelola aturan validasi.");
  }
  const db = getDb();
  const column = by === "task" ? learningTasks.id : learningTasks.pertemuan_id;
  const rows = await db
    .select({ task: learningTasks, room: rooms })
    .from(learningTasks)
    .innerJoin(pertemuan, eq(learningTasks.pertemuan_id, pertemuan.id))
    .innerJoin(rooms, eq(pertemuan.room_id, rooms.id))
    .where(eq(column, taskOrPertemuanId))
    .limit(1);

  if (rows.length === 0) {
    throw new HttpError(404, "Tugas latihan tidak ditemukan.");
  }
  if (rows[0].room.guru_id !== user.id) {
    throw new HttpError(403, "Hanya guru pemilik kelas yang dapat mengelola aturan ini.");
  }
  return rows[0].task;
}
