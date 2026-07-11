import { createHash, randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import type { NextResponse } from "next/server";
import { getDb } from "@/db";
import { refreshTokens, users } from "@/db/schema";
import { HttpError } from "@/lib/http";

// Port dari backend/app/routers/auth.py (helper + dependency).

const ACCESS_MINUTES = () =>
  parseInt(process.env.ACCESS_TOKEN_EXPIRE_MINUTES ?? "30", 10);
export const REFRESH_DAYS = () =>
  parseInt(process.env.REFRESH_TOKEN_EXPIRE_DAYS ?? "7", 10);

function jwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is not set!");
  return new TextEncoder().encode(secret);
}

export type AuthUser = typeof users.$inferSelect;

// ---------- Password ----------
// ponytail: cost 10 (bcryptjs murni JS di serverless); naikkan bila ada budget latensi.
export const hashPassword = (password: string) => bcrypt.hash(password, 10);
export const verifyPassword = (password: string, hash: string) =>
  bcrypt.compare(password, hash);

// ---------- Access token (JWT) ----------
export function createAccessToken(user: { id: string; role: string }) {
  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_MINUTES()}m`)
    .sign(jwtSecret());
}

// ---------- Refresh token (opaque, hanya hash yang disimpan) ----------
export const hashToken = (raw: string) =>
  createHash("sha256").update(raw, "utf-8").digest("hex");

export async function createRefreshToken(userId: string): Promise<string> {
  const raw = randomBytes(48).toString("base64url");
  await getDb()
    .insert(refreshTokens)
    .values({
      id: randomUUID(),
      user_id: userId,
      token_hash: hashToken(raw),
      expires_at: new Date(Date.now() + REFRESH_DAYS() * 86_400_000),
      revoked: false,
    });
  return raw;
}

// ---------- Cookie httpOnly (browser) ----------
// Token disimpan di cookie httpOnly, tidak bisa dibaca JS → aman dari XSS.
export const ACCESS_COOKIE = "wc_access";
export const REFRESH_COOKIE = "wc_refresh";

export function readCookie(req: Request, name: string): string | null {
  const cookie = req.headers.get("cookie");
  if (!cookie) return null;
  for (const part of cookie.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
}

export function setAuthCookies(
  res: NextResponse,
  access: string,
  refresh: string,
): void {
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set(ACCESS_COOKIE, access, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: ACCESS_MINUTES() * 60,
  });
  res.cookies.set(REFRESH_COOKIE, refresh, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: REFRESH_DAYS() * 86_400,
  });
}

export function clearAuthCookies(res: NextResponse): void {
  res.cookies.set(ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(REFRESH_COOKIE, "", { path: "/", maxAge: 0 });
}

// Tokens hanya disertakan di body untuk lingkungan non-produksi (dipakai test
// & Bearer fallback). Di produksi otentikasi murni lewat cookie httpOnly.
export const exposeTokensInBody = process.env.NODE_ENV !== "production";

// ---------- Current user ----------
export async function getCurrentUserOptional(
  req: Request,
): Promise<AuthUser | null> {
  // Cookie (browser) diutamakan; header Bearer sbg fallback (test / API klien).
  let token = readCookie(req, ACCESS_COOKIE);
  if (!token) {
    const header = req.headers.get("authorization") ?? "";
    if (!header.toLowerCase().startsWith("bearer ")) return null;
    token = header.slice(7).trim();
  }
  try {
    const { payload } = await jwtVerify(token, jwtSecret(), {
      algorithms: ["HS256"],
    });
    if (!payload.sub) return null;
    const rows = await getDb()
      .select()
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function requireUser(req: Request): Promise<AuthUser> {
  const user = await getCurrentUserOptional(req);
  if (!user) {
    throw new HttpError(401, "Token sesi tidak sah atau kedaluwarsa.");
  }
  return user;
}

export async function requireRole(
  req: Request,
  role: "siswa" | "guru" | "admin",
): Promise<AuthUser> {
  const user = await requireUser(req);
  if (user.role !== role) {
    throw new HttpError(403, "Anda tidak memiliki akses untuk aksi ini.");
  }
  return user;
}

// Bentuk UserResponse Pydantic — tanpa password_hash.
export function toUserResponse(user: AuthUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    nisn_nip: user.nisn_nip,
    created_at: user.created_at,
  };
}
