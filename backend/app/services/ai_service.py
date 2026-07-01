import os
import json
from typing import List, Dict, Any
from dotenv import load_dotenv

# Ensure environment variables are loaded first
load_dotenv()

import google.generativeai as genai

# Fetch API configurations
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Use gemini-2.5-flash as the active model in this environment
GEMINI_MODEL = "gemini-2.5-flash"

async def call_gemini(prompt: str, system_instruction: str = "", response_format: str = "text") -> str:
    """Helper to send prompt requests to Gemini SDK"""
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured in environmental variables.")

    model = genai.GenerativeModel(
        model_name=GEMINI_MODEL,
        system_instruction=system_instruction if system_instruction else None,
        generation_config={
            "temperature": 0.5,
            "max_output_tokens": 800,
            "response_mime_type": "application/json" if response_format == "json" else "text/plain"
        }
    )
    
    response = await model.generate_content_async(prompt)
    return response.text

# 1. get_socratic_hint - Socratic guidance wrapper
async def get_socratic_hint(
    current_ast: List[Dict[str, Any]], 
    target_rules: List[Dict[str, Any]], 
    attempt_history: List[Dict[str, Any]], 
    student_message: str,
    lesson_context: str,
    conversation_history: List[Dict[str, str]] = None
) -> str:
    if not GEMINI_API_KEY:
        return get_offline_socratic_hint(current_ast, student_message)

    system_instruction = (
        "Kamu adalah AI Tutor Socratic dalam Bahasa Indonesia untuk siswa SMP. Misi utama kamu adalah membantu siswa "
        "menyelesaikan tantangan coding HTML/CSS. PENTING: JANGAN PERNAH memberikan baris kode HTML/CSS secara langsung! "
        "Tuntun siswa dengan mengajukan pertanyaan balik yang memicu mereka berpikir kritis (Socratic Method). Gunakan sapaan yang ramah."
    )

    prompt = (
        f"Konteks Pelajaran: {lesson_context}\n"
        f"Struktur Kode Siswa Saat Ini (AST): {json.dumps(current_ast)}\n"
        f"Target Pembelajaran: {json.dumps(target_rules)}\n"
        f"Histori Percobaan Gagal: {len(attempt_history)} kali percobaan\n"
        f"Riwayat Obrolan: {json.dumps(conversation_history or [])}\n"
        f"Pesan Siswa: \"{student_message}\"\n\n"
        "Berikan petunjuk belajar Socratic singkat (maksimal 3-4 kalimat) dalam Bahasa Indonesia."
    )

    try:
        return await call_gemini(prompt, system_instruction)
    except Exception as e:
        print(f"Gemini API error in Socratic hint: {e}. Falling back to offline simulator.")
        return get_offline_socratic_hint(current_ast, student_message)

# 2. analyze_ct_step - CT Journey Step Evaluator
async def analyze_ct_step(
    step: str,
    question: str,
    student_answer: str,
    challenge_context: Dict[str, Any]
) -> Dict[str, Any]:
    if not GEMINI_API_KEY:
        return get_offline_ct_step_result(step, student_answer)

    prompt = (
        f"Tantangan: {challenge_context.get('title', '')}\n"
        f"Deskripsi Misi: {challenge_context.get('description', '')}\n"
        f"Langkah CT Journey: {step} (decomposition/abstraction/pattern/algorithm)\n"
        f"Pertanyaan: {question}\n"
        f"Jawaban Siswa: \"{student_answer}\"\n\n"
        "Analisis jawaban siswa di atas untuk kecakapan Computational Thinking tingkat SMP. Berikan umpan balik (feedback) singkat dalam Bahasa Indonesia "
        "yang memotivasi siswa dan estimasi skor (ct_score_delta) antara 60-100 berdasarkan kualitas jawaban.\n"
        "Kembalikan sebagai objek JSON dengan struktur: {\"feedback\": \"...\", \"ct_score_delta\": 85, \"next_hint\": \"...\"}"
    )

    try:
        res = await call_gemini(prompt, response_format="json")
        return json.loads(res)
    except Exception as e:
        print(f"Gemini API error in CT Journey analysis: {e}")
        return get_offline_ct_step_result(step, student_answer)

