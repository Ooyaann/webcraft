import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { galleryItems, projectSubmissions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { handler, HttpError, parseBody } from "@/lib/http";

type Ctx = { params: Promise<{ submissionId: string }> };

const gradeSchema = z.object({
  teacher_score: z.number().int(),
  teacher_comment: z.string(),
  rubrik_scores: z.record(z.string(), z.number()),
  is_published_to_gallery: z.boolean(),
});

// PUT /api/submissions/project/{submissionId}/grade — nilai proyek (guru) +
// kelola publikasi galeri
export const PUT = handler<Ctx>(async (req, ctx) => {
  const user = await requireUser(req);
  if (user.role !== "guru") {
    throw new HttpError(403, "Akses ditolak. Hanya guru yang dapat menilai.");
  }
  const { submissionId } = await ctx.params;
  const body = await parseBody(req, gradeSchema);
  const db = getDb();

  const [submission] = await db
    .select({ id: projectSubmissions.id })
    .from(projectSubmissions)
    .where(eq(projectSubmissions.id, submissionId))
    .limit(1);
  if (!submission) {
    throw new HttpError(404, "Submission proyek tidak ditemukan.");
  }

  await db
    .update(projectSubmissions)
    .set({
      teacher_score: body.teacher_score,
      teacher_comment: body.teacher_comment,
      rubrik_scores_json: body.rubrik_scores,
      is_published_to_gallery: body.is_published_to_gallery,
    })
    .where(eq(projectSubmissions.id, submissionId));

  const [galleryItem] = await db
    .select({ id: galleryItems.id })
    .from(galleryItems)
    .where(eq(galleryItems.project_submission_id, submissionId))
    .limit(1);

  if (body.is_published_to_gallery) {
    if (!galleryItem) {
      await db.insert(galleryItems).values({
        id: randomUUID(),
        project_submission_id: submissionId,
        appreciation_count: 0,
      });
    }
  } else if (galleryItem) {
    await db.delete(galleryItems).where(eq(galleryItems.id, galleryItem.id));
  }

  return NextResponse.json({
    message: "Submission berhasil dinilai!",
    submission_id: submissionId,
  });
});
