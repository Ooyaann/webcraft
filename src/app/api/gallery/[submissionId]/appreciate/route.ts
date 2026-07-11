import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  appreciationLogs,
  galleryItems,
  projectSubmissions,
  projectTasks,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { handler, HttpError } from "@/lib/http";
import { assertMemberOfPertemuan } from "@/lib/rooms";

type Ctx = { params: Promise<{ submissionId: string }> };

// POST /api/gallery/{submissionId}/appreciate — beri apresiasi (sekali per user)
export const POST = handler<Ctx>(async (req, ctx) => {
  const user = await requireUser(req);
  const { submissionId } = await ctx.params;
  const db = getDb();

  const [sub] = await db
    .select()
    .from(projectSubmissions)
    .where(eq(projectSubmissions.id, submissionId))
    .limit(1);
  if (!sub) throw new HttpError(404, "Karya proyek tidak ditemukan.");

  // Apresiasi hanya dari anggota kelas karya tersebut (siswa lintas kelas ditolak)
  const [task] = await db
    .select({ pertemuan_id: projectTasks.pertemuan_id })
    .from(projectTasks)
    .where(eq(projectTasks.id, sub.task_id))
    .limit(1);
  if (task) await assertMemberOfPertemuan(user, task.pertemuan_id);

  // Transaksi: log apresiasi + counter + status publikasi harus konsisten;
  // HttpError di dalam transaksi otomatis me-rollback semuanya.
  const newCount = await db.transaction(async (tx) => {
    let [item] = await tx
      .select()
      .from(galleryItems)
      .where(eq(galleryItems.project_submission_id, submissionId))
      .limit(1);
    if (!item) {
      [item] = await tx
        .insert(galleryItems)
        .values({
          id: randomUUID(),
          project_submission_id: submissionId,
          appreciation_count: 0,
        })
        .returning();
    }

    const [existingLog] = await tx
      .select({ id: appreciationLogs.id })
      .from(appreciationLogs)
      .where(
        and(
          eq(appreciationLogs.siswa_id, user.id),
          eq(appreciationLogs.gallery_item_id, item.id),
        ),
      )
      .limit(1);
    if (existingLog) {
      throw new HttpError(400, "Kamu sudah memberikan apresiasi untuk karya ini!");
    }

    await tx.insert(appreciationLogs).values({
      id: randomUUID(),
      siswa_id: user.id,
      gallery_item_id: item.id,
    });
    const count = item.appreciation_count + 1;
    await tx
      .update(galleryItems)
      .set({ appreciation_count: count })
      .where(eq(galleryItems.id, item.id));
    await tx
      .update(projectSubmissions)
      .set({ is_published_to_gallery: true })
      .where(eq(projectSubmissions.id, submissionId));
    return count;
  });

  return NextResponse.json({
    submission_id: submissionId,
    appreciations: newCount,
  });
});