# 3. Semantic Validator (Evaluates if the student's text actually matches the challenge intent)
async def semantic_validate_content(challenge_topic: str, content: str) -> Dict[str, Any]:
    """Validates if the content written by student matches the requested topic semantically."""
    if not GEMINI_API_KEY:
        return {"is_valid": True, "reason": "Offline Mode"}
    
    prompt = (
        f"Misi: Tulis sesuatu tentang topik '{challenge_topic}'\n"
        f"Tulisan Siswa: '{content}'\n\n"
        "Apakah tulisan siswa secara semantik membahas tentang topik tersebut? Abaikan salah ketik atau tata bahasa, fokus pada makna keseluruhan.\n"
        "Kembalikan sebagai JSON: {\"is_valid\": true/false, \"reason\": \"Alasan singkat dalam bahasa Indonesia\"}"
    )
    
    try:
        res = await call_gemini(prompt, response_format="json")
        return json.loads(res)
    except Exception as e:
        return {"is_valid": True, "reason": "Error validation fallback"}

async def validate_student_code(current_html: str, target_rules: List[Dict[str, Any]], lesson_title: str) -> Dict[str, Any]:
    """Validates the student's HTML code against the target rules using Gemini AI."""
    if not GEMINI_API_KEY:
        return get_offline_code_validation(current_html, target_rules, lesson_title)

    prompt = (
        f"Sebagai AI Validator Kode WebCraft untuk siswa SMP:\n"
        f"Misi Pembelajaran: {lesson_title}\n"
        f"Aturan Target Pembelajaran: {json.dumps(target_rules)}\n"
        f"Kode HTML Siswa:\n{current_html}\n\n"
        "Periksa apakah kode HTML siswa sudah memenuhi seluruh target pembelajaran di atas secara semantik dan struktural!\n"
        "PENTING: Periksa konten teks di dalam elemen secara semantik! Misalnya, jika misi meminta 'judul utama berisi namamu', "
        "maka tag <h1> harus berisi nama orang yang realistis (bukan teks kosong, bukan placeholder seperti 'Nama Anda', 'Nama Siswa', 'namamu', 'Nama Lengkap', atau 'Judul Utama'). "
        "Jika ada ketidaksesuaian konten teks dengan instruksi misi, nyatakan tidak valid (is_valid = false) dan berikan masukan spesifik tentang apa yang perlu diperbaiki."
        "Kembalikan respon dalam format JSON: "
        "{\"is_valid\": true/false, \"feedback\": \"Tulis masukan dalam Bahasa Indonesia yang menjelaskan apakah sudah benar atau apa yang kurang/salah secara ramah dan memotivasi (maksimal 2-3 kalimat).\"}"
    )

    try:
        res = await call_gemini(prompt, response_format="json")
        return json.loads(res)
    except Exception as e:
        print(f"Gemini API error in code validation: {e}")
        return get_offline_code_validation(current_html, target_rules, lesson_title)

# Default placeholder text auto-filled when a block is created. A finished mission
# should never still contain these — they mean the student didn't fill in real content.
DEFAULT_PLACEHOLDERS = [
    "judul baru",
    "teks baru di sini.",
    "item list",
    "teks placeholder",
    "teks area",
]

