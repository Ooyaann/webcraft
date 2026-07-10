import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { projectSubmissions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { handler, HttpError } from "@/lib/http";

type Ctx = { params: Promise<{ taskId: string }> };

// GET /api/submissions/project/task/{taskId} — semua submission task ini (guru)
export const GET = handler<Ctx>(async (req, ctx) => {
  const user = await requireUser(req);
  if (user.role !== "guru") throw new HttpError(403, "Akses ditolak.");
  const { taskId } = await ctx.params;

  const list = await getDb()
    .select()
    .from(projectSubmissions)
    .where(eq(projectSubmissions.task_id, taskId));
  return NextResponse.json(list);
});
