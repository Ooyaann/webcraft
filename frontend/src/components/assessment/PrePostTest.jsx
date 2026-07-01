import React, { useState } from 'react';
import { useStore } from '../../store/useStore';

const QUESTIONS = [
  {
    id: 1,
    skill: 'Decomposition',
    question: "Sebuah website edukasi tentang Daur Air membutuhkan bagian penjelasan Evaporasi, Kondensasi, dan Presipitasi. Menurutmu, bagian apa yang paling mendasar untuk dibuat pertama kali agar halaman web tersebut memiliki struktur terarah?",
    options: [
      "Judul utama halaman web dan wadah daftar proses",
      "Hiasan gambar awan dan animasi hujan menggunakan CSS",
      "Tombol bagikan ke media sosial WhatsApp",
      "Menyambungkan lagu latar belakang bertema hujan"
    ],
    correct: 0,
    explanation: "Dekomposisi melatih kita memilah struktur inti terpenting terlebih dahulu (judul & wadah) sebelum menghias atau menambahkan tombol tambahan."
  },
  {
    id: 2,
    skill: 'Pattern Recognition',
    question: "Tag <ul> membungkus tag <li> untuk membuat daftar tidak berurutan (bullet). Tag <ol> juga membungkus tag <li> untuk membuat daftar berurutan (nomor). Apa kesamaan pola (pattern) struktur di antara keduanya?",
    options: [
      "Keduanya sama-sama tidak membutuhkan tag penutup di HTML",
      "Keduanya bertindak sebagai kontainer/wadah untuk membungkus beberapa tag item list <li>",
      "Keduanya secara otomatis menampilkan gambar ilustrasi di layar browser",
      "Keduanya hanya bisa diletakkan di luar tag <body>"
    ],
    correct: 1,
    explanation: "Pengenalan pola melatih kita melihat kesamaan fungsi: baik ul maupun ol sama-sama bertindak sebagai kontainer pembungkus list item."
  },
  {
    id: 3,
    skill: 'Algorithmic Thinking',
    question: "Siswa ingin membuat website yang menampilkan judul besar berwarna hijau dan penjelasan di bawahnya. Urutan langkah pembuatan kode web yang logis dan runtut adalah...",
    options: [
      "1. Menghias warna hijau -> 2. Menulis judul H1 -> 3. Membuat wadah Body",
      "1. Membuat wadah Body -> 2. Menulis judul H1 dan paragraf -> 3. Menghias warna hijau dengan CSS",
      "1. Menulis judul H1 -> 2. Membuat wadah Body -> 3. Menghias warna hijau",
      "1. Menghias warna hijau -> 2. Membuat wadah Body -> 3. Menulis penjelasan"
    ],
    correct: 1,
    explanation: "Desain Algoritma melatih kita menyusun langkah logis: membuat wadah utama (body) -> mengisi konten (HTML) -> menghias (CSS)."
  }
];

