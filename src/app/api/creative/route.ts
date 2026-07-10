import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { creativeProjects } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { handler, HttpError, parseBody } from "@/lib/http";

const createSchema = z.object({
  name: z.string(),
  ast: z.array(z.record(z.string(), z.unknown())),
});

// POST /api/creative[?project_id=] — simpan/perbarui proyek kreasi mandiri (siswa)
export const POST = handler(async (req) => {
  const user = await requireUser(req);
  if (user.role !== "siswa") {
    throw new HttpError(403, "Hanya siswa yang dapat mengkreasikan proyek mandiri.");
  }
  const body = await parseBody(req, createSchema);
  const projectId = new URL(req.url).searchParams.get("project_id");
  const db = getDb();

  if (projectId) {
    const [existing] = await db
      .select()
      .from(creativeProjects)
      .where(
        and(
          eq(creativeProjects.id, projectId),
          eq(creativeProjects.siswa_id, user.id),
        ),
      )
      .limit(1);
    if (!existing) {
      throw new HttpError(404, "Proyek kreasi tidak ditemukan atau bukan milik Anda.");
    }
    const [updated] = await db
      .update(creativeProjects)
      .set({ name: body.name, ast_json: body.ast })
      .where(eq(creativeProjects.id, projectId))
      .returning();
    return NextResponse.json(updated);
  }

  const [created] = await db
    .insert(creativeProjects)
    .values({
      id: randomUUID(),
      siswa_id: user.id,
      name: body.name,
      ast_json: body.ast,
    })
    .returning();
  return NextResponse.json(created);
});
