import { GoogleGenAI } from "@google/genai";
import { CT_PILLARS } from "./ctRubric";

// Port dari backend/app/services/ai_service.py — SDK google-generativeai
// (deprecated) diganti @google/genai. Perilaku & fallback offline identik.

const GEMINI_MODEL = "gemini-2.5-flash";

const apiKey = () => process.env.GEMINI_API_KEY ?? "";

type Json = Record<string, unknown>;

async function callGemini(
  prompt: string,
  systemInstruction = "",
  responseFormat: "text" | "json" = "text",
): Promise<string> {
  const key = apiKey();
  if (!key) {
    throw new Error("GEMINI_API_KEY is not configured in environmental variables.");
  }
  const ai = new GoogleGenAI({ apiKey: key });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      ...(systemInstruction ? { systemInstruction } : {}),
      temperature: 0.5,
      maxOutputTokens: 800,
      responseMimeType:
        responseFormat === "json" ? "application/json" : "text/plain",
    },
  });
  return response.text ?? "";
}

// ---------- 1. Socratic hint ----------

export async function getSocraticHint(
  currentAst: Json[],
  targetRules: Json[],
  attemptHistory: Json[],
  studentMessage: string,
  lessonContext: string,
  conversationHistory: { role?: string; content?: string }[] | null = null,
): Promise<string> {
  if (!apiKey()) return getOfflineSocraticHint(currentAst, targetRules, studentMessage);

  const systemInstruction =
    "Kamu adalah AI Tutor Socratic dalam Bahasa Indonesia untuk siswa SMP. Misi utama kamu adalah membantu siswa " +
    "menyelesaikan tantangan coding HTML/CSS. PENTING: JANGAN PERNAH memberikan baris kode HTML/CSS secara langsung! " +
    "Tuntun siswa dengan mengajukan pertanyaan balik yang memicu mereka berpikir kritis (Socratic Method). Gunakan sapaan yang ramah.";

  const prompt =
    `Konteks Pelajaran: ${lessonContext}\n` +
    `Struktur Kode Siswa Saat Ini (AST): ${JSON.stringify(currentAst)}\n` +
    `Target Pembelajaran: ${JSON.stringify(targetRules)}\n` +
    `Histori Percobaan Gagal: ${attemptHistory.length} kali percobaan\n` +
    `Riwayat Obrolan: ${JSON.stringify(conversationHistory ?? [])}\n` +
    `Pesan Siswa: "${studentMessage}"\n\n` +
    "Berikan petunjuk belajar Socratic singkat (maksimal 3-4 kalimat) dalam Bahasa Indonesia.";

  try {
    return await callGemini(prompt, systemInstruction);
  } catch (err) {
    console.error("Gemini API error in Socratic hint:", err);
    return getOfflineSocraticHint(currentAst, targetRules, studentMessage);
  }
}

