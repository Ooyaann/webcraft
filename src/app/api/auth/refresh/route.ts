import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { refreshTokens, users } from "@/db/schema";
import {
  createAccessToken,
  createRefreshToken,
  exposeTokensInBody,
  hashToken,
  readCookie,
  REFRESH_COOKIE,
  setAuthCookies,
} from "@/lib/auth";
import { handler, HttpError, parseBody } from "@/lib/http";

const refreshSchema = z.object({ refresh_token: z.string().optional() });

const invalid = () =>
  new HttpError(401, "Refresh token tidak sah atau kedaluwarsa.");

export const POST = handler(async (req) => {
  // Cookie (browser) diutamakan; body sbg fallback (test / Bearer client).
  const body = await parseBody(req, refreshSchema);
  const rawToken = readCookie(req, REFRESH_COOKIE) ?? body.refresh_token;
  if (!rawToken) throw invalid();
  const db = getDb();

  const [stored] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.token_hash, hashToken(rawToken)))
    .limit(1);
  if (!stored || stored.revoked || stored.expires_at < new Date()) {
    throw invalid();
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, stored.user_id))
    .limit(1);
  if (!user) throw invalid();

  // Rotasi: cabut token yang dipakai, terbitkan pasangan baru.
  await db
    .update(refreshTokens)
    .set({ revoked: true })
    .where(eq(refreshTokens.id, stored.id));

  const accessToken = await createAccessToken(user);
  const refreshToken = await createRefreshToken(user.id);
  const res = NextResponse.json({
    token_type: "bearer",
    ...(exposeTokensInBody
      ? { access_token: accessToken, refresh_token: refreshToken }
      : {}),
  });
  setAuthCookies(res, accessToken, refreshToken);
  return res;
});
