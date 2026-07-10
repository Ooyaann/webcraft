import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Port dari backend/seed.py — data demo: guru budi + siswa andi, kelas 7A,
// 3 pertemuan, 1 learning & 1 project submission + gallery item.
// Jalankan SETELAH skema dibuat: npm run db:push (atau db:migrate), lalu npm run seed.
// PERINGATAN: menghapus seluruh isi tabel terlebih dahulu.

for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // file tidak ada — lanjut
  }
}

async function seed() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL environment variable is not set!");
  const client = postgres(url, { prepare: false, max: 1 });
  const db = drizzle(client, { schema });

  console.log("Purging data...");
  // Urutan aman FK (anak dulu)
  await db.delete(schema.appreciationLogs);
  await db.delete(schema.galleryItems);
  await db.delete(schema.learningSubmissions);
  await db.delete(schema.projectSubmissions);
  await db.delete(schema.ctJourneySessions);
  await db.delete(schema.ctScores);
  await db.delete(schema.learningTasks);
  await db.delete(schema.projectTasks);
  await db.delete(schema.pertemuan);
  await db.delete(schema.roomMembers);
  await db.delete(schema.rooms);
  await db.delete(schema.creativeProjects);
  await db.delete(schema.refreshTokens);
  await db.delete(schema.users);

  console.log("Seeding users...");
  const guruId = randomUUID();
  const siswaId = randomUUID();
  await db.insert(schema.users).values([
    {
      id: guruId,
      name: "Bapak Budi",
      email: "budi@guru.com",
      password_hash: await bcrypt.hash("guru123", 10),
      role: "guru",
    },
    {
      id: siswaId,
      name: "Andi",
      email: "andi@siswa.com",
      password_hash: await bcrypt.hash("siswa123", 10),
      role: "siswa",
    },
  ]);

  console.log("Seeding room...");
  await db.insert(schema.rooms).values({
    id: "room_7a",
    guru_id: guruId,
    name: "Kelas 7A - SMP Negeri Semarang",
    code: "IPA7A1",
    announcement:
      "Selamat datang di WebCraft! Mari kita mulai petualangan belajar pemrograman web dan pemikiran komputasional. Selesaikan Pertemuan 1 terlebih dahulu.",
  });
  await db
    .insert(schema.roomMembers)
    .values({ room_id: "room_7a", siswa_id: siswaId });

  console.log("Seeding pertemuan...");
  await db.insert(schema.pertemuan).values([
    {
      id: "p1",
      room_id: "room_7a",
      urutan: 1,
      judul: "Pertemuan 1: Kartu Profil Pribadi",
      cbl_engage_json: {
        big_idea: "Identitas & Web",
        essential_question:
          "Bagaimana merancang kartu profil pribadi yang informatif dan terstruktur?",
        challenge:
          "Buatlah kartu profil pribadi sederhana. Pastikan ada wadah utama <body>, judul utama <h1> yang berisi namamu, dan sebuah paragraf <p> berisi perkenalan singkat diri.",
        media_url: "",
      },
      guiding_questions_json: [
        "Elemen HTML apa yang berfungsi sebagai wadah utama halaman web?",
        "Bagaimana cara membuat judul teks dengan ukuran terbesar dalam HTML?",
      ],
      reflection_questions_json: [
        "Apa bagian tersulit saat merangkai susunan elemen HTML?",
        "Bagaimana Computational Thinking membantumu merancang komponen profil sebelum menulis kode?",
      ],
      materi_list_json: [
        {
          title: "Pengenalan HTML Dasar PDF",
          url: "https://drive.google.com/file/d/html-dasar",
          type: "link",
        },
      ],
    },
    {
      id: "p2",
      room_id: "room_7a",
      urutan: 2,
      judul: "Pertemuan 2: Galeri Musik Favorit",
      cbl_engage_json: {
        big_idea: "Seni & Struktur Web",
        essential_question:
          "Bagaimana cara mengelompokkan elemen web musik agar rapi?",
        challenge:
          "Buatlah halaman web galeri musik favorit. Gunakan tag div sebagai pembungkus utama informasi playlist, dengan judul sedang h2 tentang musik kesukaanmu di dalamnya.",
        media_url: "",
      },
      guiding_questions_json: [
        "Apa fungsi tag <div> dalam pengelompokan elemen HTML?",
        "Kapan kita harus menggunakan tag judul tingkat kedua <h2> dibanding <h1>?",
      ],
      reflection_questions_json: [
        "Mengapa pengelompokan elemen di dalam tag div sangat mempermudah penataan layout?",
        "Bagaimana merancang urutan langkah (algoritma) pengerjaan meminimalkan kesalahan penulisan kode?",
      ],
      materi_list_json: [
        {
          title: "Panduan Nesting Elemen HTML",
          url: "https://drive.google.com/file/d/html-nesting",
          type: "link",
        },
      ],
    },
    {
      id: "p3",
      room_id: "room_7a",
      urutan: 3,
      judul: "Pertemuan 3: Proyek Portofolio Impian",
      cbl_engage_json: {
        big_idea: "Portofolio & Kreativitas",
        essential_question:
          "Bagaimana cara menyajikan karya portofoliomu secara online dan menarik?",
        challenge:
          "Buatlah proyek portofolio impian kreatif. Hiasi halaman dengan CSS style yang mendefinisikan warna latar belakang solid kontras dan buat daftar keterampilanmu menggunakan tag <ul> dan <li>.",
        media_url: "",
      },
      guiding_questions_json: [
        "Bagaimana tag <style> dapat memengaruhi warna latar belakang halaman web?",
        "Bagaimana menyusun daftar tidak berurutan menggunakan tag ul dan li?",
      ],
      reflection_questions_json: [
        "Bagaimana proses dekomposisi membantumu membagi detail karya portofoliomu?",
        "Seberapa penting kreativitas pewarnaan CSS dalam memikat pengunjung web?",
      ],
      materi_list_json: [
        {
          title: "Pengenalan CSS Hiasan Dasar",
          url: "https://drive.google.com/file/d/css-hiasan",
          type: "link",
        },
      ],
    },
  ]);

  console.log("Seeding tasks...");
  await db.insert(schema.learningTasks).values([
    {
      id: "easy-1",
      pertemuan_id: "p1",
      judul: "Pertemuan 1: Kartu Profil Pribadi",
      validator_rules_json: [
        { type: "exists", selector: "body", error_message: "Misi belum selesai: Kamu belum membuat wadah utama <body>!" },
        { type: "exists", selector: "h1", error_message: "Misi belum selesai: Kamu belum menambahkan judul utama <h1>!" },
        { type: "child_of", parent: "body", child: "h1", error_message: "Misi belum selesai: Judul <h1> harus berada di dalam wadah <body>!" },
        { type: "exists", selector: "p", error_message: "Misi belum selesai: Kamu belum menambahkan paragraf penjelasan <p>!" },
        { type: "child_of", parent: "body", child: "p", error_message: "Misi belum selesai: Paragraf <p> harus berada di dalam wadah <body>!" },
      ],
      max_attempts_before_ai_hint: 4,
    },
    {
      id: "easy-2",
      pertemuan_id: "p2",
      judul: "Pertemuan 2: Galeri Musik Favorit",
      validator_rules_json: [
        { type: "exists", selector: "body", error_message: "Misi belum selesai: Kamu belum membuat wadah utama <body>!" },
        { type: "exists", selector: "div", error_message: "Misi belum selesai: Kamu belum membuat kotak grup <div>!" },
        { type: "child_of", parent: "body", child: "div", error_message: "Misi belum selesai: Kotak grup <div> harus berada di dalam <body>!" },
        { type: "exists", selector: "h2", error_message: "Misi belum selesai: Kamu belum menambahkan judul sedang <h2>!" },
        { type: "child_of", parent: "div", child: "h2", error_message: "Misi belum selesai: Judul sedang <h2> harus berada di dalam kotak grup <div>!" },
      ],
      max_attempts_before_ai_hint: 4,
    },
  ]);

  await db.insert(schema.projectTasks).values({
    id: "proj-1",
    pertemuan_id: "p3",
    judul: "Pertemuan 3: Proyek Portofolio Impian",
    studi_kasus:
      "Buatlah proyek portofolio impian kreatif. Hiasi halaman dengan CSS style yang mendefinisikan warna latar belakang solid kontras dan buat daftar keterampilanmu menggunakan tag <ul> dan <li>.",
    rubrik_json: [
      { name: "Kelengkapan elemen", bobot: 30 },
      { name: "Kebenaran semantik", bobot: 35 },
      { name: "Kreativitas desain", bobot: 35 },
    ],
  });

  console.log("Seeding submissions...");
  await db.insert(schema.learningSubmissions).values({
    id: randomUUID(),
    task_id: "easy-1",
    siswa_id: siswaId,
    ast_snapshots_json: [
      {
        attempt: 1,
        ast: [
          {
            type: "body",
            children: [
              { type: "h1", content: "Profil Andi" },
              {
                type: "p",
                content: "Saya suka bermain sepak bola dan belajar coding!",
              },
            ],
          },
        ],
        errors: [],
      },
    ],
    attempt_count: 1,
    final_score: 95,
    accuracy_score: 100,
    efficiency_score: 90,
    reflection_answers_json: {
      question: "Bagian mana yang paling sulit?",
      answer: "Menyeimbangkan ukuran wadah.",
    },
    ct_post_score_json: {
      decomposition: 90,
      pattern_recognition: 95,
      abstraction: 90,
      algorithm_design: 95,
    },
    ai_feedback:
      "Kerja luar biasa Andi! Hasil run dekomposisimu sangat terperinci dalam memilah struktur data utama. Kamu berhasil mengabstraksikan rancangan visual menjadi kode HTML yang sangat rapi dan logis.",
  });

  const projectSubId = randomUUID();
  await db.insert(schema.projectSubmissions).values({
    id: projectSubId,
    task_id: "proj-1",
    siswa_id: siswaId,
    final_ast_json: [
      {
        type: "body",
        children: [
          { type: "style", content: "body { background-color: #BFDBFE; }" },
          { type: "h1", content: "Portofolio Andi" },
          {
            type: "ul",
            children: [
              { type: "li", content: "Membuat Web HTML dasar" },
              { type: "li", content: "Mengatur gaya dengan CSS" },
              { type: "li", content: "Berpikir Algoritmis dengan Blok" },
            ],
          },
        ],
      },
    ],
    teacher_score: 92,
    teacher_comment:
      "Kerja bagus Andi! Portofoliomu sangat terstruktur dengan rapi. Tambahkan variasi CSS lagi agar makin keren!",
    rubrik_scores_json: {
      "Kelengkapan elemen": 90,
      "Kebenaran semantik": 95,
      "Kreativitas desain": 90,
    },
    is_published_to_gallery: true,
  });

  await db.insert(schema.galleryItems).values({
    id: randomUUID(),
    project_submission_id: projectSubId,
    appreciation_count: 5,
  });

  console.log("====== SEEDING SUCCESS ======");
  await client.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