export function getOfflineSocraticHint(
  currentAst: Json[],
  targetRules: Json[],
  msg: string,
): string {
  const hasBody = currentAst.some((n) => n["type"] === "body");
  const bodyNode = currentAst.find((n) => n["type"] === "body");
  const children = (bodyNode?.["children"] as Json[]) || [];

  if (msg) {
    const m = msg.toLowerCase();
    if (m.includes("warna") || m.includes("css") || m.includes("style")) {
      return "Untuk menghias halaman web, kamu memerlukan blok `<style>`. Apakah kamu sudah menambahkannya, dan apakah selektor CSS-mu mengarah ke elemen yang tepat?";
    }
    if (m.includes("bantuan") || m.includes("bingung") || m.includes("caranya")) {
      if (!hasBody) {
        return "Mari kita lihat langkah pertama dalam algoritma kodingmu. Setiap halaman web selalu membutuhkan wadah utama `<body>` terlebih dahulu. Apakah kamu sudah menambahkannya?";
      }
      return "Periksalah kriteria keberhasilan misi di layar. Apakah ada elemen atau aturan penempatan yang belum kamu ikuti dengan benar?";
    }
  }

  if (targetRules && targetRules.length > 0) {
    if (!hasBody) {
      return "Coba perhatikan kanvas kerjamu. Setiap halaman web selalu membutuhkan wadah utama untuk menampung konten visual. Blok wadah apakah itu?";
    }

    for (const rule of targetRules) {
      if (rule["type"] === "exists") {
        const sel = String(rule["selector"] ?? "");
        const exists = currentAst.some((n) => n["type"] === sel) || children.some((n) => n["type"] === sel);
        if (!exists) {
          return `Untuk menyelesaikan tantangan ini, apakah kamu sudah menambahkan elemen \`<${sel}>\` ke dalam kanvas?`;
        }
      } else if (rule["type"] === "child_of") {
        const p = String(rule["parent"] ?? "");
        const c = String(rule["child"] ?? "");
        const hasChild = currentAst.some((n) => n["type"] === c) || children.some((n) => n["type"] === c);
        if (hasChild) {
          if (p === "body") {
            const nested = children.some((n) => n["type"] === c);
            if (!nested) {
              return `Elemen \`<${c}>\` sudah kamu tambahkan. Namun, apakah posisinya sudah kamu letakkan di dalam wadah \`<${p}>\`?`;
            }
          }
        }
      } else if (rule["type"] === "content_match") {
        const val = String(rule["value"] ?? "").toLowerCase();
        const htmlCode = JSON.stringify(currentAst).toLowerCase();
        if (!htmlCode.includes(val)) {
          return `Tantangan ini mengharuskan adanya teks khusus di dalam karyamu. Apakah kamu sudah mengetikkan kata atau kalimat "${val}"?`;
        }
      }
    }
    return "Kerangka kode HTML buatanmu tampaknya sudah sesuai kriteria! Kamu bisa mencoba menekan tombol Uji AI untuk memvalidasinya.";
  }

  // Fallback for empty rules (sandbox/project)
  if (!hasBody) {
    return "Dokumen HTML buatanmu memerlukan wadah utama `<body>` terlebih dahulu agar konten visual lainnya dapat diletakkan di sana. Coba tambahkan blok `<body>` dulu ya!";
  }
  return "Untuk proyek kreatif bebas ini, kamu bisa menyusun kombinasi elemen HTML apa saja (seperti judul, paragraf, gambar, atau list) di dalam `<body>`. Jangan lupa untuk menghiasnya dengan menambahkan blok `<style>` untuk bereksperimen dengan CSS!";
}

// ---------- 2. CT Journey step evaluator ----------

export type CtStepResult = {
  feedback: string;
  ct_score_delta: number;
  next_hint: string;
};

export async function analyzeCtStep(
  step: string,
  question: string,
  studentAnswer: string,
  challengeContext: Json,
): Promise<CtStepResult> {
  if (!apiKey()) return getOfflineCtStepResult(step, studentAnswer);

  const systemInstruction =
    "Kamu adalah AI Evaluator Computational Thinking (CT) Bahasa Indonesia untuk siswa SMP. " +
    "Tugasmu adalah menganalisis langkah berpikir siswa secara kritis namun memotivasi. " +
    "Berikan umpan balik yang membangun, ramah, dan bebas dari kata-kata yang terlalu rumit. " +
    "Pastikan skor (ct_score_delta) berkisar antara 60-100, mencerminkan pemecahan masalah (Decomposition), " +
    "pemilihan prioritas (Abstraction), pengenalan kesamaan (Pattern Recognition), atau penyusunan langkah logis (Algorithm).";

  const prompt =
    `Tantangan Misi: ${challengeContext["title"] ?? ""}\n` +
    `Instruksi Misi: ${challengeContext["description"] ?? ""}\n` +
    `Pilar Berpikir Komputasional: ${step.toUpperCase()}\n` +
    `Pertanyaan Panduan: ${question}\n` +
    `Jawaban Siswa: "${studentAnswer}"\n\n` +
    "Tolong evaluasi jawaban siswa tersebut. Berikan masukan/feedback yang konstruktif dan memotivasi siswa SMP. " +
    "Gunakan bahasa Indonesia yang santun, bersahabat, dan inspiratif. Berikan juga nilai objektif (ct_score_delta) antara 60-100. " +
    "Kembalikan data secara ketat dalam format JSON berikut:\n" +
    '{"feedback": "[Masukan ramah dan konstruktif]", "ct_score_delta": [angka_skor_integer], "next_hint": "[Petunjuk singkat untuk langkah selanjutnya]"}';

  try {
    const res = await callGemini(prompt, systemInstruction, "json");
    return JSON.parse(res) as CtStepResult;
  } catch (err) {
    console.error("Gemini API error in CT Journey analysis:", err);
    return getOfflineCtStepResult(step, studentAnswer);
  }
}

