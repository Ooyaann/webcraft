import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handler } from "@/lib/http";
import { getOwnedLearningTask } from "@/lib/pertemuan";

type Ctx = { params: Promise<{ pertemuanId: string }> };

// GET /api/pertemuan/{pertemuanId}/learning-task — task + aturan validator (guru)
export const GET = handler<Ctx>(async (req, ctx) => {
  const user = await requireUser(req);
  const { pertemuanId } = await ctx.params;
  const lt = await getOwnedLearningTask(pertemuanId, user, "pertemuan");
  return NextResponse.json({
    id: lt.id,
    judul: lt.judul,
    validator_rules_json: lt.validator_rules_json ?? [],
    max_attempts_before_ai_hint: lt.max_attempts_before_ai_hint,
    ct_journey_json:
      lt.ct_journey_json ?? { decomposition_options: [], algorithm_steps: [] },
  });
});
