import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeCtStep } from "@/lib/ai";
import { requireUser } from "@/lib/auth";
import { handler, HttpError, parseBody } from "@/lib/http";
import { enforceAiRateLimit } from "@/lib/rateLimit";

const requestSchema = z.object({
  step: z.string(),
  question: z.string(),
  student_answer: z.string(),
  challenge_context: z.record(z.string(), z.unknown()),
});

// POST /api/ai/ct-journey — evaluasi jawaban langkah CT Journey
export const POST = handler(async (req) => {
  const user = await requireUser(req);
  enforceAiRateLimit(req, user);
  const body = await parseBody(req, requestSchema);

  try {
    const result = await analyzeCtStep(
      body.step,
      body.question,
      body.student_answer,
      body.challenge_context,
    );
    return NextResponse.json({
      feedback: result.feedback ?? "Jawaban Anda telah direkam.",
      ct_score_delta: result.ct_score_delta ?? 80,
      next_hint: result.next_hint ?? "",
    });
  } catch (err) {
    console.error("Failed to analyze CT journey step", err);
    throw new HttpError(500, "Terjadi kesalahan saat memproses evaluasi AI. Silakan coba lagi.");
  }
});
