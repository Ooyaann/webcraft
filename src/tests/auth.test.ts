import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeAll, describe, expect, it } from "vitest";
import { setDb, type Db } from "@/db";
import * as schema from "@/db/schema";

// End-to-end alur auth terhadap Postgres in-memory (PGlite) memakai
// migrasi SQL yang sama dengan produksi (folder drizzle/).

process.env.JWT_SECRET = "test-secret-jangan-dipakai-produksi";

const url = (path: string) => `http://test.local${path}`;

const postJson = (path: string, body: unknown, token?: string) =>
  new Request(url(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

const siswa = {
  name: "Andi Siswa",
  email: "andi@siswa.com",
  password: "siswa12345",
  role: "siswa",
  nisn_nip: "1234567890",
};

beforeAll(async () => {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  setDb(db as unknown as Db);
});

describe("auth", () => {
  let accessToken = "";
  let refreshToken = "";

  it("register siswa valid → token + user tanpa password_hash", async () => {
    const { POST } = await import("@/app/api/auth/register/route");
    const res = await POST(postJson("/api/auth/register", siswa), {});
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.access_token).toBeTruthy();
    expect(data.refresh_token).toBeTruthy();
    expect(data.token_type).toBe("bearer");
    expect(data.user.email).toBe(siswa.email);
    expect(data.user.password_hash).toBeUndefined();
  });

  it("register email duplikat → 400", async () => {
    const { POST } = await import("@/app/api/auth/register/route");
    const res = await POST(postJson("/api/auth/register", siswa), {});
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.detail).toBe("Alamat email sudah terdaftar di sistem WebCraft.");
  });

  it("register NISN bukan 10 digit → 400", async () => {
    const { POST } = await import("@/app/api/auth/register/route");
    const res = await POST(
      postJson("/api/auth/register", {
        ...siswa,
        email: "lain@siswa.com",
        nisn_nip: "123",
      }),
      {},
    );
    expect(res.status).toBe(400);
  });

  it("register password pendek → 422 gaya FastAPI", async () => {
    const { POST } = await import("@/app/api/auth/register/route");
    const res = await POST(
      postJson("/api/auth/register", {
        ...siswa,
        email: "pendek@siswa.com",
        password: "abc",
      }),
      {},
    );
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(Array.isArray(data.detail)).toBe(true);
    expect(data.detail[0].type).toBe("string_too_short");
    expect(data.detail[0].loc).toContain("password");
  });

  it("login password salah → 401", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(
      postJson("/api/auth/login", { email: siswa.email, password: "salah123" }),
      {},
    );
    expect(res.status).toBe(401);
  });

  it("login benar → pasangan token", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(
      postJson("/api/auth/login", {
        email: siswa.email,
        password: siswa.password,
      }),
      {},
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    accessToken = data.access_token;
    refreshToken = data.refresh_token;
    expect(accessToken).toBeTruthy();
    expect(refreshToken).toBeTruthy();
  });

  it("login men-set cookie httpOnly; auth & refresh jalan lewat cookie", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(
      postJson("/api/auth/login", { email: siswa.email, password: siswa.password }),
      {},
    );
    expect(res.status).toBe(200);
    const cookieAccess = res.cookies.get("wc_access")?.value;
    const cookieRefresh = res.cookies.get("wc_refresh")?.value;
    expect(cookieAccess).toBeTruthy();
    expect(cookieRefresh).toBeTruthy();

    // /me terotentikasi lewat Cookie (bukan Bearer)
    const { GET } = await import("@/app/api/auth/me/route");
    const meRes = await GET(
      new Request(url("/api/auth/me"), {
        headers: { cookie: `wc_access=${cookieAccess}` },
      }),
      {},
    );
    expect(meRes.status).toBe(200);
    expect((await meRes.json()).email).toBe(siswa.email);

    // Refresh via cookie tanpa body → set cookie access baru
    const { POST: refreshRoute } = await import("@/app/api/auth/refresh/route");
    const rRes = await refreshRoute(
      new Request(url("/api/auth/refresh"), {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: `wc_refresh=${cookieRefresh}` },
        body: "{}",
      }),
      {},
    );
    expect(rRes.status).toBe(200);
    expect(rRes.cookies.get("wc_access")?.value).toBeTruthy();
  });

  it("GET /me dengan token → profil; tanpa token → 401", async () => {
    const { GET } = await import("@/app/api/auth/me/route");
    const ok = await GET(
      new Request(url("/api/auth/me"), {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      {},
    );
    expect(ok.status).toBe(200);
    expect((await ok.json()).email).toBe(siswa.email);

    const anon = await GET(new Request(url("/api/auth/me")), {});
    expect(anon.status).toBe(401);
  });

  it("refresh merotasi token: yang lama dicabut", async () => {
    const { POST } = await import("@/app/api/auth/refresh/route");
    const first = await POST(
      postJson("/api/auth/refresh", { refresh_token: refreshToken }),
      {},
    );
    expect(first.status).toBe(200);
    const rotated = await first.json();
    expect(rotated.refresh_token).not.toBe(refreshToken);

    // token lama sudah dicabut
    const replay = await POST(
      postJson("/api/auth/refresh", { refresh_token: refreshToken }),
      {},
    );
    expect(replay.status).toBe(401);
    refreshToken = rotated.refresh_token;
  });

  it("logout mencabut refresh token", async () => {
    const { POST: logout } = await import("@/app/api/auth/logout/route");
    const res = await logout(
      postJson("/api/auth/logout", { refresh_token: refreshToken }),
      {},
    );
    expect(res.status).toBe(200);

    const { POST: refresh } = await import("@/app/api/auth/refresh/route");
    const after = await refresh(
      postJson("/api/auth/refresh", { refresh_token: refreshToken }),
      {},
    );
    expect(after.status).toBe(401);
  });

  it("rate limit: percobaan login beruntun akhirnya ditolak 429", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await POST(
        postJson("/api/auth/login", { email: siswa.email, password: "salah-terus" }),
        {},
      );
      statuses.push(res.status);
    }
    expect(statuses).toContain(429);
  });
});
