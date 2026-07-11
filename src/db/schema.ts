import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

// Port 1:1 dari backend/app/models.py.
// Nama kolom & tabel snake_case persis sama supaya bentuk respons API
// identik dengan FastAPI dan frontend lama tidak perlu diubah.
// Semua timestamp memakai timestamptz — menghapus kelas bug naive/aware
// yang menghasilkan 4 commit perbaikan di backend Python.

const ts = (name?: string) =>
  name
    ? timestamp(name, { withTimezone: true, mode: "date" })
    : timestamp({ withTimezone: true, mode: "date" });

export const users = pgTable("users", {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  password_hash: text().notNull(),
  role: text().notNull().default("siswa"), // 'siswa' | 'guru' | 'admin'
  nisn_nip: text(),
  created_at: ts().defaultNow().notNull(),
});

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: text().primaryKey(),
    user_id: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Hanya hash SHA-256 dari refresh token yang disimpan, tidak pernah nilai mentahnya.
    token_hash: text().notNull().unique(),
    expires_at: ts().notNull(),
    revoked: boolean().notNull().default(false),
    created_at: ts().defaultNow().notNull(),
  },
  (t) => [index("refresh_tokens_user_id_idx").on(t.user_id)],
);

export const rooms = pgTable("rooms", {
  id: text().primaryKey(),
  guru_id: text()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text().notNull(),
  code: text().notNull().unique(), // kode 6 digit untuk join kelas
  is_active: boolean().notNull().default(true),
  announcement: text(),
  created_at: ts().defaultNow().notNull(),
});

export const roomMembers = pgTable(
  "room_members",
  {
    room_id: text()
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    siswa_id: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joined_at: ts().defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.room_id, t.siswa_id] })],
);

export const pertemuan = pgTable("pertemuan", {
  id: text().primaryKey(),
  room_id: text()
    .notNull()
    .references(() => rooms.id, { onDelete: "cascade" }),
  urutan: integer().notNull(),
  judul: text().notNull(),
  is_published: boolean().notNull().default(true),
  // CBL context: {big_idea, essential_question, challenge, media_url}
  cbl_engage_json: jsonb().$type<Record<string, unknown>>(),
  guiding_questions_json: jsonb().$type<string[]>(),
  reflection_questions_json: jsonb().$type<string[]>(),
  // [{title, type, content, url}]
  materi_list_json: jsonb().$type<Record<string, unknown>[]>().default([]),
});

export const learningTasks = pgTable("learning_tasks", {
  id: text().primaryKey(),
  pertemuan_id: text()
    .notNull()
    .references(() => pertemuan.id, { onDelete: "cascade" }),
  judul: text().notNull(),
  // [{type, selector, parent, child, value, min, max, error_message}]
  validator_rules_json: jsonb().$type<Record<string, unknown>[]>().notNull(),
  max_attempts_before_ai_hint: integer().notNull().default(4),
  // Konten CT Journey buatan guru: {decomposition_options: [str], algorithm_steps: [str]}.
  // Saat null/kosong frontend membuat otomatis dari judul.
  ct_journey_json: jsonb().$type<Record<string, unknown>>(),
});

export const projectTasks = pgTable("project_tasks", {
  id: text().primaryKey(),
  pertemuan_id: text()
    .notNull()
    .references(() => pertemuan.id, { onDelete: "cascade" }),
  judul: text().notNull(),
  studi_kasus: text().notNull(),
  deadline: ts(),
  // [{kriteria, bobot, deskripsi}]
  rubrik_json: jsonb().$type<Record<string, unknown>[]>().notNull(),
});

export const ctJourneySessions = pgTable("ct_journey_sessions", {
  id: text().primaryKey(),
  siswa_id: text()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  task_id: text().notNull(), // id task terkait (tanpa FK, mengikuti model lama)
  challenge_context: jsonb().$type<Record<string, unknown>>().notNull(),
  // Jawaban per langkah: bisa string mentah atau array/objek (paritas model lama)
  decomposition_answer_json: jsonb().$type<unknown>(),
  abstraction_answer_json: jsonb().$type<unknown>(),
  pattern_answer_json: jsonb().$type<unknown>(),
  algorithm_answer_json: jsonb().$type<unknown>(),
  // {decomposition, pattern, abstraction, algorithm}
  ct_pre_score_json: jsonb().$type<Record<string, number>>(),
  is_locked: boolean().notNull().default(false),
  completed_at: ts().defaultNow().notNull(),
});