const TEXT_KWS = ["judul", "h1", "h2", "paragraf", "p", "teks", "tulisan", "deskripsi", "nama", "lirik", "lagu", "keterampilan", "halaman", "item", "list", "li", "ul"];
const VISUAL_KWS = ["foto", "gambar", "img", "ilustrasi", "visual", "logo", "ikon", "video"];
const STYLE_KWS = ["desain", "warna", "style", "css", "hiasan", "tampilan", "font", "background"];
const WEB_KWS = ["body", "wadah", "div", "kontainer", "pembungkus", "button", "tombol", "kreatif"];

export function getOfflineCtStepResult(step: string, answer: string): CtStepResult {
  const allValidKws = [...TEXT_KWS, ...VISUAL_KWS, ...STYLE_KWS, ...WEB_KWS];

  if (step === "decomposition") {
    const ansClean = answer.replace("Saya memecah web menjadi:", "");
    const items = ansClean
      .split(",")
      .map((i) => i.trim())
      .filter(Boolean);

    if (items.length < 3) {
      return {
        feedback: `Dekomposisimu masih terlalu sederhana (baru ${items.length} bagian). Coba bagi halaman web menjadi bagian yang lebih kecil seperti wadah utama body, judul, paragraf penjelasan, atau bagian hiasan.`,
        ct_score_delta: 65,
        next_hint: "Langkah berikutnya: Abstraksi.",
      };
    }

    const words = items.join(" ").toLowerCase();
    if (!allValidKws.some((kw) => words.includes(kw))) {
      return {
        feedback:
          "Dekomposisimu kurang relevan dengan elemen halaman web. Pastikan kamu membaginya menjadi bagian web yang nyata seperti judul, paragraf, gambar, atau wadah utama.",
        ct_score_delta: 60,
        next_hint: "Langkah berikutnya: Abstraksi.",
      };
    }

    const score = Math.min(98, 85 + (items.length - 3) * 4);
    return {
      feedback: `Luar biasa! Dekomposisi kamu sudah sangat lengkap dan terperinci. Kamu membagi halaman web menjadi: ${items.join(", ")}. Ini fondasi yang bagus untuk mulai merancang web!`,
      ct_score_delta: score,
      next_hint: "Langkah berikutnya: Abstraksi.",
    };
  }

  if (step === "abstraction") {
    const ansClean = answer.replace("Tiga bagian terpenting:", "");
    const items = ansClean
      .split(",")
      .map((i) => i.trim())
      .filter(Boolean);

    const structKws = ["body", "wadah", "div", "h1", "h2", "p", "paragraf", "list", "ul", "li"];
    let styleCount = 0;
    for (const item of items) {
      const lower = item.toLowerCase();
      if (STYLE_KWS.some((kw) => lower.includes(kw))) styleCount += 1;
      void structKws; // paritas: struct_count dihitung di Python tapi tidak dipakai
    }

    if (styleCount >= 2) {
      return {
        feedback: `Abstraksimu kurang tepat karena memprioritaskan dekorasi/style (${items.join(", ")}). Sebaiknya prioritaskan elemen wadah dan struktur utama terlebih dahulu agar halaman web memiliki kerangka yang jelas sebelum dihias.`,
        ct_score_delta: 70,
        next_hint: "Langkah berikutnya: Pengenalan Pola.",
      };
    }

    return {
      feedback: `Pemilihan abstraksi yang sangat tepat! Dengan memprioritaskan ${items.join(", ")}, kamu memfokuskan diri pada kerangka dan elemen konten utama terlebih dahulu sebelum memikirkan detail kosmetik/styling.`,
      ct_score_delta: 92,
      next_hint: "Langkah berikutnya: Pengenalan Pola.",
    };
  }

  if (step === "pattern") {
    const ansClean = answer.replace("Pengelompokan elemen:", "").trim();
    let categories: Record<string, string> = {};
    try {
      categories = JSON.parse(ansClean);
    } catch {
      categories = {};
    }

    const misplaced: string[] = [];
    for (const [name, cat] of Object.entries(categories)) {
      const lower = name.toLowerCase();
      const isText = TEXT_KWS.some((kw) => lower.includes(kw));
      const isVisual = VISUAL_KWS.some((kw) => lower.includes(kw));
      const isStyle = STYLE_KWS.some((kw) => lower.includes(kw));

      if (cat === "Teks") {
        if (isVisual && !isText) misplaced.push(`'${name}' dimasukkan ke 'Teks' (seharusnya Visual)`);
        else if (isStyle && !isText) misplaced.push(`'${name}' dimasukkan ke 'Teks' (seharusnya Style)`);
      } else if (cat === "Visual") {
        if (isText && !isVisual) misplaced.push(`'${name}' dimasukkan ke 'Visual' (seharusnya Teks)`);
        else if (isStyle && !isVisual) misplaced.push(`'${name}' dimasukkan ke 'Visual' (seharusnya Style)`);
      } else if (cat === "Style") {
        if (isText && !isStyle) misplaced.push(`'${name}' dimasukkan ke 'Style' (seharusnya Teks)`);
        else if (isVisual && !isStyle) misplaced.push(`'${name}' dimasukkan ke 'Style' (seharusnya Visual)`);
      }
    }

    if (misplaced.length) {
      return {
        feedback: `Pengenalan polamu perlu diperbaiki. Beberapa elemen salah dikelompokkan: ${misplaced.join("; ")}. Cobalah kelompokkan tulisan ke 'Teks', gambar/media ke 'Visual', dan dekorasi/desain ke 'Style'.`,
        ct_score_delta: 72,
        next_hint: "Langkah akhir: Algoritma.",
      };
    }

    return {
      feedback:
        "Pengenalan pola yang luar biasa akurat! Semua elemen web telah kamu kelompokkan ke dalam Teks, Visual, dan Style dengan sangat tepat. Ini akan memudahkan penulisan tag HTML dan CSS-mu.",
      ct_score_delta: 95,
      next_hint: "Langkah akhir: Algoritma.",
    };
  }

  // algorithm
  const ansClean = answer.replace("Urutan langkah pembuatan:", "").trim();
  const steps = ansClean
    .split("->")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!steps.length) {
    return {
      feedback: "Algoritma kerjamu masih kosong. Urutkan langkah-langkah pembuatan web dengan benar.",
      ct_score_delta: 60,
      next_hint: "",
    };
  }

  const firstStep = steps[0].toLowerCase();
  const lastStep = steps[steps.length - 1].toLowerCase();
  const hasBodyFirst =
    firstStep.includes("body") || firstStep.includes("wadah") || firstStep.includes("utama");
  const hasStyleLast =
    lastStep.includes("style") || lastStep.includes("css") ||
    lastStep.includes("hiasan") || lastStep.includes("menghias");

  if (!hasBodyFirst) {
    return {
      feedback: `Urutan algoritma kurang logis. Langkah pertama seharusnya membuat wadah utama 'body' terlebih dahulu sebagai penampung konten web, bukan '${steps[0]}'.`,
      ct_score_delta: 70,
      next_hint: "",
    };
  }

  if (
    !hasStyleLast &&
    steps.slice(0, -1).some((s) => {
      const lower = s.toLowerCase();
      return lower.includes("style") || lower.includes("css");
    })
  ) {
    return {
      feedback:
        "Urutan algoritma kurang tepat. Langkah menambahkan style CSS atau menghias halaman sebaiknya dilakukan di akhir setelah seluruh elemen konten selesai dibuat.",
      ct_score_delta: 75,
      next_hint: "",
    };
  }

  return {
    feedback:
      "Algoritma kerjamu sudah sangat logis dan berurutan! Memulai dari wadah terluar (body), menyusun konten utama, lalu diakhiri dengan menghias halaman menggunakan CSS adalah urutan terbaik.",
    ct_score_delta: 95,
    next_hint: "",
  };
}

