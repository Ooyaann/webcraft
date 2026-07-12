import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handler, HttpError } from "@/lib/http";
import { getOwnedLearningTask } from "@/lib/pertemuan";
import { getDb } from "@/db";
import { pertemuan, rooms } from "@/db/schema";
import { eq, and } from "drizzle-orm";

type Ctx = { params: Promise<{ pertemuanId: string }> };

// GET /api/pertemuan/{pertemuanId}/learning-task — task + aturan validator (guru)
export const GET = handler<Ctx>(async (req, ctx) => {
  const user = await requireUser(req);
  const { pertemuanId } = await ctx.params;
  
  try {
    const lt = await getOwnedLearningTask(pertemuanId, user, "pertemuan");
    return NextResponse.json({
      id: lt.id,
      judul: lt.judul,
      validator_rules_json: lt.validator_rules_json ?? [],
      max_attempts_before_ai_hint: lt.max_attempts_before_ai_hint,
      ct_journey_json:
        lt.ct_journey_json ?? { decomposition_options: [], algorithm_steps: [] },
    });
  } catch (err) {
    if (err instanceof HttpError && err.status === 404) {
      const db = getDb();
      // Periksa apakah pertemuan ini ada dan dimiliki oleh guru
      const rows = await db
        .select({ room: rooms })
        .from(pertemuan)
        .innerJoin(rooms, eq(pertemuan.room_id, rooms.id))
        .where(eq(pertemuan.id, pertemuanId))
        .limit(1);

      if (rows.length > 0 && rows[0].room.guru_id === user.id) {
        // Kembalikan objek virtual id: null untuk menandakan tidak ada learning task (tipe proyek)
        return NextResponse.json({
          id: null,
          judul: "Proyek Kreatif (Tanpa Misi Belajar)",
          validator_rules_json: [],
          max_attempts_before_ai_hint: 4,
          ct_journey_json: { decomposition_options: [], algorithm_steps: [] },
        });
      }
    }
    throw err;
  }
});

