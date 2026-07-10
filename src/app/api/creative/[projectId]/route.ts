import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { creativeProjects } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { handler, HttpError } from "@/lib/http";

type Ctx = { params: Promise<{ projectId: string }> };

async function loadOwnedProject(projectId: string, siswaId: string) {
  const [proj] = await getDb()
    .select()
    .from(creativeProjects)
    .where(
      and(
        eq(creativeProjects.id, projectId),
        eq(creativeProjects.siswa_id, siswaId),
      ),
    )
    .limit(1);
  return proj ?? null;
}

// GET /api/creative/{projectId} — muat satu draft kreasi
export const GET = handler<Ctx>(async (req, ctx) => {
  const user = await requireUser(req);
  const { projectId } = await ctx.params;
  const proj = await loadOwnedProject(projectId, user.id);
  if (!proj) throw new HttpError(404, "Proyek tidak ditemukan.");
  return NextResponse.json(proj);
});

// DELETE /api/creative/{projectId} — hapus draft kreasi
export const DELETE = handler<Ctx>(async (req, ctx) => {
  const user = await requireUser(req);
  const { projectId } = await ctx.params;
  const proj = await loadOwnedProject(projectId, user.id);
  if (!proj) throw new HttpError(404, "Proyek tidak ditemukan.");

  await getDb()
    .delete(creativeProjects)
    .where(eq(creativeProjects.id, projectId));
  return NextResponse.json({
    message: "Proyek kreasi berhasil dihapus.",
    project_id: projectId,
  });
});