// ---------- 3. Validasi kode siswa ----------

export type CodeValidation = { is_valid: boolean; feedback: string };

export async function validateStudentCode(
  currentHtml: string,
  targetRules: Json[],
  lessonTitle: string,
): Promise<CodeValidation> {
  if (!apiKey()) return getOfflineCodeValidation(currentHtml, targetRules);

  const prompt =
    "Sebagai AI Validator Kode WebCraft untuk siswa SMP:\n" +
    `Misi Pembelajaran: ${lessonTitle}\n` +
    `Aturan Target Pembelajaran: ${JSON.stringify(targetRules)}\n` +
    `Kode HTML Siswa:\n${currentHtml}\n\n` +
    "Periksa apakah kode HTML siswa sudah memenuhi seluruh target pembelajaran di atas secara semantik dan struktural!\n" +
    "PENTING: Periksa konten teks di dalam elemen secara semantik! Misalnya, jika misi meminta 'judul utama berisi namamu', " +
    "maka tag <h1> harus berisi nama orang yang realistis (bukan teks kosong, bukan placeholder seperti 'Nama Anda', 'Nama Siswa', 'namamu', 'Nama Lengkap', atau 'Judul Utama'). " +
    "Jika ada ketidaksesuaian konten teks dengan instruksi misi, nyatakan tidak valid (is_valid = false) dan berikan masukan spesifik tentang apa yang perlu diperbaiki." +
    "Kembalikan respon dalam format JSON: " +
    '{"is_valid": true/false, "feedback": "Tulis masukan dalam Bahasa Indonesia yang menjelaskan apakah sudah benar atau apa yang kurang/salah secara ramah dan memotivasi (maksimal 2-3 kalimat)."}';

  try {
    const res = await callGemini(prompt, "", "json");
    return JSON.parse(res) as CodeValidation;
  } catch (err) {
    console.error("Gemini API error in code validation:", err);
    return getOfflineCodeValidation(currentHtml, targetRules);
  }
}

