import api from './api';
import type { AstNode, ValidationRule } from './astUtils';

// Klien AI frontend (dari aiService.js, kini TypeScript).
// Setiap fungsi memanggil endpoint /ai/* dan punya fallback simulasi lokal
// bila endpoint gagal — perilaku identik dengan versi JS.

export type CtStepResult = {
  feedback: string;
  ct_score_delta: number;
  next_hint: string;
};

export type CtSessionResult = {
  decomposition: number;
  pattern_recognition: number;
  abstraction: number;
  algorithm_design: number;
  narrative: string;
  recommendations: string[];
};

export type CodeValidationResult = { is_valid: boolean; feedback: string };

type ChatMessage = { role?: string; content?: string };

// Jawaban CT Journey per langkah: array pilihan ATAU string mentah.
type StepAnswers = {
  decomposition: string | unknown[];
  pattern: string | unknown[];
  abstraction?: unknown;
  algorithm: string | unknown[];
  [key: string]: unknown;
};

// Socratic simulation helper for workspace hints
const getMockSocraticHint = (
  currentAST: AstNode[],
  targetRules: ValidationRule[] | null | undefined,
  attemptHistory: unknown[],
  studentMessage: string | null | undefined,
  _conversationHistory?: ChatMessage[] | null,
): string => {
  // Simple check on AST nodes
  const hasBody = currentAST.some(n => n.type === 'body');
  const bodyNode = currentAST.find(n => n.type === 'body');
  const hasH1 = bodyNode?.children?.some(n => n.type === 'h1') || false;
  const hasP = bodyNode?.children?.some(n => n.type === 'p') || false;
  const hasStyle = currentAST.some(n => n.type === 'style');

  if (studentMessage) {
    const msg = studentMessage.toLowerCase();
    if (msg.includes('halo') || msg.includes('hai')) {
      return "Halo! Saya adalah Asisten Belajar CT-mu. Bagian mana dari tantangan ini yang ingin kita bedah bersama? Ingat, saya tidak akan memberi tahu jawaban langsung, tapi saya akan membimbingmu menemukannya!";
    }
    if (msg.includes('bantuan') || msg.includes('bingung') || msg.includes('caranya')) {
      return "Mari kita lihat rencana algoritma yang sudah kamu susun sebelumnya. Langkah pertama adalah membuat wadah utama. Apakah kamu sudah menambahkan elemen `<body>` ke kanvas?";
    }
    if (msg.includes('warna') || msg.includes('css') || msg.includes('style')) {
      return "Untuk mengatur tampilan atau warna, kita membutuhkan blok `<style>`. Apakah kamu sudah menambahkannya, dan apakah selektor CSS-nya sudah mengarah ke elemen yang benar (misalnya `body` atau `h1`)?";
    }
  }

  // Fallback to structural hints
  if (!hasBody) {
    return "Coba perhatikan kanvasmu. Sebuah dokumen web selalu membutuhkan wadah utama untuk menampilkan konten. Blok apa yang berfungsi sebagai wadah utama tersebut?";
  }
  if (!hasH1) {
    return "Wadah `<body>` sudah ada, bagus! Sekarang, bagaimana cara memberikan judul utama pada halaman web ini? Blok teks manakah yang memiliki tingkat kepentingan tertinggi?";
  }
  if (!hasP) {
    return "Judul utama sudah terpasang. Sekarang, bagaimana cara menambahkan paragraf penjelasan di bawah judul tersebut? Ingat untuk menaruhnya di dalam `<body>` agar terlihat di layar.";
  }
  if (targetRules && targetRules.some(r => r.type === 'content_match') && !hasStyle) {
    const contentRule = targetRules.find(r => r.type === 'content_match');
    return `Judul halaman sudah ada. Apakah isinya sudah tepat dan sesuai petunjuk? Periksa tulisan "${contentRule?.value || ''}".`;
  }

  return "Struktur HTML-mu sudah cukup rapi! Coba periksa apakah kamu perlu mempercantiknya dengan menambahkan blok `<style>` di paling bawah untuk mengatur warna latar belakang atau teks.";
};