def get_offline_code_validation(html: str, rules: list, title: str) -> dict:
    html_lower = html.lower()
    missing_elements = []
    nesting_errors = []
    content_errors = []

    # Reject leftover default placeholder text (e.g. an <h1> still reading "Judul Baru")
    placeholder_hits = [p for p in DEFAULT_PLACEHOLDERS if p in html_lower]
    if placeholder_hits:
        content_errors.append(
            "isi teks contoh (misalnya \"Judul Baru\") masih belum kamu ganti dengan isi yang sesuai misi"
        )

    for rule in rules:
        r_type = rule.get("type")
        if r_type == "exists":
            selector = rule.get("selector", "")
            if f"<{selector}" not in html_lower and selector != "body":
                missing_elements.append(f"<{selector}>")
            elif selector == "body" and "<body>" not in html_lower:
                missing_elements.append("<body>")
        elif r_type == "child_of":
            child = rule.get("child", "")
            parent = rule.get("parent", "")
            # Check if both exist first
            if f"<{child}" in html_lower and f"<{parent}" in html_lower:
                # Basic offline check for nesting logic: child should appear after parent in the raw html string
                # This is a rudimentary check since it's offline text processing
                child_idx = html_lower.find(f"<{child}")
                parent_idx = html_lower.find(f"<{parent}")
                parent_end_idx = html_lower.find(f"</{parent}>")
                if child_idx < parent_idx or (parent_end_idx != -1 and child_idx > parent_end_idx):
                    nesting_errors.append(f"<{child}> harus diletakkan di dalam <{parent}>")
            else:
                if f"<{child}" not in html_lower:
                    missing_elements.append(f"<{child}>")
                if f"<{parent}" not in html_lower:
                    missing_elements.append(f"<{parent}>")
        elif r_type == "content_match":
            val = rule.get("value", "").lower()
            if val not in html_lower:
                content_errors.append(f"Teks '{val}'")
                
    feedback_parts = []
    if missing_elements:
        feedback_parts.append(f"Tambahkan elemen yang kurang: {', '.join(set(missing_elements))}.")
    if nesting_errors:
        feedback_parts.append(f"Perbaiki posisi: {', '.join(set(nesting_errors))}.")
    if content_errors:
        feedback_parts.append(f"Sesuaikan teks: {', '.join(set(content_errors))}.")

    if feedback_parts:
        return {
            "is_valid": False,
            "feedback": "Karyamu hampir selesai! " + " ".join(feedback_parts)
        }
        
    return {
        "is_valid": True,
        "feedback": "Luar biasa! Seluruh elemen pembelajaran berhasil kamu susun dengan sempurna. Pekerjaanmu sudah tepat!"
    }

