import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { learningTasks, pertemuan, projectTasks } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { handler, HttpError } from "@/lib/http";

type Ctx = { params: Promise<{ taskId: string }> };

// GET /api/pertemuan/tasks/{taskId} — detail LearningTask ATAU ProjectTask
export const GET = handler<Ctx>(async (req, ctx) => {
  await requireUser(req);
  const { taskId } = await ctx.params;
  const db = getDb();

  const [lt] = await db
    .select()
    .from(learningTasks)
    .where(eq(learningTasks.id, taskId))
    .limit(1);
  if (lt) {
    // Ambil teks misi/tantangan asli dari pertemuan induk (CBL Engage)
    let misi: unknown = null;
    const [pert] = await db
      .select()
      .from(pertemuan)
      .where(eq(pertemuan.id, lt.pertemuan_id))
      .limit(1);
    if (pert?.cbl_engage_json) {
      misi = pert.cbl_engage_json["challenge"] ?? null;
    }
    return NextResponse.json({
      id: lt.id,
      judul: lt.judul,
      type: "learning",
      pertemuan_id: lt.pertemuan_id,
      misi,
      validator_rules_json: lt.validator_rules_json,
      max_attempts_before_ai_hint: lt.max_attempts_before_ai_hint,
      ct_journey_json: lt.ct_journey_json,
    });
  }

  const [pt] = await db
    .select()
    .from(projectTasks)
    .where(eq(projectTasks.id, taskId))
    .limit(1);
  if (pt) {
    let misi: unknown = pt.studi_kasus;
    const [pert] = await db
      .select()
      .from(pertemuan)
      .where(eq(pertemuan.id, pt.pertemuan_id))
      .limit(1);
    if (pert?.cbl_engage_json?.["challenge"]) {
      misi = pert.cbl_engage_json["challenge"];
    }
    return NextResponse.json({
      id: pt.id,
      judul: pt.judul,
      type: "project",
      pertemuan_id: pt.pertemuan_id,
      studi_kasus: pt.studi_kasus,
      misi,
      rubrik_json: pt.rubrik_json,
    });
  }

  throw new HttpError(404, "Tugas tidak ditemukan.");
});
