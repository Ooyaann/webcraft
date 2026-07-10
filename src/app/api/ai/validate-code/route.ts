import { NextResponse } from "next/server";
import { z } from "zod";
import { validateStudentCode } from "@/lib/ai";
import { requireUser } from "@/lib/auth";
import { handler, HttpError, parseBody } from "@/lib/http";
import { enforceAiRateLimit } from "@/lib/rateLimit";

const requestSchema = z.object({
  current_html: z.string(),
  target_rules: z.array(z.record(z.string(), z.unknown())),
  lesson_title: z.string(),
});

// POST /api/ai/validate-code — validasi kode siswa (AI, fallback offline)
export const POST = handler(async (req) => {
  const user = await requireUser(req);
  enforceAiRateLimit(req, user);
  const body = await parseBody(req, requestSchema);

  try {
    const result = await validateStudentCode(
      body.current_html,
      body.target_rules,
      body.lesson_title,
    );
    return NextResponse.json({
      is_valid: result.is_valid ?? false,
      feedback: result.feedback ?? "",
    });
  } catch (err) {
    console.error("Failed to validate student code", err);
    throw new HttpError(500, "Terjadi kesalahan saat melakukan validasi kode AI. Silakan coba lagi.");
  }
});
