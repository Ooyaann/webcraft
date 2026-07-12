import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { pertemuan, rooms, projectTasks } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { handler, HttpError, parseBody } from "@/lib/http";

type Ctx = { params: Promise<{ pertemuanId: string }> };

async function loadOwnedPertemuan(pertemuanId: string) {
  const db = getDb();
  const rows = await db
    .select({ pert: pertemuan, room: rooms })
    .from(pertemuan)
    .innerJoin(rooms, eq(pertemuan.room_id, rooms.id))
    .where(eq(pertemuan.id, pertemuanId))
    .limit(1);
  if (rows.length === 0) {
    throw new HttpError(404, "Pertemuan tidak ditemukan.");
  }
  return rows[0];
}

const pertemuanUpdateSchema = z.object({
  judul: z.string().min(1).max(200).nullish(),
  urutan: z.number().int().nullish(),
  is_published: z.boolean().nullish(),
  cbl_engage_json: z.record(z.string(), z.unknown()).nullish(),
  guiding_questions_json: z.array(z.string()).nullish(),
  reflection_questions_json: z.array(z.string()).nullish(),
  materi_list_json: z.array(z.record(z.string(), z.unknown())).nullish(),
  rubrik_weights_json: z.array(z.record(z.string(), z.unknown())).nullish(),
});

// PUT /api/pertemuan/{pertemuanId} — guru pemilik saja
export const PUT = handler<Ctx>(async (req, ctx) => {
  const user = await requireUser(req);
  const { pertemuanId } = await ctx.params;
  const body = await parseBody(req, pertemuanUpdateSchema);

  const { pert, room } = await loadOwnedPertemuan(pertemuanId);
  if (room.guru_id !== user.id) {
    throw new HttpError(403, "Hanya guru pembuat kelas yang dapat mengedit pertemuan.");
  }

  const changes = {
    ...(body.judul != null ? { judul: body.judul } : {}),
    ...(body.urutan != null ? { urutan: body.urutan } : {}),
    ...(body.is_published != null ? { is_published: body.is_published } : {}),
    ...(body.cbl_engage_json != null ? { cbl_engage_json: body.cbl_engage_json } : {}),
    ...(body.guiding_questions_json != null
      ? { guiding_questions_json: body.guiding_questions_json }
      : {}),
    ...(body.reflection_questions_json != null
      ? { reflection_questions_json: body.reflection_questions_json }
      : {}),
    ...(body.materi_list_json != null
      ? { materi_list_json: body.materi_list_json }
      : {}),
  };

  const db = getDb();
  if (body.rubrik_weights_json != null) {
    await db
      .update(projectTasks)
      .set({ rubrik_json: body.rubrik_weights_json })
      .where(eq(projectTasks.pertemuan_id, pertemuanId));
  }

  if (Object.keys(changes).length === 0) return NextResponse.json(pert);

  const [updated] = await db
    .update(pertemuan)
    .set(changes)
    .where(eq(pertemuan.id, pertemuanId))
    .returning();
  return NextResponse.json(updated);
});

// DELETE /api/pertemuan/{pertemuanId} — guru pemilik saja (cascade ke tasks)
export const DELETE = handler<Ctx>(async (req, ctx) => {
  const user = await requireUser(req);
  const { pertemuanId } = await ctx.params;

  const { room } = await loadOwnedPertemuan(pertemuanId);
  if (room.guru_id !== user.id) {
    throw new HttpError(403, "Hanya guru pembuat kelas yang dapat menghapus pertemuan.");
  }

  await getDb().delete(pertemuan).where(eq(pertemuan.id, pertemuanId));
  return NextResponse.json({
    message: "Pertemuan berhasil dihapus.",
    id: pertemuanId,
  });
});
