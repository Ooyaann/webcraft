import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";

// Health check + ping DB ringan. Dipanggil cron keep-alive (lihat
// .github/workflows/keepalive.yml) supaya Supabase free tier tidak
// menjeda database karena idle.
export async function GET() {
  let db = "off";
  if (process.env.DATABASE_URL) {
    try {
      await getDb().execute(sql`select 1`);
      db = "ok";
    } catch {
      db = "error";
    }
  }
  return NextResponse.json({
    status: "online",
    service: "WebCraft API",
    version: "3.0.0",
    db,
  });
}
