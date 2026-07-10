import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeCtSession } from "@/lib/ai";
import { requireUser } from "@/lib/auth";
import { handler, HttpError, parseBody } from "@/lib/http";
import { enforceAiRateLimit } from "@/lib/rateLimit";

const requestSchema = z.object({
  attempt_history: z.array(z.record(z.string(), z.unknown())),
  ct_journey: z.record(z.string(), z.unknown()),
  reflection: z.record(z.string(), z.unknown()),
});

// POST /api/ai/analyze-ct — analisis sesi CT pasca-coding
export const POST = handler(async (req) => {
  const user = await requireUser(req);
  enforceAiRateLimit(req, user);
  const body = await parseBody(req, requestSchema);

  try {
    const result = await analyzeCtSession(
      body.attempt_history,
      body.ct_journey,
      body.reflection,
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("Failed to analyze CT session", err);
    throw new HttpError(500, "Terjadi kesalahan saat menganalisis sesi CT. Silakan coba lagi.");
  }
});
