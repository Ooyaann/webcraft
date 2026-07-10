import type { AuthUser } from "@/lib/auth";
import { HttpError } from "@/lib/http";

// Port dari backend/app/rate_limit.py — limiter fixed-window in-memory.
// ponytail: berlaku per warm serverless instance, bukan global; ganti ke
// Upstash Redis / counter DB kalau butuh limit lintas-instance yang ketat.

const hits = new Map<string, number[]>();

const MAX_REQUESTS = 20;
const WINDOW_SECONDS = 60;

// 20 panggilan AI per menit per user cukup longgar untuk tutoring interaktif
// tapi memblokir abuse terskrip atas kuota Gemini.
export function enforceAiRateLimit(req: Request, user: AuthUser | null): void {
  const key = user
    ? `user:${user.id}`
    : `ip:${req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"}`;

  const now = Date.now() / 1000;
  const cutoff = now - WINDOW_SECONDS;
  const list = (hits.get(key) ?? []).filter((t) => t >= cutoff);

  if (list.length >= MAX_REQUESTS) {
    const retryAfter = Math.trunc(WINDOW_SECONDS - (now - list[0])) + 1;
    throw new HttpError(
      429,
      "Terlalu banyak permintaan ke layanan AI. Silakan tunggu sebentar lalu coba lagi.",
      { "Retry-After": String(retryAfter) },
    );
  }

  list.push(now);
  hits.set(key, list);
}
