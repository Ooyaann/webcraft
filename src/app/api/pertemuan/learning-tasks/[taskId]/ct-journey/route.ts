import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { learningTasks } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { handler, parseBody } from "@/lib/http";
import { getOwnedLearningTask } from "@/lib/pertemuan";

type Ctx = { params: Promise<{ taskId: string }> };

const ctJourneySchema = z.object({
  decomposition_options: z.array(z.string()).default([]),
  algorithm_steps: z.array(z.string()).default([]),
});

// PUT /api/pertemuan/learning-tasks/{taskId}/ct-journey — konten CT Journey guru
export const PUT = handler<Ctx>(async (req, ctx) => {
  const user = await requireUser(req);
  const { taskId } = await ctx.params;
  const body = await parseBody(req, ctJourneySchema);
  const lt = await getOwnedLearningTask(taskId, user, "task");

  const ctJourney = {
    decomposition_options: body.decomposition_options
      .map((s) => s.trim())
      .filter(Boolean),
    algorithm_steps: body.algorithm_steps.map((s) => s.trim()).filter(Boolean),
  };

  await getDb()
    .update(learningTasks)
    .set({ ct_journey_json: ctJourney })
    .where(eq(learningTasks.id, lt.id));

  return NextResponse.json({ id: lt.id, ct_journey_json: ctJourney });
});
