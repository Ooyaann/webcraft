import { randomUUID } from "node:crypto";
import { asc, and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { learningTasks, pertemuan, projectTasks, rooms } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { handler, HttpError, parseBody } from "@/lib/http";

type Ctx = { params: Promise<{ roomId: string }> };

const pertemuanCreateSchema = z.object({
  urutan: z.number().int(),
  judul: z.string().min(1).max(200),
  cbl_engage_json: z.record(z.string(), z.unknown()).nullish(),
  guiding_questions_json: z.array(z.string()).nullish(),
  reflection_questions_json: z.array(z.string()).nullish(),
  materi_list_json: z.array(z.record(z.string(), z.unknown())).nullish(),
});

// Aturan validator + studi kasus default yang di-seed per pertemuan baru,
// dipilih dari kata kunci judul (port 1:1 dari pertemuan.py).
function seedContent(judul: string) {
  let rules: Record<string, unknown>[] = [
    { type: "exists", selector: "body", error_message: "Misi belum selesai: Kamu belum membuat wadah utama <body>!" },
    { type: "exists", selector: "h1", error_message: "Misi belum selesai: Kamu belum menambahkan judul utama <h1>!" },
  ];
  let studiKasus = `Buatlah halaman web edukatif tentang ${judul} menggunakan pemikiran komputasional.`;

  const lower = judul.toLowerCase();
  if (lower.includes("profil") || lower.includes("kartu")) {
    rules = [
      { type: "exists", selector: "body", error_message: "Misi belum selesai: Kamu belum membuat wadah utama <body>!" },
      { type: "exists", selector: "h1", error_message: "Misi belum selesai: Kamu belum menambahkan judul utama <h1>!" },
      { type: "child_of", parent: "body", child: "h1", error_message: "Misi belum selesai: Judul <h1> harus berada di dalam wadah <body>!" },
      { type: "exists", selector: "p", error_message: "Misi belum selesai: Kamu belum menambahkan paragraf penjelasan <p>!" },
      { type: "child_of", parent: "body", child: "p", error_message: "Misi belum selesai: Paragraf <p> harus berada di dalam wadah <body>!" },
    ];
    studiKasus =
      "Buatlah halaman web kartu profil pribadi kreatif lengkap dengan judul profil <h1>, paragraf perkenalan diri <p> di dalam wadah <body>.";
  } else if (lower.includes("musik") || lower.includes("galeri")) {
    rules = [
      { type: "exists", selector: "body", error_message: "Misi belum selesai: Kamu belum membuat wadah utama <body>!" },
      { type: "exists", selector: "div", error_message: "Misi belum selesai: Kamu belum membuat kotak grup <div>!" },
      { type: "child_of", parent: "body", child: "div", error_message: "Misi belum selesai: Kotak grup <div> harus berada di dalam <body>!" },
      { type: "exists", selector: "h2", error_message: "Misi belum selesai: Kamu belum menambahkan judul sedang <h2>!" },
      { type: "child_of", parent: "div", child: "h2", error_message: "Misi belum selesai: Judul sedang <h2> harus berada di dalam kotak grup <div>!" },
    ];
    studiKasus =
      "Buatlah halaman web galeri musik favorit. Gunakan tag div sebagai pembungkus utama informasi playlist, dengan judul sedang h2 tentang musik kesukaanmu di dalamnya.";
  } else if (lower.includes("proyek") || lower.includes("portofolio")) {
    rules = [
      { type: "exists", selector: "body", error_message: "Misi belum selesai: Kamu belum membuat wadah utama <body>!" },
      { type: "exists", selector: "h1", error_message: "Misi belum selesai: Kamu belum menambahkan judul utama <h1>!" },
      { type: "exists", selector: "style", error_message: "Misi belum selesai: Kamu belum menambahkan gaya halaman <style>!" },
      { type: "exists", selector: "ul", error_message: "Misi belum selesai: Kamu belum membuat daftar <ul>!" },
      { type: "exists", selector: "li", error_message: "Misi belum selesai: Kamu belum menambahkan item daftar <li>!" },
    ];
    studiKasus =
      "Buatlah proyek portofolio impian kreatif. Hiasi halaman dengan CSS style yang mendefinisikan warna latar belakang solid kontras dan buat daftar keterampilanmu menggunakan tag <ul> dan <li>.";
  }
  return { rules, studiKasus };
}

// POST /api/rooms/{roomId}/pertemuan — buat pertemuan + auto-seed 1 learning
// task & 1 project task (guru pemilik saja)
export const POST = handler<Ctx>(async (req, ctx) => {
  const user = await requireUser(req);
  const { roomId } = await ctx.params;
  const body = await parseBody(req, pertemuanCreateSchema);
  const db = getDb();

  const [room] = await db
    .select()
    .from(rooms)
    .where(eq(rooms.id, roomId))
    .limit(1);
  if (!room) throw new HttpError(404, "Kelas tidak ditemukan.");
  if (room.guru_id !== user.id) {
    throw new HttpError(403, "Hanya pembuat kelas yang diizinkan menambahkan pertemuan.");
  }

  const [pert] = await db
    .insert(pertemuan)
    .values({
      id: randomUUID(),
      room_id: roomId,
      urutan: body.urutan,
      judul: body.judul,
      is_published: true,
      cbl_engage_json: body.cbl_engage_json ?? null,
      guiding_questions_json: body.guiding_questions_json ?? null,
      reflection_questions_json: body.reflection_questions_json ?? null,
      materi_list_json: body.materi_list_json ?? [],
    })
    .returning();

  const { rules, studiKasus } = seedContent(body.judul);

  await db.insert(learningTasks).values({
    id: randomUUID(),
    pertemuan_id: pert.id,
    judul: body.judul,
    validator_rules_json: rules,
    max_attempts_before_ai_hint: 4,
  });
  await db.insert(projectTasks).values({
    id: randomUUID(),
    pertemuan_id: pert.id,
    judul: `Proyek: ${body.judul}`,
    studi_kasus: studiKasus,
    rubrik_json: [
      { name: "Kelengkapan elemen", bobot: 30 },
      { name: "Kebenaran semantik", bobot: 35 },
      { name: "Kreativitas desain", bobot: 35 },
    ],
  });

  return NextResponse.json(pert);
});

// GET /api/rooms/{roomId}/pertemuan — urut naik; siswa hanya yang published
export const GET = handler<Ctx>(async (req, ctx) => {
  const user = await requireUser(req);
  const { roomId } = await ctx.params;
  const db = getDb();

  const where =
    user.role === "siswa"
      ? and(eq(pertemuan.room_id, roomId), eq(pertemuan.is_published, true))
      : eq(pertemuan.room_id, roomId);

  const list = await db
    .select()
    .from(pertemuan)
    .where(where)
    .orderBy(asc(pertemuan.urutan));
  return NextResponse.json(list);
});