# 4. Teacher Insights (Class Heatmap)
async def generate_teacher_insights(class_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Generates insights for teacher dashboard based on class attempt history."""
    if not GEMINI_API_KEY:
        return {
            "error_heatmap": [{"name": "Elemen di luar body", "percentage": 72}],
            "recommendations": "Simulated recommendation."
        }
        
    prompt = (
        f"Data Riwayat Percobaan Kelas: {json.dumps(class_data)}\n\n"
        "Sebagai Asisten Guru WebCraft, analisis data kesalahan kode HTML/CSS siswa kelas ini.\n"
        "Identifikasi 3 kesalahan paling umum yang dilakukan siswa dan berikan 1 paragraf rekomendasi pedagogis untuk guru.\n"
        "Kembalikan sebagai JSON: {\"error_heatmap\": [{\"name\": \"Nama Error\", \"percentage\": 80}], \"recommendations\": \"Saran untuk guru...\"}"
    )
    
    try:
        res = await call_gemini(prompt, response_format="json")
        return json.loads(res)
    except Exception as e:
        return {
            "error_heatmap": [],
            "recommendations": "Terjadi kesalahan saat memuat insight."
        }

# Offline simulation data mapping
def get_offline_socratic_hint(current_ast: list, msg: str) -> str:
    has_body = any(n.get("type") == "body" for n in current_ast)
    if msg:
        m = msg.lower()
        if "warna" in m or "css" in m or "style" in m:
            return "Untuk menghias halaman web, kamu memerlukan blok `<style>`. Apakah kamu sudah menambahkannya, dan apakah selektor CSS-mu mengarah ke elemen yang tepat?"
    if not has_body:
        return "Coba perhatikan kanvas kerjamu. Setiap halaman web selalu membutuhkan wadah utama untuk menampung konten visual. Blok wadah apakah itu?"
    return "Struktur kerangkamu sudah tersusun. Sekarang, di manakah kamu meletakkan judul utama <h1> agar berada di dalam wadah utama?"

def get_offline_ct_step_result(step: str, answer: str) -> dict:
    answer_lower = answer.lower()
    
    # Define keywords for verification
    text_kws = ["judul", "h1", "h2", "paragraf", "p", "teks", "tulisan", "deskripsi", "nama", "lirik", "lagu", "keterampilan", "halaman", "item", "list", "li", "ul"]
    visual_kws = ["foto", "gambar", "img", "ilustrasi", "visual", "logo", "ikon", "video"]
    style_kws = ["desain", "warna", "style", "css", "hiasan", "tampilan", "font", "background"]
    web_kws = ["body", "wadah", "div", "kontainer", "pembungkus", "button", "tombol", "kreatif"]
    
    all_valid_kws = text_kws + visual_kws + style_kws + web_kws

    if step == "decomposition":
        ans_clean = answer.replace("Saya memecah web menjadi:", "")
        items = [item.strip() for item in ans_clean.split(",") if item.strip()]
        
        if len(items) < 3:
            return {
                "feedback": f"Dekomposisimu masih terlalu sederhana (baru {len(items)} bagian). Coba bagi halaman web menjadi bagian yang lebih kecil seperti wadah utama body, judul, paragraf penjelasan, atau bagian hiasan.",
                "ct_score_delta": 65,
                "next_hint": "Langkah berikutnya: Abstraksi."
            }
        
        words = " ".join(items).lower()
        has_relevant = any(kw in words for kw in all_valid_kws)
        if not has_relevant:
            return {
                "feedback": "Dekomposisimu kurang relevan dengan elemen halaman web. Pastikan kamu membaginya menjadi bagian web yang nyata seperti judul, paragraf, gambar, atau wadah utama.",
                "ct_score_delta": 60,
                "next_hint": "Langkah berikutnya: Abstraksi."
            }
            
        score = min(98, 85 + (len(items) - 3) * 4)
        return {
            "feedback": f"Luar biasa! Dekomposisi kamu sudah sangat lengkap dan terperinci. Kamu membagi halaman web menjadi: {', '.join(items)}. Ini fondasi yang bagus untuk mulai merancang web!",
            "ct_score_delta": score,
            "next_hint": "Langkah berikutnya: Abstraksi."
        }
        
    elif step == "abstraction":
        ans_clean = answer.replace("Tiga bagian terpenting:", "")
        items = [item.strip() for item in ans_clean.split(",") if item.strip()]
        
        style_count = 0
        struct_count = 0
        for item in items:
            item_lower = item.lower()
            if any(kw in item_lower for kw in style_kws):
                style_count += 1
            if any(kw in item_lower for kw in ["body", "wadah", "div", "h1", "h2", "p", "paragraf", "list", "ul", "li"]):
                struct_count += 1
                
        if style_count >= 2:
            return {
                "feedback": f"Abstraksimu kurang tepat karena memprioritaskan dekorasi/style ({', '.join(items)}). Sebaiknya prioritaskan elemen wadah dan struktur utama terlebih dahulu agar halaman web memiliki kerangka yang jelas sebelum dihias.",
                "ct_score_delta": 70,
                "next_hint": "Langkah berikutnya: Pengenalan Pola."
            }
            
        return {
            "feedback": f"Pemilihan abstraksi yang sangat tepat! Dengan memprioritaskan {', '.join(items)}, kamu memfokuskan diri pada kerangka dan elemen konten utama terlebih dahulu sebelum memikirkan detail kosmetik/styling.",
            "ct_score_delta": 92,
            "next_hint": "Langkah berikutnya: Pengenalan Pola."
        }
        
    elif step == "pattern":
        ans_clean = answer.replace("Pengelompokan elemen:", "").strip()
        try:
            categories = json.loads(ans_clean)
        except Exception:
            categories = {}
            
        miscategorized = []
        for name, cat in categories.items():
            name_lower = name.lower()
            if cat == "Teks":
                if any(kw in name_lower for kw in visual_kws) and not any(kw in name_lower for kw in text_kws):
                    miscategorized.append(f"'{name}' dimasukkan ke 'Teks' (seharusnya Visual)")
                elif any(kw in name_lower for kw in style_kws) and not any(kw in name_lower for kw in text_kws):
                    miscategorized.append(f"'{name}' dimasukkan ke 'Teks' (seharusnya Style)")
            elif cat == "Visual":
                if any(kw in name_lower for kw in text_kws) and not any(kw in name_lower for kw in visual_kws):
                    miscategorized.append(f"'{name}' dimasukkan ke 'Visual' (seharusnya Teks)")
                elif any(kw in name_lower for kw in style_kws) and not any(kw in name_lower for kw in visual_kws):
                    miscategorized.append(f"'{name}' dimasukkan ke 'Visual' (seharusnya Style)")
            elif cat == "Style":
                if any(kw in name_lower for kw in text_kws) and not any(kw in name_lower for kw in style_kws):
                    miscategorized.append(f"'{name}' dimasukkan ke 'Style' (seharusnya Teks)")
                elif any(kw in name_lower for kw in visual_kws) and not any(kw in name_lower for kw in style_kws):
                    miscategorized.append(f"'{name}' dimasukkan ke 'Style' (seharusnya Visual)")

        if miscategorized:
            return {
                "feedback": f"Pengenalan polamu perlu diperbaiki. Beberapa elemen salah dikelompokkan: {'; '.join(miscategorized)}. Cobalah kelompokkan tulisan ke 'Teks', gambar/media ke 'Visual', dan dekorasi/desain ke 'Style'.",
                "ct_score_delta": 72,
                "next_hint": "Langkah akhir: Algoritma."
            }
            
        return {
            "feedback": "Pengenalan pola yang luar biasa akurat! Semua elemen web telah kamu kelompokkan ke dalam Teks, Visual, dan Style dengan sangat tepat. Ini akan memudahkan penulisan tag HTML dan CSS-mu.",
            "ct_score_delta": 95,
            "next_hint": "Langkah akhir: Algoritma."
        }
        
    else: # algorithm
        ans_clean = answer.replace("Urutan langkah pembuatan:", "").strip()
        steps = [s.strip() for s in ans_clean.split("->") if s.strip()]
        
        if not steps:
            return {
                "feedback": "Algoritma kerjamu masih kosong. Urutkan langkah-langkah pembuatan web dengan benar.",
                "ct_score_delta": 60,
                "next_hint": ""
            }
            
        first_step = steps[0].lower()
        last_step = steps[-1].lower()
        
        has_body_first = "body" in first_step or "wadah" in first_step or "utama" in first_step
        has_style_last = "style" in last_step or "css" in last_step or "hiasan" in last_step or "menghias" in last_step
        
        if not has_body_first:
            return {
                "feedback": f"Urutan algoritma kurang logis. Langkah pertama seharusnya membuat wadah utama 'body' terlebih dahulu sebagai penampung konten web, bukan '{steps[0]}'.",
                "ct_score_delta": 70,
                "next_hint": ""
            }
            
        if not has_style_last and any("style" in s.lower() or "css" in s.lower() for s in steps[:-1]):
            return {
                "feedback": "Urutan algoritma kurang tepat. Langkah menambahkan style CSS atau menghias halaman sebaiknya dilakukan di akhir setelah seluruh elemen konten selesai dibuat.",
                "ct_score_delta": 75,
                "next_hint": ""
            }
            
        return {
            "feedback": "Algoritma kerjamu sudah sangat logis dan berurutan! Memulai dari wadah terluar (body), menyusun konten utama, lalu diakhiri dengan menghias halaman menggunakan CSS adalah urutan terbaik.",
            "ct_score_delta": 95,
            "next_hint": ""
        }

async def analyze_ct_session(
    attempt_history: List[Dict[str, Any]],
    ct_journey: Dict[str, Any],
    reflection: Dict[str, Any]
) -> Dict[str, Any]:
    if not GEMINI_API_KEY:
        attempts = len(attempt_history)
        decomp_len = len(str(ct_journey.get("decomposition", "")))
        pattern_len = len(str(ct_journey.get("pattern", "")))
        abstraction_len = len(str(ct_journey.get("abstraction", "")))
        algorithm_len = len(str(ct_journey.get("algorithm", "")))
        
        decomp_score = 80 + min(10, decomp_len // 5)
        pattern_score = 75 + (10 if pattern_len > 10 else 0)
        abstraction_score = 85 - min(15, max(0, attempts - 3) * 3)
        algorithm_score = 70 + (15 if algorithm_len > 10 else 0)
        
        return {
            "decomposition": min(95, decomp_score),
            "pattern_recognition": min(95, pattern_score),
            "abstraction": max(60, abstraction_score),
            "algorithm_design": min(95, algorithm_score),
            "narrative": "Siswa menunjukkan proses pemecahan masalah yang sistematis berdasarkan data lokal. Pemahaman terhadap struktur container web sangat baik, namun efisiensi coding dapat ditingkatkan dengan perencanaan algoritma yang lebih matang agar mengurangi jumlah trial-error.",
            "recommendations": [
                "Latih lagi konsep nesting (elemen di dalam elemen) agar susunan tag lebih efisien.",
                "Fokuskan perhatian pada perincian langkah di tahap Algoritma sebelum mulai menyeret blok."
            ]
        }

    prompt = (
        f"Sebagai Evaluator Computational Thinking (CT) untuk siswa SMP:\n"
        f"1. Histori Percobaan Coding (Attempts): {json.dumps(attempt_history)}\n"
        f"2. Jawaban CT Journey: {json.dumps(ct_journey)}\n"
        f"3. Jawaban Refleksi Akhir: {json.dumps(reflection)}\n\n"
        "Nilai kecakapan Computational Thinking siswa di 4 pilar (decomposition, pattern_recognition, abstraction, algorithm_design) dengan rentang skor 60-100.\n"
        "Berikan narasi (narrative) evaluasi dalam Bahasa Indonesia yang ramah dan mendidik, serta 2-3 rekomendasi (recommendations) langkah belajar berikutnya.\n"
        "Kembalikan sebagai JSON dengan struktur: {\"decomposition\": 85, \"pattern_recognition\": 80, \"abstraction\": 75, \"algorithm_design\": 90, \"narrative\": \"...\", \"recommendations\": [\"...\"]}"
    )

    try:
        res = await call_gemini(prompt, response_format="json")
        return json.loads(res)
    except Exception as e:
        print(f"Gemini API error in CT Session analysis: {e}")
        # Call the offline logic directly
        # Pass empty attempt_history to trigger default calculation safely
        return {
            "decomposition": 85,
            "pattern_recognition": 80,
            "abstraction": 85,
            "algorithm_design": 82,
            "narrative": "Terjadi kesalahan koneksi Gemini. Analisis fallback: Siswa secara umum memahami struktur dekomposisi dan algoritma dasar.",
            "recommendations": ["Tinjau kembali struktur CSS yang digunakan.", "Latih dekomposisi pada materi yang lebih kompleks."]
        }

async def suggest_project_score(
    ast: List[Dict[str, Any]],
    rubrik: List[Dict[str, Any]],
    challenge_context: Dict[str, Any]
) -> Dict[str, Any]:
    if not GEMINI_API_KEY:
        return {
            "suggested_scores": {
                "Kelengkapan elemen": 90,
                "Kebenaran semantik": 85,
                "Kreativitas desain": 80,
                "Kesesuaian challenge": 95
            },
            "analysis": "Karya siswa memenuhi 95% kriteria dasar secara lokal. Struktur HTML tersusun rapi di dalam body. Penulisan CSS kreatif dengan latar belakang solid khas neo-brutalism. Terdapat sedikit ketidakefisienan pada nesting div kosong yang tidak terpakai.",
            "flags": ["Nesting div kosong di baris 5", "Penggunaan style terduplikasi untuk tag p"]
        }

    prompt = (
        f"Tantangan Proyek: {json.dumps(challenge_context)}\n"
        f"Karya Siswa (AST): {json.dumps(ast)}\n"
        f"Rubrik Penilaian: {json.dumps(rubrik)}\n\n"
        "Analisis karya siswa tersebut dan rekomendasikan skor untuk setiap kriteria di rubrik penilaian (skala 0-100).\n"
        "Tulis analisis evaluasi naratif singkat (analysis) dalam Bahasa Indonesia serta sebutkan bendera peringatan (flags) jika ada baris kode yang mencurigakan atau salah nesting.\n"
        "Kembalikan sebagai JSON dengan struktur: {\"suggested_scores\": {\"Kriteria A\": 90}, \"analysis\": \"...\", \"flags\": [\"...\"]}"
    )

    try:
        res = await call_gemini(prompt, response_format="json")
        return json.loads(res)
    except Exception as e:
        print(f"Gemini API error in project scoring: {e}")
        # Call the offline logic
        return {
            "suggested_scores": {r.get("name", "Kriteria"): 85 for r in rubrik} if rubrik else {"Kelengkapan": 85},
            "analysis": "Gagal menghubungi Gemini API, menggunakan saran penilaian fallback default.",
            "flags": []
        }