// Teks placeholder bawaan blok baru — misi selesai tidak boleh masih memuatnya.
const DEFAULT_PLACEHOLDERS = [
  "judul baru",
  "teks baru di sini.",
  "item list",
  "teks placeholder",
  "teks area",
];

export function getOfflineCodeValidation(
  html: string,
  rules: Json[],
): CodeValidation {
  const htmlLower = html.toLowerCase();
  const missingElements: string[] = [];
  const nestingErrors: string[] = [];
  const contentErrors: string[] = [];

  if (DEFAULT_PLACEHOLDERS.some((p) => htmlLower.includes(p))) {
    contentErrors.push(
      'isi teks contoh (misalnya "Judul Baru") masih belum kamu ganti dengan isi yang sesuai misi',
    );
  }

  for (const rule of rules) {
    const rType = rule["type"];
    if (rType === "exists") {
      const selector = String(rule["selector"] ?? "");
      if (!htmlLower.includes(`<${selector}`) && selector !== "body") {
        missingElements.push(`<${selector}>`);
      } else if (selector === "body" && !htmlLower.includes("<body>")) {
        missingElements.push("<body>");
      }
    } else if (rType === "child_of") {
      const child = String(rule["child"] ?? "");
      const parent = String(rule["parent"] ?? "");
      if (htmlLower.includes(`<${child}`) && htmlLower.includes(`<${parent}`)) {
        // ponytail: cek nesting offline berbasis posisi string (kasar tapi cukup)
        const childIdx = htmlLower.indexOf(`<${child}`);
        const parentIdx = htmlLower.indexOf(`<${parent}`);
        const parentEndIdx = htmlLower.indexOf(`</${parent}>`);
        if (childIdx < parentIdx || (parentEndIdx !== -1 && childIdx > parentEndIdx)) {
          nestingErrors.push(`<${child}> harus diletakkan di dalam <${parent}>`);
        }
      } else {
        if (!htmlLower.includes(`<${child}`)) missingElements.push(`<${child}>`);
        if (!htmlLower.includes(`<${parent}`)) missingElements.push(`<${parent}>`);
      }
    } else if (rType === "content_match") {
      const val = String(rule["value"] ?? "").toLowerCase();
      if (!htmlLower.includes(val)) contentErrors.push(`Teks '${val}'`);
    }
  }

  const feedbackParts: string[] = [];
  if (missingElements.length) {
    feedbackParts.push(`Tambahkan elemen yang kurang: ${[...new Set(missingElements)].join(", ")}.`);
  }
  if (nestingErrors.length) {
    feedbackParts.push(`Perbaiki posisi: ${[...new Set(nestingErrors)].join(", ")}.`);
  }
  if (contentErrors.length) {
    feedbackParts.push(`Sesuaikan teks: ${[...new Set(contentErrors)].join(", ")}.`);
  }

  if (feedbackParts.length) {
    return {
      is_valid: false,
      feedback: "Karyamu hampir selesai! " + feedbackParts.join(" "),
    };
  }
  return {
    is_valid: true,
    feedback:
      "Luar biasa! Seluruh elemen pembelajaran berhasil kamu susun dengan sempurna. Pekerjaanmu sudah tepat!",
  };
}

