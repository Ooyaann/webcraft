import { NextResponse } from "next/server";
import { z } from "zod";
import { suggestProjectScore } from "@/lib/ai";
import { requireUser } from "@/lib/auth";
import { handler, HttpError, parseBody } from "@/lib/http";
import { enforceAiRateLimit } from "@/lib/rateLimit";

const requestSchema = z.object({
  ast: z.array(z.record(z.string(), z.unknown())),
  rubrik: z.array(z.record(z.string(), z.unknown())),
  challenge_context: z.record(z.string(), z.unknown()),
});

// POST /api/ai/suggest-score — saran skor rubrik proyek untuk guru
export const POST = handler(async (req) => {
  const user = await requireUser(req);
  enforceAiRateLimit(req, user);
  const body = await parseBody(req, requestSchema);

  try {
    const result = await suggestProjectScore(
      body.ast,
      body.rubrik,
      body.challenge_context,
    );
    return NextResponse.json({
      suggested_scores: result["suggested_scores"] ?? {},
      analysis: result["analysis"] ?? "",
      flags: result["flags"] ?? [],
    });
  } catch (err) {
    console.error("Failed to suggest project score", err);
    throw new HttpError(500, "Terjadi kesalahan saat menghitung saran penilaian proyek. Silakan coba lagi.");
  }
});
