import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { learningTasks } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { handler, parseBody } from "@/lib/http";
import { getOwnedLearningTask } from "@/lib/pertemuan";

type Ctx = { params: Promise<{ taskId: string }> };

const rulesSchema = z.object({
  rules: z.array(
    z.object({
      type: z.string().max(40),
      error_message: z.string().min(1).max(300),
      selector: z.string().max(40).nullish(),
      parent: z.string().max(40).nullish(),
      child: z.string().max(40).nullish(),
    }),
  ),
});

// PUT /api/pertemuan/learning-tasks/{taskId}/rules — ganti aturan validator (guru)
export const PUT = handler<Ctx>(async (req, ctx) => {
  const user = await requireUser(req);
  const { taskId } = await ctx.params;
  const body = await parseBody(req, rulesSchema);
  const lt = await getOwnedLearningTask(taskId, user, "task");

  // exclude_none ala Pydantic: buang field null/undefined
  const rules = body.rules.map((rule) =>
    Object.fromEntries(Object.entries(rule).filter(([, v]) => v != null)),
  );

  await getDb()
    .update(learningTasks)
    .set({ validator_rules_json: rules })
    .where(eq(learningTasks.id, lt.id));

  return NextResponse.json({ id: lt.id, validator_rules_json: rules });
});