// ---------- 4. Insight guru ----------

export async function generateTeacherInsights(classData: Json[]): Promise<Json> {
  if (!apiKey()) {
    return {
      error_heatmap: [{ name: "Elemen di luar body", percentage: 72 }],
      recommendations: "Simulated recommendation.",
    };
  }

  const prompt =
    `Data Riwayat Percobaan Kelas: ${JSON.stringify(classData)}\n\n` +
    "Sebagai Asisten Guru WebCraft, analisis data kesalahan kode HTML/CSS siswa kelas ini.\n" +
    "Identifikasi 3 kesalahan paling umum yang dilakukan siswa dan berikan 1 paragraf rekomendasi pedagogis untuk guru.\n" +
    'Kembalikan sebagai JSON: {"error_heatmap": [{"name": "Nama Error", "percentage": 80}], "recommendations": "Saran untuk guru..."}';

  try {
    const res = await callGemini(prompt, "", "json");
    return JSON.parse(res) as Json;
  } catch {
    return {
      error_heatmap: [],
      recommendations: "Terjadi kesalahan saat memuat insight.",
    };
  }
}

// ---------- 5. Analisis sesi CT (post-coding) ----------

export type CtSessionAnalysis = {
  decomposition: number;
  pattern_recognition: number;
  abstraction: number;
  algorithm_design: number;
  narrative: string;
  recommendations: string[];
};

export async function analyzeCtSession(
  attemptHistory: Json[],
  ctJourney: Json,
  reflection: Json,
): Promise<CtSessionAnalysis> {
  if (!apiKey()) {
    const attempts = attemptHistory.length;
    const decompLen = String(ctJourney["decomposition"] ?? "").length;
    const patternLen = String(ctJourney["pattern"] ?? "").length;
    const algorithmLen = String(ctJourney["algorithm"] ?? "").length;

    const decompScore = 80 + Math.min(10, Math.trunc(decompLen / 5));
    const patternScore = 75 + (patternLen > 10 ? 10 : 0);
    const abstractionScore = 85 - Math.min(15, Math.max(0, attempts - 3) * 3);
    const algorithmScore = 70 + (algorithmLen > 10 ? 15 : 0);

    return {
      decomposition: Math.min(95, decompScore),
      pattern_recognition: Math.min(95, patternScore),
      abstraction: Math.max(60, abstractionScore),
      algorithm_design: Math.min(95, algorithmScore),
      narrative:
        "Siswa menunjukkan proses pemecahan masalah yang sistematis berdasarkan data lokal. Pemahaman terhadap struktur container web sangat baik, namun efisiensi coding dapat ditingkatkan dengan perencanaan algoritma yang lebih matang agar mengurangi jumlah trial-error.",
      recommendations: [
        "Latih lagi konsep nesting (elemen di dalam elemen) agar susunan tag lebih efisien.",
        "Fokuskan perhatian pada perincian langkah di tahap Algoritma sebelum mulai menyeret blok.",
      ],
    };
  }

  const prompt =
    "Sebagai Evaluator Computational Thinking (CT) untuk siswa SMP:\n" +
    `1. Histori Percobaan Coding (Attempts): ${JSON.stringify(attemptHistory)}\n` +
    `2. Jawaban CT Journey: ${JSON.stringify(ctJourney)}\n` +
    `3. Jawaban Refleksi Akhir: ${JSON.stringify(reflection)}\n\n` +
    "Nilai kecakapan Computational Thinking siswa di 4 pilar (decomposition, pattern_recognition, abstraction, algorithm_design) dengan rentang skor 60-100.\n" +
    "Berikan narasi (narrative) evaluasi dalam Bahasa Indonesia yang ramah dan mendidik, serta 2-3 rekomendasi (recommendations) langkah belajar berikutnya.\n" +
    'Kembalikan sebagai JSON dengan struktur: {"decomposition": 85, "pattern_recognition": 80, "abstraction": 75, "algorithm_design": 90, "narrative": "...", "recommendations": ["..."]}';

  try {
    const res = await callGemini(prompt, "", "json");
    return JSON.parse(res) as CtSessionAnalysis;
  } catch (err) {
    console.error("Gemini API error in CT Session analysis:", err);
    return {
      decomposition: 85,
      pattern_recognition: 80,
      abstraction: 85,
      algorithm_design: 82,
      narrative:
        "Terjadi kesalahan koneksi Gemini. Analisis fallback: Siswa secara umum memahami struktur dekomposisi dan algoritma dasar.",
      recommendations: [
        "Tinjau kembali struktur CSS yang digunakan.",
        "Latih dekomposisi pada materi yang lebih kompleks.",
      ],
    };
  }
}

