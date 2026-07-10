import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { learningTasks, projectTasks } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { handler } from "@/lib/http";

type Ctx = { params: Promise<{ pertemuanId: string }> };

// GET /api/pertemuan/{pertemuanId}/tasks — semua learning & project task
export const GET = handler<Ctx>(async (req, ctx) => {
  await requireUser(req);
  const { pertemuanId } = await ctx.params;
  const db = getDb();

  const [learning, project] = await Promise.all([
    db
      .select()
      .from(learningTasks)
      .where(eq(learningTasks.pertemuan_id, pertemuanId)),
    db
      .select()
      .from(projectTasks)
      .where(eq(projectTasks.pertemuan_id, pertemuanId)),
  ]);

  return NextResponse.json({
    learning_tasks: learning,
    project_tasks: project,
  });
});
