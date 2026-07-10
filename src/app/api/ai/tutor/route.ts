import { NextResponse } from "next/server";
import { z } from "zod";
import { getSocraticHint } from "@/lib/ai";
import { getCurrentUserOptional } from "@/lib/auth";
import { handler, HttpError, parseBody } from "@/lib/http";
import { enforceAiRateLimit } from "@/lib/rateLimit";

const requestSchema = z.object({
  current_ast: z.array(z.record(z.string(), z.unknown())),
  target_rules: z.array(z.record(z.string(), z.unknown())),
  attempt_history: z.array(z.record(z.string(), z.unknown())),
  student_message: z.string().nullish(),
  lesson_context: z.string(),
  conversation_history: z
    .array(z.record(z.string(), z.string()))
    .nullish(),
});

// POST /api/ai/tutor — petunjuk Socratic di Workspace (auth opsional)
export const POST = handler(async (req) => {
  const user = await getCurrentUserOptional(req);
  enforceAiRateLimit(req, user);
  const body = await parseBody(req, requestSchema);

  try {
    const hint = await getSocraticHint(
      body.current_ast,
      body.target_rules,
      body.attempt_history,
      body.student_message ?? "",
      body.lesson_context,
      body.conversation_history ?? null,
    );
    return NextResponse.json({ hint });
  } catch (err) {
    console.error("Failed to get socratic tutor hint", err);
    throw new HttpError(500, "Terjadi kesalahan pada modul AI Tutor. Silakan coba lagi.");
  }
});