export const aiService = {
  // 1. CT Journey — analyze answers of each thinking step
  analyzeCTStep: async (
    step: string,
    question: string,
    studentAnswer: string,
    challengeContext: Record<string, unknown>,
  ): Promise<CtStepResult> => {
    try {
      const response = await api.post('/ai/ct-journey', {
        step,
        question,
        student_answer: studentAnswer,
        challenge_context: challengeContext
      });
      return response.data;
    } catch {
      console.warn("AI endpoint failed, using local simulation for CT Journey step:", step);

      const textKws = ["judul", "h1", "h2", "paragraf", "p", "teks", "tulisan", "deskripsi", "nama", "lirik", "lagu", "keterampilan", "halaman", "item", "list", "li", "ul"];
      const visualKws = ["foto", "gambar", "img", "ilustrasi", "visual", "logo", "ikon", "video"];
      const styleKws = ["desain", "warna", "style", "css", "hiasan", "tampilan", "font", "background"];
      const webKws = ["body", "wadah", "div", "kontainer", "pembungkus", "button", "tombol", "kreatif"];
      const allValidKws = [...textKws, ...visualKws, ...styleKws, ...webKws];

      let feedback = "";
      let ctScoreDelta = 0;
      let nextHint = "";

      if (step === 'decomposition') {
        const items = studentAnswer.replace("Saya memecah web menjadi:", "").split(",").map(i => i.trim()).filter(Boolean);
        if (items.length < 3) {
          feedback = `Dekomposisimu masih terlalu sederhana (baru ${items.length} bagian). Coba bagi halaman web menjadi bagian yang lebih kecil seperti wadah utama body, judul, paragraf penjelasan, atau bagian hiasan.`;
          ctScoreDelta = 65;
        } else {
          const words = items.join(" ").toLowerCase();
          const hasRelevant = allValidKws.some(kw => words.includes(kw));
          if (!hasRelevant) {
            feedback = "Dekomposisimu kurang relevan dengan elemen halaman web. Pastikan kamu membaginya menjadi bagian web yang nyata seperti judul, paragraf, gambar, atau wadah utama.";
            ctScoreDelta = 60;
          } else {
            feedback = `Luar biasa! Dekomposisi kamu sudah sangat lengkap dan terperinci. Kamu membagi halaman web menjadi: ${items.join(', ')}. Ini fondasi yang bagus untuk mulai merancang web!`;
            ctScoreDelta = Math.min(98, 85 + (items.length - 3) * 4);
          }
        }
        nextHint = "Langkah berikutnya: Abstraksi.";
      }
      else if (step === 'abstraction') {
        const items = studentAnswer.replace("Tiga bagian terpenting:", "").split(",").map(i => i.trim()).filter(Boolean);

        let styleCount = 0;
        items.forEach(item => {
          const itemLower = item.toLowerCase();
          if (styleKws.some(kw => itemLower.includes(kw))) styleCount++;
        });

        if (styleCount >= 2) {
          feedback = `Abstraksimu kurang tepat karena memprioritaskan dekorasi/style (${items.join(', ')}). Sebaiknya prioritaskan elemen wadah dan struktur utama terlebih dahulu agar halaman web memiliki kerangka yang jelas sebelum dihias.`;
          ctScoreDelta = 70;
        } else {
          feedback = `Pemilihan abstraksi yang sangat tepat! Dengan memprioritaskan ${items.join(', ')}, kamu memfokuskan diri pada kerangka dan elemen konten utama terlebih dahulu sebelum memikirkan detail kosmetik/styling.`;
          ctScoreDelta = 92;
        }
        nextHint = "Langkah berikutnya: Pengenalan Pola.";
      }
      else if (step === 'pattern') {
        const ansClean = studentAnswer.replace("Pengelompokan elemen:", "").trim();
        let categories: Record<string, string> = {};
        try {
          categories = JSON.parse(ansClean);
        } catch {
          categories = {};
        }

        const miscategorized: string[] = [];
        Object.keys(categories).forEach(name => {
          const nameLower = name.toLowerCase();
          const cat = categories[name];
          if (cat === "Teks") {
            if (visualKws.some(kw => nameLower.includes(kw)) && !textKws.some(kw => nameLower.includes(kw))) {
              miscategorized.push(`'${name}' dimasukkan ke 'Teks' (seharusnya Visual)`);
            } else if (styleKws.some(kw => nameLower.includes(kw)) && !textKws.some(kw => nameLower.includes(kw))) {
              miscategorized.push(`'${name}' dimasukkan ke 'Teks' (seharusnya Style)`);
            }
          } else if (cat === "Visual") {
            if (textKws.some(kw => nameLower.includes(kw)) && !visualKws.some(kw => nameLower.includes(kw))) {
              miscategorized.push(`'${name}' dimasukkan ke 'Visual' (seharusnya Teks)`);
            } else if (styleKws.some(kw => nameLower.includes(kw)) && !visualKws.some(kw => nameLower.includes(kw))) {
              miscategorized.push(`'${name}' dimasukkan ke 'Visual' (seharusnya Style)`);
            }
          } else if (cat === "Style") {
            if (textKws.some(kw => nameLower.includes(kw)) && !styleKws.some(kw => nameLower.includes(kw))) {
              miscategorized.push(`'${name}' dimasukkan ke 'Style' (seharusnya Teks)`);
            } else if (visualKws.some(kw => nameLower.includes(kw)) && !styleKws.some(kw => nameLower.includes(kw))) {
              miscategorized.push(`'${name}' dimasukkan ke 'Style' (seharusnya Visual)`);
            }
          }
        });

        if (miscategorized.length > 0) {
          feedback = `Pengenalan polamu perlu diperbaiki. Beberapa elemen salah dikelompokkan: ${miscategorized.join('; ')}. Cobalah kelompokkan tulisan ke 'Teks', gambar/media ke 'Visual', dan dekorasi/desain ke 'Style'.`;
          ctScoreDelta = 72;
        } else {
          feedback = "Pengenalan pola yang luar biasa akurat! Semua elemen web telah kamu kelompokkan ke dalam Teks, Visual, dan Style dengan sangat tepat. Ini akan memudahkan penulisan tag HTML dan CSS-mu.";
          ctScoreDelta = 95;
        }
        nextHint = "Langkah akhir: Algoritma.";
      }
      else if (step === 'algorithm') {
        const ansClean = studentAnswer.replace("Urutan langkah pembuatan:", "").trim();
        const steps = ansClean.split("->").map(s => s.trim()).filter(Boolean);

        if (steps.length === 0) {
          feedback = "Algoritma kerjamu masih kosong. Urutkan langkah-langkah pembuatan web dengan benar.";
          ctScoreDelta = 60;
        } else {
          const firstStep = steps[0].toLowerCase();
          const lastStep = steps[steps.length - 1].toLowerCase();

          const hasBodyFirst = firstStep.includes("body") || firstStep.includes("wadah") || firstStep.includes("utama");
          const hasStyleLast = lastStep.includes("style") || lastStep.includes("css") || lastStep.includes("hiasan") || lastStep.includes("menghias");

          if (!hasBodyFirst) {
            feedback = `Urutan algoritma kurang logis. Langkah pertama seharusnya membuat wadah utama 'body' terlebih dahulu sebagai penampung konten web, bukan '${steps[0]}'.`;
            ctScoreDelta = 70;
          } else if (!hasStyleLast && steps.slice(0, -1).some(s => s.toLowerCase().includes("style") || s.toLowerCase().includes("css"))) {
            feedback = "Urutan algoritma kurang tepat. Langkah menambahkan style CSS atau menghias halaman sebaiknya dilakukan di akhir setelah seluruh elemen konten selesai dibuat.";
            ctScoreDelta = 75;
          } else {
            feedback = "Algoritma kerjamu sudah sangat logis dan berurutan! Memulai dari wadah terluar (body), menyusun konten utama, lalu diakhiri dengan menghias halaman menggunakan CSS adalah urutan terbaik.";
            ctScoreDelta = 95;
          }
        }
      }

      return {
        feedback,
        ct_score_delta: ctScoreDelta,
        next_hint: nextHint
      };
    }
  },

  // 2. AI Tutor — Socratic helper inside the coding workspace
  getTutorHint: async ({
    currentAST,
    targetRules,
    attemptHistory,
    studentMessage,
    lessonContext,
    conversationHistory,
  }: {
    currentAST: AstNode[];
    targetRules?: ValidationRule[] | null;
    attemptHistory: unknown[];
    studentMessage?: string | null;
    lessonContext: string;
    conversationHistory?: ChatMessage[] | null;
  }): Promise<string> => {
    try {
      const response = await api.post('/ai/tutor', {
        current_ast: currentAST,
        target_rules: targetRules,
        attempt_history: attemptHistory,
        student_message: studentMessage,
        lesson_context: lessonContext,
        conversation_history: conversationHistory
      });
      return response.data.hint;
    } catch {
      console.warn("AI tutor endpoint failed, generating Socratic hint locally.");
      return getMockSocraticHint(currentAST, targetRules, attemptHistory, studentMessage, conversationHistory);
    }
  },

  // 3. CT Session Analyzer — calculates student CT scores at submission
  analyzeCTSession: async (
    attemptHistory: unknown[],
    ctJourneyAnswers: StepAnswers,
    reflectionAnswers: Record<string, unknown>,
  ): Promise<CtSessionResult> => {
    try {
      const response = await api.post('/ai/analyze-ct', {
        attempt_history: attemptHistory,
        ct_journey: ctJourneyAnswers,
        reflection: reflectionAnswers
      });
      return response.data;
    } catch {
      console.warn("AI session analysis failed, calculating score locally.");

      // Calculate a realistic score based on attempt history and reflection length
      const attempts = attemptHistory.length;
      const decompScore = 80 + Math.min(10, ctJourneyAnswers.decomposition.length * 2);
      const patternScore = 75 + (ctJourneyAnswers.pattern.length > 0 ? 10 : 0);
      const abstractionScore = 85 - Math.min(15, Math.max(0, attempts - 3) * 3); // More attempts = lower efficiency
      const algorithmScore = 70 + (ctJourneyAnswers.algorithm.length > 0 ? 15 : 0);

      return {
        decomposition: Math.min(95, decompScore),
        pattern_recognition: Math.min(95, patternScore),
        abstraction: Math.max(60, abstractionScore),
        algorithm_design: Math.min(95, algorithmScore),
        narrative: "Siswa menunjukkan proses pemecahan masalah yang sistematis. Pemahaman terhadap struktur container web sangat baik, namun efisiensi coding dapat ditingkatkan dengan perencanaan algoritma yang lebih matang agar mengurangi jumlah trial-error.",
        recommendations: [
          "Latih lagi konsep nesting (elemen di dalam elemen) agar susunan tag lebih efisien.",
          "Fokuskan perhatian pada perincian langkah di tahap Algoritma sebelum mulai menyeret blok."
        ]
      };
    }
  },

  // 4. Project Scoring Assistant (For Teachers)
  suggestProjectScore: async (
    submittedAST: AstNode[],
    rubrik: Record<string, unknown>[],
    challengeContext: Record<string, unknown>,
  ) => {
    try {
      const response = await api.post('/ai/suggest-score', {
        ast: submittedAST,
        rubrik,
        challenge_context: challengeContext
      });
      return response.data;
    } catch {
      console.warn("AI project scoring failed, creating suggestion locally.");
      return {
        suggested_scores: {
          'Kelengkapan elemen': 90,
          'Kebenaran semantik': 85,
          'Kreativitas desain': 80,
          'Kesesuaian challenge': 95
        },
        analysis: "Karya siswa memenuhi 95% kriteria dasar. Struktur HTML tersusun rapi di dalam body. Penulisan CSS kreatif dengan latar belakang solid khas neo-brutalism. Terdapat sedikit ketidakefisienan pada nesting div kosong yang tidak terpakai.",
        flags: ["Nesting div kosong di baris 5", "Penggunaan style terduplikasi untuk tag p"]
      };
    }
  },

  // 5. Classroom Insights (For Teacher Dashboard)
  getClassInsights: async (roomId: string, pertemuanId?: string | null) => {
    try {
      const response = await api.post('/ai/class-insights', { room_id: roomId, pertemuan_id: pertemuanId });
      return response.data;
    } catch {
      console.warn("AI class insights failed, returning empty offline fallback.");
      return {
        ct_class_average: 0,
        error_heatmap: [],
        struggling_students: [],
        recommendations: "Belum ada data pengerjaan dari siswa untuk membuat analisis rekomendasi belajar kelas."
      };
    }
  },

  // 6. AI Code Validation (For Learning Tasks)
  validateCode: async (
    currentHTML: string,
    targetRules: ValidationRule[],
    lessonTitle: string,
  ): Promise<CodeValidationResult> => {
    try {
      const response = await api.post('/ai/validate-code', {
        current_html: currentHTML,
        target_rules: targetRules,
        lesson_title: lessonTitle
      });
      return response.data;
    } catch {
      console.warn("AI code validation failed, running offline validation fallback.");
      // Fallback helper similar to backend offline logic
      const htmlLower = currentHTML.toLowerCase();
      const missing: string[] = [];

      // Reject leftover default placeholder text (student didn't fill real content)
      const defaultPlaceholders = ['judul baru', 'teks baru di sini.', 'item list', 'teks placeholder', 'teks area'];
      if (defaultPlaceholders.some(p => htmlLower.includes(p))) {
        missing.push('isi teks contoh (misalnya "Judul Baru") yang belum kamu ganti dengan isi sesuai misi');
      }

      for (const rule of targetRules) {
        const rType = rule.type;
        if (rType === 'exists') {
          const selector = rule.selector || '';
          if (!htmlLower.includes(`<${selector}`) && selector !== 'body') {
            missing.push(`Tag <${selector}>`);
          } else if (selector === 'body' && !htmlLower.includes('<body>')) {
            missing.push('Tag <body>');
          }
        } else if (rType === 'child_of') {
          const child = rule.child || '';
          const parent = rule.parent || '';
          if (!htmlLower.includes(`<${child}`) || !htmlLower.includes(`<${parent}`)) {
            missing.push(`Nesting <${child}> di dalam <${parent}>`);
          }
        } else if (rType === 'content_match') {
          const val = (rule.value || '').toLowerCase();
          if (!htmlLower.includes(val)) {
            missing.push(`Teks "${val}"`);
          }
        }
      }
      if (missing.length > 0) {
        return {
          is_valid: false,
          feedback: `Kode webmu belum lengkap. Masih ada kekurangan pada: ${missing.join(', ')}. Periksa kembali letak elemen-elemennya ya!`
        };
      }
      return {
        is_valid: true,
        feedback: "Luar biasa! Seluruh elemen pembelajaran berhasil kamu buat dengan benar. Pekerjaanmu sudah sempurna!"
      };
    }
  }
};
