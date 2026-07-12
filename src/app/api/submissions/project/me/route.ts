import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { projectSubmissions, projectTasks } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { handler } from "@/lib/http";

// GET /api/submissions/project/me — semua submission proyek milik user
export const GET = handler(async (req) => {
  const user = await requireUser(req);

  const rows = await getDb()
    .select({ sub: projectSubmissions, task: projectTasks })
    .from(projectSubmissions)
    .leftJoin(projectTasks, eq(projectSubmissions.task_id, projectTasks.id))
    .where(eq(projectSubmissions.siswa_id, user.id));

  return NextResponse.json(
    rows.map(({ sub, task }) => ({
      id: sub.id,
      task_id: sub.task_id,
      pertemuan_id: task?.pertemuan_id ?? null,
      task_title: task?.judul ?? "Proyek Kreatif",
      final_ast: sub.final_ast_json,
      ai_suggestion: sub.ai_suggestion_json,
      teacher_score: sub.teacher_score,
      teacher_comment: sub.teacher_comment,
      // Rincian per kriteria/pilar + rubrik tugas → transparansi di "Karya Saya"
      rubrik_scores: sub.rubrik_scores_json,
      rubrik: task?.rubrik_json ?? null,
      is_published_to_gallery: sub.is_published_to_gallery,
      is_remedial: sub.is_remedial,
      submitted_at: sub.submitted_at,
    })),
  );
});
