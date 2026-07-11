import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import {
  createAccessToken,
  createRefreshToken,
  exposeTokensInBody,
  hashPassword,
  setAuthCookies,
  toUserResponse,
} from "@/lib/auth";
import { handler, HttpError, parseBody } from "@/lib/http";
import { enforceAuthRateLimit } from "@/lib/rateLimit";

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.email(),
  password: z.string().min(8).max(128),
  role: z.string().default("siswa"),
  nisn_nip: z.string().max(20).nullish(),
});

export const POST = handler(async (req) => {
  enforceAuthRateLimit(req);
  const body = await parseBody(req, registerSchema);
  const db = getDb();

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, body.email))
    .limit(1);
  if (existing.length > 0) {
    throw new HttpError(400, "Alamat email sudah terdaftar di sistem WebCraft.");
  }

  if (body.role === "siswa") {
    if (!body.nisn_nip || !/^\d{10}$/.test(body.nisn_nip)) {
      throw new HttpError(400, "NISN untuk siswa harus tepat 10 digit angka.");
    }
  } else if (body.role === "guru") {
    if (!body.nisn_nip || !/^\d{18}$/.test(body.nisn_nip)) {
      throw new HttpError(400, "NIP untuk guru harus tepat 18 digit angka.");
    }
  }

  const [user] = await db
    .insert(users)
    .values({
      id: randomUUID(),
      name: body.name,
      email: body.email,
      password_hash: await hashPassword(body.password),
      role: body.role,
      nisn_nip: body.nisn_nip ?? null,
    })
    .returning();

  const accessToken = await createAccessToken(user);
  const refreshToken = await createRefreshToken(user.id);
  const res = NextResponse.json({
    token_type: "bearer",
    user: toUserResponse(user),
    ...(exposeTokensInBody
      ? { access_token: accessToken, refresh_token: refreshToken }
      : {}),
  });
  setAuthCookies(res, accessToken, refreshToken);
  return res;
});
