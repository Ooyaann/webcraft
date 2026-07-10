import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeAll, describe, expect, it } from "vitest";
import { setDbForTests, type Db } from "@/db";
import * as schema from "@/db/schema";

// Integrasi alur penuh guru + siswa terhadap PGlite, memakai fallback AI
// offline (GEMINI_API_KEY tidak diset) sehingga deterministik.

process.env.JWT_SECRET = "test-secret-jangan-dipakai-produksi";
delete process.env.GEMINI_API_KEY;

const url = (path: string) => `http://test.local${path}`;
const jsonReq = (
  path: string,
  method: string,
  body?: unknown,
  token?: string,
) =>
  new Request(url(path), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
const getReq = (path: string, token: string) =>
  new Request(url(path), { headers: { Authorization: `Bearer ${token}` } });
const params = <T>(p: T) => ({ params: Promise.resolve(p) });

let guruToken = "";
let siswaToken = "";
let roomId = "";
let roomCode = "";
let pertemuanId = "";
let learningTaskId = "";
let projectTaskId = "";
let projectSubmissionId = "";

beforeAll(async () => {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  setDbForTests(db as unknown as Db);

  const { POST: register } = await import("@/app/api/auth/register/route");
  const guruRes = await register(
    jsonReq("/api/auth/register", "POST", {
      name: "Bapak Budi",
      email: "budi@guru.com",
      password: "guru12345",
      role: "guru",
      nisn_nip: "123456789012345678",
    }),
    {},
  );
  guruToken = (await guruRes.json()).access_token;

  const siswaRes = await register(
    jsonReq("/api/auth/register", "POST", {
      name: "Andi",
      email: "andi@siswa.com",
      password: "siswa12345",
      role: "siswa",
      nisn_nip: "1234567890",
    }),
    {},
  );
  siswaToken = (await siswaRes.json()).access_token;
});

describe("alur kelas", () => {
  it("guru membuat kelas; siswa ditolak", async () => {
    const { POST } = await import("@/app/api/rooms/route");
    const denied = await POST(
      jsonReq("/api/rooms", "POST", { name: "Kelas 7A" }, siswaToken),
      {},
    );
    expect(denied.status).toBe(403);

    const res = await POST(
      jsonReq("/api/rooms", "POST", { name: "Kelas 7A" }, guruToken),
      {},
    );
    expect(res.status).toBe(200);
    const room = await res.json();
    roomId = room.id;
    roomCode = room.code;
    expect(room.code).toMatch(/^[A-Z0-9]{6}$/);
  });

  it("siswa join via kode; kode salah → 404", async () => {
    const { POST } = await import("@/app/api/rooms/join/route");
    const bad = await POST(
      jsonReq("/api/rooms/join", "POST", { code: "XXXXXX" }, siswaToken),
      {},
    );
    expect(bad.status).toBe(404);

    const res = await POST(
      jsonReq("/api/rooms/join", "POST", { code: roomCode }, siswaToken),
      {},
    );
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe(roomId);
  });

  it("guru membuat pertemuan 'Kartu Profil' → auto-seed learning+project task", async () => {
    const { POST } = await import("@/app/api/rooms/[roomId]/pertemuan/route");
    const res = await POST(
      jsonReq(`/api/rooms/${roomId}/pertemuan`, "POST", {
        urutan: 1,
        judul: "Kartu Profil Pribadi",
      }, guruToken),
      params({ roomId }),
    );
    expect(res.status).toBe(200);
    pertemuanId = (await res.json()).id;

    const { GET } = await import(
      "@/app/api/pertemuan/[pertemuanId]/tasks/route"
    );
    const tasksRes = await GET(
      getReq(`/api/pertemuan/${pertemuanId}/tasks`, siswaToken),
      params({ pertemuanId }),
    );
    const tasks = await tasksRes.json();
    expect(tasks.learning_tasks).toHaveLength(1);
    expect(tasks.project_tasks).toHaveLength(1);
    learningTaskId = tasks.learning_tasks[0].id;
    projectTaskId = tasks.project_tasks[0].id;
    // Branch 'profil': 5 aturan validator
    expect(tasks.learning_tasks[0].validator_rules_json).toHaveLength(5);
    expect(tasks.project_tasks[0].judul).toBe("Proyek: Kartu Profil Pribadi");
  });
});

describe("alur pengerjaan siswa", () => {
  it("submit learning → skor terhitung (2 percobaan, tanpa error = 95)", async () => {
    const { POST } = await import("@/app/api/submissions/learning/route");
    const res = await POST(
      jsonReq("/api/submissions/learning", "POST", {
        task_id: learningTaskId,
        ast_snapshots: [
          { attempt: 1, ast: [], errors: [{ message: "Belum ada body" }] },
          { attempt: 2, ast: [{ type: "body" }], errors: [] },
        ],
        attempt_count: 2,
        ct_post_score: { decomposition: 90, pattern_recognition: 85, abstraction: 88, algorithm_design: 92 },
      }, siswaToken),
      {},
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.accuracy).toBe(100);
    expect(data.efficiency).toBe(90);
    expect(data.final_score).toBe(95);
  });

  it("learning/me memuat pertemuan_id & tag feedback", async () => {
    const { GET } = await import("@/app/api/submissions/learning/me/route");
    const res = await GET(getReq("/api/submissions/learning/me", siswaToken), {});
    const list = await res.json();
    expect(list).toHaveLength(1);
    expect(list[0].pertemuan_id).toBe(pertemuanId);
    expect(list[0].feedbackTags).toEqual(["Sangat Baik"]);
  });

  it("submit project → saran AI offline tersimpan", async () => {
    const { POST } = await import("@/app/api/submissions/project/route");
    const res = await POST(
      jsonReq("/api/submissions/project", "POST", {
        task_id: projectTaskId,
        final_ast: [{ type: "body", children: [{ type: "h1", content: "Karya Andi" }] }],
      }, siswaToken),
      {},
    );
    expect(res.status).toBe(201);
    projectSubmissionId = (await res.json()).submission_id;

    const { GET } = await import(
      "@/app/api/submissions/project/task/[taskId]/me/route"
    );
    const mine = await GET(
      getReq(`/api/submissions/project/task/${projectTaskId}/me`, siswaToken),
      params({ taskId: projectTaskId }),
    );
    const sub = await mine.json();
    expect(sub.ai_suggestion_json.suggested_scores).toBeTruthy();
  });

  it("guru menilai + publikasi galeri → item galeri dibuat", async () => {
    const { PUT } = await import(
      "@/app/api/submissions/project/[submissionId]/grade/route"
    );
    const res = await PUT(
      jsonReq(`/api/submissions/project/${projectSubmissionId}/grade`, "PUT", {
        teacher_score: 92,
        teacher_comment: "Bagus!",
        rubrik_scores: { "Kelengkapan elemen": 90 },
        is_published_to_gallery: true,
      }, guruToken),
      params({ submissionId: projectSubmissionId }),
    );
    expect(res.status).toBe(200);
  });

  it("galeri menampilkan proyek terpublikasi; apresiasi hanya sekali", async () => {
    const { GET } = await import("@/app/api/gallery/route");
    const res = await GET(getReq("/api/gallery", siswaToken), {});
    const items = await res.json();
    const project = items.find((i: { type: string }) => i.type === "project");
    expect(project).toBeTruthy();
    expect(project.score).toBe(92);

    const { POST } = await import(
      "@/app/api/gallery/[submissionId]/appreciate/route"
    );
    const like = await POST(
      jsonReq(`/api/gallery/${projectSubmissionId}/appreciate`, "POST", undefined, siswaToken),
      params({ submissionId: projectSubmissionId }),
    );
    expect((await like.json()).appreciations).toBe(1);

    const again = await POST(
      jsonReq(`/api/gallery/${projectSubmissionId}/appreciate`, "POST", undefined, siswaToken),
      params({ submissionId: projectSubmissionId }),
    );
    expect(again.status).toBe(400);
  });
});

describe("CT journey & scores", () => {
  let sessionId = "";

  it("simpan langkah decomposition lalu algorithm → sesi terkunci", async () => {
    const { POST } = await import("@/app/api/ct-journey/session/route");
    const res = await POST(
      jsonReq("/api/ct-journey/session", "POST", {
        task_id: learningTaskId,
        step: "decomposition",
        answer: "body, judul, paragraf",
        score: 88,
      }, siswaToken),
      {},
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    sessionId = data.session_id;
    expect(data.ct_pre_scores.decomposition).toBe(88);

    const lock = await POST(
      jsonReq("/api/ct-journey/session", "POST", {
        session_id: sessionId,
        task_id: learningTaskId,
        step: "algorithm",
        answer: "body -> h1 -> style",
      }, siswaToken),
      {},
    );
    expect(lock.status).toBe(201);

    const locked = await POST(
      jsonReq("/api/ct-journey/session", "POST", {
        session_id: sessionId,
        task_id: learningTaskId,
        step: "pattern",
        answer: "{}",
      }, siswaToken),
      {},
    );
    expect(locked.status).toBe(400);
  });

  it("guru tidak bisa menyimpan CT journey; siswa lain tidak bisa baca sesi", async () => {
    const { POST } = await import("@/app/api/ct-journey/session/route");
    const denied = await POST(
      jsonReq("/api/ct-journey/session", "POST", {
        task_id: learningTaskId,
        step: "decomposition",
        answer: "x",
      }, guruToken),
      {},
    );
    expect(denied.status).toBe(403);

    const { GET } = await import(
      "@/app/api/ct-journey/session/[sessionId]/route"
    );
    const own = await GET(
      getReq(`/api/ct-journey/session/${sessionId}`, siswaToken),
      params({ sessionId }),
    );
    expect(own.status).toBe(200);
  });

  it("simpan & baca CT score", async () => {
    const { POST } = await import("@/app/api/ct-scores/route");
    const res = await POST(
      jsonReq("/api/ct-scores", "POST", {
        decomposition: 90,
        abstraction: 80,
        pattern_recognition: 85,
        algorithm_design: 88,
        pertemuan_id: pertemuanId,
      }, siswaToken),
      {},
    );
    expect(res.status).toBe(201);
    expect((await res.json()).composite_ct_score).toBe(85);

    const { GET } = await import("@/app/api/ct-scores/me/route");
    const mine = await GET(getReq("/api/ct-scores/me", siswaToken), {});
    expect(await mine.json()).toHaveLength(1);
  });
});

describe("rekap & AI offline", () => {
  it("grades guru: status Selesai + progres task", async () => {
    const { GET } = await import("@/app/api/rooms/[roomId]/grades/route");
    const res = await GET(
      getReq(`/api/rooms/${roomId}/grades`, guruToken),
      params({ roomId }),
    );
    const grades = await res.json();
    expect(grades).toHaveLength(1);
    expect(grades[0].status).toBe("Selesai");
    expect(grades[0].project).toBe(92);
    expect(grades[0].already_done).toBe(2);
    expect(grades[0].not_done).toBe(0);
  });

  it("AI tutor offline memberi hint; validate-code offline menolak placeholder", async () => {
    const { POST: tutor } = await import("@/app/api/ai/tutor/route");
    const hintRes = await tutor(
      jsonReq("/api/ai/tutor", "POST", {
        current_ast: [],
        target_rules: [],
        attempt_history: [],
        student_message: "bagaimana mengganti warna?",
        lesson_context: "Kartu Profil",
      }, siswaToken),
      {},
    );
    expect(hintRes.status).toBe(200);
    expect((await hintRes.json()).hint).toContain("style");

    const { POST: validate } = await import("@/app/api/ai/validate-code/route");
    const invalid = await validate(
      jsonReq("/api/ai/validate-code", "POST", {
        current_html: "<body><h1>Judul Baru</h1></body>",
        target_rules: [{ type: "exists", selector: "h1" }],
        lesson_title: "Kartu Profil",
      }, siswaToken),
      {},
    );
    const verdict = await invalid.json();
    expect(verdict.is_valid).toBe(false);
  });

  it("class-insights guru dari data submission nyata", async () => {
    const { POST } = await import("@/app/api/ai/class-insights/route");
    const res = await POST(
      jsonReq("/api/ai/class-insights", "POST", { room_id: roomId }, guruToken),
      {},
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ct_class_average).toBe(95);
    expect(Array.isArray(data.error_heatmap)).toBe(true);
  });
});