export default function PrePostTest({ onComplete }) {
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(null);

  const handleSelect = (idx) => {
    if (showExplanation) return;
    setSelectedOpt(idx);
  };

  const handleNext = () => {
    // Record answer
    const isCorrect = selectedOpt === QUESTIONS[currentQ].correct;
    const newAnswers = { ...answers, [currentQ]: isCorrect };
    setAnswers(newAnswers);
    
    if (!showExplanation) {
      setShowExplanation(true);
    } else {
      setShowExplanation(false);
      setSelectedOpt(null);
      if (currentQ < QUESTIONS.length - 1) {
        setCurrentQ(currentQ + 1);
      } else {
        // Calculate final score
        const correctCount = Object.values(newAnswers).filter(Boolean).length;
        const finalScore = Math.round((correctCount / QUESTIONS.length) * 100);
        setScore(finalScore);
      }
    }
  };

  const handleFinish = () => {
    if (onComplete) {
      onComplete(score);
    }
  };

  if (score !== null) {
    return (
      <div className="neo-card bg-white p-6 max-w-xl mx-auto flex flex-col items-center gap-4 text-center">
        <span className="material-symbols-rounded text-6xl text-[#10B981] font-bold animate-bounce">emoji_events</span>
        <h3 className="font-fredoka text-2xl font-bold text-[#0F172A]">Evaluasi Pre-Test Selesai!</h3>
        <p className="font-nunito text-sm text-gray-600 font-bold">
          Terima kasih telah berpartisipasi. Hasil evaluasi awal CT-mu berhasil direkam.
        </p>
        
        <div className="bg-[#E0F2FE] border-4 border-[#0F172A] px-6 py-4 rounded-xl shadow-hard text-[#0F172A] my-2">
          <p className="font-nunito text-[10px] font-bold text-gray-500 uppercase">Skor Kompetensi Awal</p>
          <p className="font-fredoka text-4xl font-bold text-[#3B82F6]">{score} / 100</p>
        </div>

        <button
          onClick={handleFinish}
          className="w-full neo-btn neo-btn-green py-3 justify-center text-white cursor-pointer"
        >
          Masuk ke Ruang Kelas & Mulai Belajar!
        </button>
      </div>
    );
  }

  const q = QUESTIONS[currentQ];

  return (
    <div className="neo-card bg-white max-w-2xl mx-auto flex flex-col gap-5 text-left transition-all">
      {/* Header Info */}
      <div className="flex justify-between items-center border-b-2 border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-rounded text-[#3B82F6] font-bold">quiz</span>
          <h3 className="font-fredoka text-lg font-bold text-[#0F172A]">Pre-Test Berpikir Komputasional</h3>
        </div>
        <span className="font-fredoka text-xs font-bold bg-[#E0F2FE] text-blue-800 border-2 border-[#0F172A] px-2.5 py-0.5 rounded shadow-hard-sm">
          Soal {currentQ + 1} / {QUESTIONS.length}
        </span>
      </div>

      {/* Question Text */}
      <div>
        <span className="bg-[#EC4899] text-white text-[10px] font-fredoka font-bold px-2 py-0.5 rounded border border-[#0F172A] uppercase">
          ASPEK: {q.skill}
        </span>
        <p className="font-fredoka text-sm font-bold text-[#0F172A] leading-relaxed mt-2">
          {q.question}
        </p>
      </div>

      {/* Options List */}
      <div className="flex flex-col gap-2.5">
        {q.options.map((opt, idx) => {
          const isSelected = selectedOpt === idx;
          let borderStyle = 'border-[#0F172A] hover:bg-slate-50';
          let checkStyle = 'bg-white';

          if (isSelected) {
            borderStyle = 'bg-blue-50 border-blue-600 shadow-[2px_2px_0px_#2563EB]';
            checkStyle = 'bg-blue-600';
          }
          if (showExplanation) {
            if (idx === q.correct) {
              borderStyle = 'bg-green-50 border-green-600 shadow-[2px_2px_0px_#16A34A]';
              checkStyle = 'bg-green-600';
            } else if (isSelected) {
              borderStyle = 'bg-red-50 border-red-600 shadow-[2px_2px_0px_#DC2626]';
              checkStyle = 'bg-red-600';
            } else {
              borderStyle = 'border-slate-200 opacity-50 cursor-not-allowed';
            }
          }

          return (
            <div
              key={idx}
              onClick={() => handleSelect(idx)}
              className={`flex items-center gap-3 p-3.5 border-2 rounded-xl cursor-pointer transition-all ${borderStyle}`}
            >
              <div className={`w-5 h-5 border-2 border-[#0F172A] rounded-full flex items-center justify-center shrink-0 ${checkStyle}`}>
                {((isSelected && !showExplanation) || (showExplanation && idx === q.correct)) && (
                  <span className="material-symbols-rounded text-white text-xs font-bold">check</span>
                )}
              </div>
              <span className="font-nunito text-xs font-bold text-[#0F172A] leading-relaxed">{opt}</span>
            </div>
          );
        })}
      </div>

      {/* Socratic explanation box */}
      {showExplanation && (
        <div className="bg-[#E0F2FE] border-2 border-[#0F172A] p-3 rounded-xl flex items-start gap-2.5 animate-in fade-in duration-200">
          <span className="material-symbols-rounded text-blue-600 font-bold shrink-0 mt-0.5">info</span>
          <div>
            <p className="font-fredoka text-xs font-bold text-blue-800">Pembahasan Konsep CT:</p>
            <p className="font-nunito text-xs text-gray-700 font-bold leading-normal mt-0.5">{q.explanation}</p>
          </div>
        </div>
      )}

      {/* Bottom Button */}
      <button
        onClick={handleNext}
        disabled={selectedOpt === null}
        className={`w-full neo-btn py-3 justify-center text-white cursor-pointer ${
          selectedOpt === null && 'opacity-50 cursor-not-allowed shadow-none transform-none'
        }`}
      >
        {showExplanation ? 'Lanjutkan Soal' : 'Kunci Jawaban'}
      </button>
    </div>
  );
}
