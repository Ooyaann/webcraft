import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { learningSubmissions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { handler } from "@/lib/http";

type Ctx = { params: Promise<{ taskId: string }> };

// GET /api/submissions/learning/task/{taskId} — submission milik user ini
export const GET = handler<Ctx>(async (req, ctx) => {
  const user = await requireUser(req);
  const { taskId } = await ctx.params;

  const list = await getDb()
    .select()
    .from(learningSubmissions)
    .where(
      and(
        eq(learningSubmissions.task_id, taskId),
        eq(learningSubmissions.siswa_id, user.id),
      ),
    );
  return NextResponse.json(list);
});