export const learningSubmissions = pgTable("learning_submissions", {
  id: text().primaryKey(),
  task_id: text()
    .notNull()
    .references(() => learningTasks.id, { onDelete: "cascade" }),
  siswa_id: text()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // [{attempt, timestamp, ast, errors, delta}]
  ast_snapshots_json: jsonb().$type<Record<string, unknown>[]>().notNull(),
  attempt_count: integer().notNull().default(0),
  final_score: integer().notNull().default(0),
  accuracy_score: integer().notNull().default(0),
  efficiency_score: integer().notNull().default(0),
  ct_session_id: text().references(() => ctJourneySessions.id, {
    onDelete: "set null",
  }),
  reflection_answers_json: jsonb().$type<Record<string, unknown>>(),
  // {decomposition, pattern, abstraction, algorithm}
  ct_post_score_json: jsonb().$type<Record<string, number>>(),
  ai_tutor_log_json: jsonb().$type<Record<string, unknown>[]>(),
  ai_feedback: text(),
  // Penanda pengerjaan ulang (remidi): skor dibatasi maksimal KKM.
  is_remedial: boolean().notNull().default(false),
  submitted_at: ts().defaultNow().notNull(),
}, (t) => [
  // Satu submission per (task, siswa) — jadikan upsert race-safe di DB.
  unique("learning_subs_task_siswa_uniq").on(t.task_id, t.siswa_id),
]);

export const projectSubmissions = pgTable("project_submissions", {
  id: text().primaryKey(),
  task_id: text()
    .notNull()
    .references(() => projectTasks.id, { onDelete: "cascade" }),
  siswa_id: text()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  final_ast_json: jsonb().$type<Record<string, unknown>[]>().notNull(),
  ct_session_id: text().references(() => ctJourneySessions.id, {
    onDelete: "set null",
  }),
  ai_suggestion_json: jsonb().$type<Record<string, unknown>>(),
  teacher_score: integer(),
  teacher_comment: text(),
  rubrik_scores_json: jsonb().$type<Record<string, number>>(), // {kriteria: score}
  is_published_to_gallery: boolean().notNull().default(false),
  submitted_at: ts().defaultNow().notNull(),
  graded_at: ts(),
}, (t) => [
  unique("project_subs_task_siswa_uniq").on(t.task_id, t.siswa_id),
]);

export const ctScores = pgTable("ct_scores", {
  id: text().primaryKey(),
  siswa_id: text()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  pertemuan_id: text()
    .notNull()
    .references(() => pertemuan.id, { onDelete: "cascade" }),
  decomposition: integer().notNull(),
  pattern_recognition: integer().notNull(),
  abstraction: integer().notNull(),
  algorithm_design: integer().notNull(),
  composite_ct_score: integer().notNull(),
  recorded_at: ts().defaultNow().notNull(),
});

export const galleryItems = pgTable("gallery_items", {
  id: text().primaryKey(),
  project_submission_id: text()
    .notNull()
    .unique()
    .references(() => projectSubmissions.id, { onDelete: "cascade" }),
  published_at: ts().defaultNow().notNull(),
  appreciation_count: integer().notNull().default(0),
});

export const appreciationLogs = pgTable("appreciation_logs", {
  id: text().primaryKey(),
  siswa_id: text()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  gallery_item_id: text()
    .notNull()
    .references(() => galleryItems.id, { onDelete: "cascade" }),
  created_at: ts().defaultNow().notNull(),
});

export const creativeProjects = pgTable("creative_projects", {
  id: text().primaryKey(),
  siswa_id: text()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text().notNull(),
  ast_json: jsonb().$type<Record<string, unknown>[]>().notNull(),
  updated_at: ts()
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
