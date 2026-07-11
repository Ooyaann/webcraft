import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { refreshTokens } from "@/db/schema";
import {
  clearAuthCookies,
  hashToken,
  readCookie,
  REFRESH_COOKIE,
} from "@/lib/auth";
import { handler, parseBody } from "@/lib/http";

const logoutSchema = z.object({ refresh_token: z.string().optional() });

export const POST = handler(async (req) => {
  const body = await parseBody(req, logoutSchema);
  const rawToken = readCookie(req, REFRESH_COOKIE) ?? body.refresh_token;
  if (rawToken) {
    await getDb()
      .update(refreshTokens)
      .set({ revoked: true })
      .where(eq(refreshTokens.token_hash, hashToken(rawToken)));
  }
  const res = NextResponse.json({ message: "Logout berhasil." });
  clearAuthCookies(res);
  return res;
});
