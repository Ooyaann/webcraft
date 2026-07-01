import asyncio
import uuid
from passlib.context import CryptContext
from sqlalchemy.future import select
from app.database import AsyncSessionLocal, engine, Base
from app.models import User, Room, Pertemuan, LearningTask, ProjectTask, room_members, LearningSubmission, ProjectSubmission, GalleryItem

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed():
    async with engine.begin() as conn:
        print("Purging database...")
        await conn.run_sync(Base.metadata.drop_all)
        print("Creating tables...")
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        print("Seeding database...")
        
        # 1. Seed Users (1 Guru, 1 Siswa)
        users_to_seed = [
            {"email": "budi@guru.com", "name": "Bapak Budi", "role": "guru", "pw": "guru123"},
            {"email": "andi@siswa.com", "name": "Andi", "role": "siswa", "pw": "siswa123"}
        ]
        
        seeded_users = {}
        for u_info in users_to_seed:
            user_obj = User(
                id=str(uuid.uuid4()),
                name=u_info["name"],
                email=u_info["email"],
                password_hash=pwd_context.hash(u_info["pw"]),
                role=u_info["role"]
            )
            session.add(user_obj)
            seeded_users[u_info["role"]] = user_obj
            print(f"User seeded: {u_info['email']}")
        
        await session.flush()

        # 2. Seed Room
        guru = seeded_users["guru"]
        room_instance = Room(
            id="room_7a",
            guru_id=guru.id,
            name="Kelas 7A - SMP Negeri Semarang",
            code="IPA7A1",
            announcement="Selamat datang di WebCraft! Mari kita mulai petualangan belajar pemrograman web dan pemikiran komputasional. Selesaikan Pertemuan 1 terlebih dahulu."
        )
        session.add(room_instance)
        print("Room IPA7A1 seeded.")
        await session.flush()

        # Join Siswa Andi to the classroom Room by default
        siswa = seeded_users["siswa"]
        join_stmt = room_members.insert().values(room_id=room_instance.id, siswa_id=siswa.id)
        await session.execute(join_stmt)
        print("Student Andi joined to Room IPA7A1.")
        await session.flush()

        room_id = room_instance.id

        # 3. Seed Pertemuan 1: Kartu Profil Pribadi (Learning / Pembelajaran 1)
        p1_obj = Pertemuan(
            id="p1",
            room_id=room_id,
            urutan=1,
            judul="Pertemuan 1: Kartu Profil Pribadi",
            cbl_engage_json={
                "big_idea": "Identitas & Web",
                "essential_question": "Bagaimana merancang kartu profil pribadi yang informatif dan terstruktur?",
                "challenge": "Buatlah kartu profil pribadi sederhana. Pastikan ada wadah utama <body>, judul utama <h1> yang berisi namamu, dan sebuah paragraf <p> berisi perkenalan singkat diri.",
                "media_url": ""
            },
            guiding_questions_json=[
                "Elemen HTML apa yang berfungsi sebagai wadah utama halaman web?",
                "Bagaimana cara membuat judul teks dengan ukuran terbesar dalam HTML?"
            ],
            reflection_questions_json=[
                "Apa bagian tersulit saat merangkai susunan elemen HTML?",
                "Bagaimana Computational Thinking membantumu merancang komponen profil sebelum menulis kode?"
            ],
            materi_list_json=[
                {"title": "Pengenalan HTML Dasar PDF", "url": "https://drive.google.com/file/d/html-dasar", "type": "link"}
            ]
        )
        session.add(p1_obj)
        print("Pertemuan p1 (Kartu Profil Pribadi) seeded.")
        await session.flush()

        # Seed LearningTask easy-1 (Pembelajaran 1)
        easy1_obj = LearningTask(
            id="easy-1",
            pertemuan_id="p1",
            judul="Pertemuan 1: Kartu Profil Pribadi",
            validator_rules_json=[
                { "type": "exists", "selector": "body", "error_message": "Misi belum selesai: Kamu belum membuat wadah utama <body>!" },
                { "type": "exists", "selector": "h1", "error_message": "Misi belum selesai: Kamu belum menambahkan judul utama <h1>!" },
                { "type": "child_of", "parent": "body", "child": "h1", "error_message": "Misi belum selesai: Judul <h1> harus berada di dalam wadah <body>!" },
                { "type": "exists", "selector": "p", "error_message": "Misi belum selesai: Kamu belum menambahkan paragraf penjelasan <p>!" },
                { "type": "child_of", "parent": "body", "child": "p", "error_message": "Misi belum selesai: Paragraf <p> harus berada di dalam wadah <body>!" }
            ],
            max_attempts_before_ai_hint=4
        )
        session.add(easy1_obj)
        await session.flush()

        # 4. Seed Pertemuan 2: Galeri Musik Favorit (Learning / Pembelajaran 2)
        p2_obj = Pertemuan(
            id="p2",
            room_id=room_id,
            urutan=2,
            judul="Pertemuan 2: Galeri Musik Favorit",
            cbl_engage_json={
                "big_idea": "Seni & Struktur Web",
                "essential_question": "Bagaimana cara mengelompokkan elemen web musik agar rapi?",
                "challenge": "Buatlah halaman web galeri musik favorit. Gunakan tag div sebagai pembungkus utama informasi playlist, dengan judul sedang h2 tentang musik kesukaanmu di dalamnya.",
                "media_url": ""
            },
            guiding_questions_json=[
                "Apa fungsi tag <div> dalam pengelompokan elemen HTML?",
                "Kapan kita harus menggunakan tag judul tingkat kedua <h2> dibanding <h1>?"
            ],
            reflection_questions_json=[
                "Mengapa pengelompokan elemen di dalam tag div sangat mempermudah penataan layout?",
                "Bagaimana merancang urutan langkah (algoritma) pengerjaan meminimalkan kesalahan penulisan kode?"
            ],
            materi_list_json=[
                {"title": "Panduan Nesting Elemen HTML", "url": "https://drive.google.com/file/d/html-nesting", "type": "link"}
            ]
        )
        session.add(p2_obj)
        print("Pertemuan p2 (Galeri Musik Favorit) seeded.")
        await session.flush()

        # Seed LearningTask easy-2 (Pembelajaran 2)
        easy2_obj = LearningTask(
            id="easy-2",
            pertemuan_id="p2",
            judul="Pertemuan 2: Galeri Musik Favorit",
            validator_rules_json=[
                { "type": "exists", "selector": "body", "error_message": "Misi belum selesai: Kamu belum membuat wadah utama <body>!" },
                { "type": "exists", "selector": "div", "error_message": "Misi belum selesai: Kamu belum membuat kotak grup <div>!" },
                { "type": "child_of", "parent": "body", "child": "div", "error_message": "Misi belum selesai: Kotak grup <div> harus berada di dalam <body>!" },
                { "type": "exists", "selector": "h2", "error_message": "Misi belum selesai: Kamu belum menambahkan judul sedang <h2>!" },
                { "type": "child_of", "parent": "div", "child": "h2", "error_message": "Misi belum selesai: Judul sedang <h2> harus berada di dalam kotak grup <div>!" }
            ],
            max_attempts_before_ai_hint=4
        )
        session.add(easy2_obj)
        await session.flush()

        # 5. Seed Pertemuan 3: Proyek Portofolio Impian (Project)
        p3_obj = Pertemuan(
            id="p3",
            room_id=room_id,
            urutan=3,
            judul="Pertemuan 3: Proyek Portofolio Impian",
            cbl_engage_json={
                "big_idea": "Portofolio & Kreativitas",
                "essential_question": "Bagaimana cara menyajikan karya portofoliomu secara online dan menarik?",
                "challenge": "Buatlah proyek portofolio impian kreatif. Hiasi halaman dengan CSS style yang mendefinisikan warna latar belakang solid kontras dan buat daftar keterampilanmu menggunakan tag <ul> dan <li>.",
                "media_url": ""
            },
            guiding_questions_json=[
                "Bagaimana tag <style> dapat memengaruhi warna latar belakang halaman web?",
                "Bagaimana menyusun daftar tidak berurutan menggunakan tag ul dan li?"
            ],
            reflection_questions_json=[
                "Bagaimana proses dekomposisi membantumu membagi detail karya portofoliomu?",
                "Seberapa penting kreativitas pewarnaan CSS dalam memikat pengunjung web?"
            ],
            materi_list_json=[
                {"title": "Pengenalan CSS Hiasan Dasar", "url": "https://drive.google.com/file/d/css-hiasan", "type": "link"}
            ]
        )
        session.add(p3_obj)
        print("Pertemuan p3 (Proyek Portofolio Impian) seeded.")
        await session.flush()

        # Seed ProjectTask proj-1 (Projek)
        proj1_obj = ProjectTask(
            id="proj-1",
            pertemuan_id="p3",
            judul="Pertemuan 3: Proyek Portofolio Impian",
            studi_kasus="Buatlah proyek portofolio impian kreatif. Hiasi halaman dengan CSS style yang mendefinisikan warna latar belakang solid kontras dan buat daftar keterampilanmu menggunakan tag <ul> dan <li>.",
            rubrik_json=[
                { "name": "Kelengkapan elemen", "bobot": 30 },
                { "name": "Kebenaran semantik", "bobot": 35 },
                { "name": "Kreativitas desain", "bobot": 35 }
            ]
        )
        session.add(proj1_obj)
        await session.flush()

        # 6. Seed Submissions
        # 6a. Learning Submission
        learning_sub = LearningSubmission(
            id=str(uuid.uuid4()),
            task_id="easy-1",
            siswa_id=siswa.id,
            ast_snapshots_json=[{
                "attempt": 1,
                "ast": [
                    {"type": "body", "children": [
                        {"type": "h1", "content": "Profil Andi"},
                        {"type": "p", "content": "Saya suka bermain sepak bola dan belajar coding!"}
                    ]}
                ],
                "errors": []
            }],
            attempt_count=1,
            final_score=95,
            accuracy_score=100,
            efficiency_score=90,
            ct_session_id=None,
            reflection_answers_json={"question": "Bagian mana yang paling sulit?", "answer": "Menyeimbangkan ukuran wadah."},
            ct_post_score_json={"decomposition": 90, "pattern_recognition": 95, "abstraction": 90, "algorithm_design": 95},
            ai_feedback="Kerja luar biasa Andi! Hasil run dekomposisimu sangat terperinci dalam memilah struktur data utama. Kamu berhasil mengabstraksikan rancangan visual menjadi kode HTML yang sangat rapi dan logis."
        )
        session.add(learning_sub)
        print("Learning Submission seeded.")

        # 6b. Project Submission
        project_sub = ProjectSubmission(
            id=str(uuid.uuid4()),
            task_id="proj-1",
            siswa_id=siswa.id,
            final_ast_json=[
                {"type": "body", "children": [
                    {"type": "style", "content": "body { background-color: #BFDBFE; }"},
                    {"type": "h1", "content": "Portofolio Andi"},
                    {"type": "ul", "children": [
                        {"type": "li", "content": "Membuat Web HTML dasar"},
                        {"type": "li", "content": "Mengatur gaya dengan CSS"},
                        {"type": "li", "content": "Berpikir Algoritmis dengan Blok"}
                    ]}
                ]}
            ],
            teacher_score=92,
            teacher_comment="Kerja bagus Andi! Portofoliomu sangat terstruktur dengan rapi. Tambahkan variasi CSS lagi agar makin keren!",
            rubrik_scores_json={"Kelengkapan elemen": 90, "Kebenaran semantik": 95, "Kreativitas desain": 90},
            is_published_to_gallery=True
        )
        session.add(project_sub)
        print("Project Submission seeded.")
        await session.flush()

        # 6c. Gallery Item for Project Submission
        gallery_item = GalleryItem(
            id=str(uuid.uuid4()),
            project_submission_id=project_sub.id,
            appreciation_count=5
        )
        session.add(gallery_item)
        print("Gallery Item seeded.")

        await session.commit()
        print("====== SEEDING SUCCESS ======")

if __name__ == "__main__":
    asyncio.run(seed())