// ---------- 6. Saran skor proyek untuk guru ----------

export async function suggestProjectScore(
  ast: Json[],
  rubrik: Json[],
  challengeContext: Json,
): Promise<Json> {
  // Skor fallback dinamis mengikuti kriteria rubrik apa pun (4 pilar CT / lama).
  const fallbackScores = (): Record<string, number> =>
    rubrik.length
      ? Object.fromEntries(rubrik.map((r) => [String(r["name"] ?? "Kriteria"), 85]))
      : { Kelengkapan: 85 };

  if (!apiKey()) {
    return {
      suggested_scores: fallbackScores(),
      analysis:
        "Karya siswa memenuhi sebagian besar kriteria secara lokal. Struktur HTML tersusun rapi di dalam body dan CSS kreatif. (Mode offline: nilai saran default; guru tetap melakukan validasi manual.)",
      flags: [],
    };
  }

  // Bila rubrik memakai 4 pilar CT, sertakan deskripsi level (Tabel 5) supaya
  // AI menilai persis sesuai rubrik — objektif, bukan mengarang kriteria.
  const rubricGuide = CT_PILLARS.filter((p) =>
    rubrik.some((r) => String(r["name"]) === p.label),
  )
    .map(
      (p) =>
        `- ${p.label}: ` +
        p.levels.map((l) => `Level ${l.level} = ${l.desc}`).join(" "),
    )
    .join("\n");

  const prompt =
    `Tantangan Proyek: ${JSON.stringify(challengeContext)}\n` +
    `Karya Siswa (AST): ${JSON.stringify(ast)}\n` +
    `Rubrik Penilaian: ${JSON.stringify(rubrik)}\n` +
    (rubricGuide
      ? `\nAcuan kriteria (skala level 1-4 → skor: 4=90-100, 3=75-89, 2=60-74, 1=<60):\n${rubricGuide}\n`
      : "") +
    "\nAnalisis karya siswa tersebut dan rekomendasikan skor 0-100 untuk SETIAP kriteria rubrik sesuai acuan level di atas.\n" +
    "Tulis analisis evaluasi naratif singkat (analysis) dalam Bahasa Indonesia serta sebutkan bendera peringatan (flags) jika ada kode mencurigakan / salah nesting.\n" +
    'Kembalikan sebagai JSON: {"suggested_scores": {"Nama Kriteria": 90}, "analysis": "...", "flags": ["..."]}';

  try {
    const res = await callGemini(prompt, "", "json");
    return JSON.parse(res) as Json;
  } catch (err) {
    console.error("Gemini API error in project scoring:", err);
    return {
      suggested_scores: rubrik.length
        ? Object.fromEntries(
            rubrik.map((r) => [String(r["name"] ?? "Kriteria"), 85]),
          )
        : { Kelengkapan: 85 },
      analysis:
        "Gagal menghubungi Gemini API, menggunakan saran penilaian fallback default.",
      flags: [],
    };
  }
}
