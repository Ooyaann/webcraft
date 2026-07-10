import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { projectSubmissions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { handler, HttpError } from "@/lib/http";

type Ctx = { params: Promise<{ taskId: string }> };

// GET /api/submissions/project/task/{taskId}/me — submission proyek milik user
export const GET = handler<Ctx>(async (req, ctx) => {
  const user = await requireUser(req);
  const { taskId } = await ctx.params;

  const [sub] = await getDb()
    .select()
    .from(projectSubmissions)
    .where(
      and(
        eq(projectSubmissions.task_id, taskId),
        eq(projectSubmissions.siswa_id, user.id),
      ),
    )
    .limit(1);
  if (!sub) throw new HttpError(404, "Submission tidak ditemukan.");
  return NextResponse.json(sub);
});
