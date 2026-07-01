import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function BerandaGuest() {
  const navigate = useNavigate();
  const [activeSlide, setActiveSlide] = useState(0);

  const slides = [
    {
      title: "1. Merakit Blok HTML",
      icon: "ti-puzzle",
      desc: "Menyusun tag HTML & CSS secara visual semudah menyusun puzzle.",
      color: "#3B82F6",
      bgClass: "bg-pastel-blue",
      snippet: (
        <div className="flex flex-col gap-2.5 p-4 font-mono text-xs text-left">
          <div className="bg-[#3B82F6] text-white border-2 border-[#0F172A] rounded-xl p-2.5 flex items-center justify-between shadow-[2px_2px_0px_#0F172A]">
            <span className="font-bold">📦 {"<body>"} (Wadah Utama)</span>
            <i className="ti ti-hand-grab text-sm text-white/80" />
          </div>
          <div className="ml-5 bg-[#FACC15] text-[#0F172A] border-2 border-[#0F172A] rounded-xl p-2.5 flex items-center justify-between shadow-[2px_2px_0px_#0F172A]">
            <span className="font-bold">📝 {"<h1>"} (Judul Utama)</span>
            <i className="ti ti-arrows-maximize text-sm text-slate-700" />
          </div>
        </div>
      )
    },
    {
      title: "2. Bantuan AI Teman Belajar",
      icon: "ti-sparkles",
      desc: "AI membimbingmu dengan pertanyaan pemandu (Socrates), bukan jawaban instan.",
      color: "#EC4899",
      bgClass: "bg-pastel-lavender",
      snippet: (
        <div className="flex flex-col gap-3 p-4 text-xs text-left">
          <div className="bg-[#EC4899] text-white border-2 border-[#0F172A] rounded-2xl p-3 shadow-[3px_3px_0px_#0F172A] flex gap-2.5 items-start">
            <div className="w-8 h-8 rounded-xl bg-white border-2 border-[#0F172A] flex items-center justify-center font-bold text-lg shrink-0 shadow-[1px_1px_0px_#0F172A] text-[#EC4899]">💡</div>
            <div>
              <span className="font-fredoka text-[10px] font-bold text-yellow-250 block mb-0.5">Asisten Tutor</span>
              <p className="font-nunito font-bold leading-normal">
                {"\"Hebat! Blok utama sudah siap. Menurutmu, agar judul tampil di layar, tag <h1> sebaiknya diletakkan di dalam <body>?\""}
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "3. Hasil Web Instan",
      icon: "ti-device-laptop",
      desc: "Lihat hasil karyamu secara langsung saat menyusun blok.",
      color: "#10B981",
      bgClass: "bg-pastel-mint",
      snippet: (
        <div className="flex flex-col gap-2 p-4 text-left">
          <div className="border-2 border-[#0F172A] rounded-2xl p-4 bg-[#10B981] text-white shadow-[3px_3px_0px_#0F172A]">
            <h1 className="font-fredoka text-lg font-bold text-white">Halo, Dunia! 👋</h1>
            <p className="font-nunito text-xs font-bold text-white/95 mt-1 leading-normal">
              Ini adalah halaman web pertamaku yang dibuat secara visual dengan WebCraft.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "4. Analisis Berpikir Komputasional",
      icon: "ti-chart-bar",
      desc: "Latih cara berpikir logis dengan analisis pilar Computational Thinking.",
      color: "#FACC15",
      bgClass: "bg-pastel-yellow",
      snippet: (
        <div className="flex flex-col gap-3 p-4 text-left">
          <div className="bg-white border-2 border-[#0F172A] p-3 rounded-2xl shadow-[3px_3px_0px_#0F172A] flex flex-col gap-2">
            <div>
              <div className="flex justify-between items-center text-xs font-bold mb-1">
                <span className="text-slate-700">Dekomposisi</span>
                <span className="text-blue-600">90%</span>
              </div>
              <div className="w-full bg-slate-100 border-2 border-[#0F172A] h-3 rounded-full overflow-hidden">
                <div className="bg-[#3B82F6] h-full" style={{ width: "90%" }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center text-xs font-bold mb-1">
                <span className="text-slate-700">Algoritma</span>
                <span className="text-emerald-600">85%</span>
              </div>
              <div className="w-full bg-slate-100 border-2 border-[#0F172A] h-3 rounded-full overflow-hidden">
                <div className="bg-[#10B981] h-full" style={{ width: "85%" }} />
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  // Auto transition slides
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full flex flex-col gap-10 py-8 px-4 md:px-6 max-w-[1200px] mx-auto neo-page-enter">
      {/* Hero Section */}
      <section
        className="neo-stagger-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center p-6 md:p-10 rounded-[28px] shadow-[8px_8px_0px_#0F172A] relative z-10 overflow-hidden border-4 border-[#0F172A] bg-pastel-blue"
      >
        {/* Decorative shapes */}
        <div
          className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-15 pointer-events-none"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}
        />
        <div
          className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full opacity-15 pointer-events-none"
          style={{ background: 'linear-gradient(135deg, #FACC15, #FDE68A)' }}
        />

        <div className="lg:col-span-7 flex flex-col items-start text-left gap-4 relative z-10">
          <div
            className="neo-badge-ai px-3 py-1.5 rounded-xl text-xs"
            style={{
              background: 'linear-gradient(135deg, #FACC15, #FDE68A)',
              color: '#0F172A',
              border: '2px solid #0F172A',
              boxShadow: '2px 2px 0px #0F172A',
              fontSize: '11px',
            }}
          >
            <i className="ti ti-sparkles text-sm" />
            DIDAMPINGI AI TUTOR PINTAR!
          </div>

          <h2 className="font-fredoka text-3xl md:text-[2.75rem] font-black text-[#0F172A] leading-[1.15]">
            Belajar Coding Web<br />
            dengan{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Challenge Based Learning
            </span>
            !
          </h2>

          <p className="font-nunito text-xs md:text-sm font-bold text-[#0F172A] leading-relaxed bg-[#FFFBEB] p-4 rounded-2xl border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A]">
            Platform belajar coding web interaktif untuk siswa SMP. Selesaikan tantangan, rakit blok HTML & CSS, dan dapatkan bimbingan AI yang melatih cara berpikir, bukan sekadar memberi jawaban!
          </p>

          <div className="flex flex-wrap gap-3 mt-1">
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-3 rounded-xl border-2 border-[#0F172A] font-fredoka text-sm font-bold text-white flex items-center gap-2 hover:-translate-y-1 active:translate-y-[1px] transition-all cursor-pointer neo-hover-bounce"
              style={{
                background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
                boxShadow: '4px 4px 0px #0F172A',
              }}
            >
              <i className="ti ti-rocket text-base" />
              Mulai Belajar Sekarang!
            </button>
          </div>
        </div>

        {/* Feature Carousel Mockup Card */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center relative w-full max-w-sm mx-auto">
          {/* Mock Browser/Workspace Window */}
          <div className="w-full bg-white border-4 border-[#0F172A] rounded-3xl shadow-[6px_6px_0px_#0F172A] overflow-hidden flex flex-col">
            {/* Title Bar */}
            <div className="bg-slate-100 border-b-4 border-[#0F172A] px-4 py-2.5 flex items-center justify-between">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-400 border border-[#0F172A]" />
                <span className="w-3 h-3 rounded-full bg-amber-300 border border-[#0F172A]" />
                <span className="w-3 h-3 rounded-full bg-emerald-400 border border-[#0F172A]" />
              </div>
              <span className="font-fredoka text-[10px] font-bold text-slate-500">WebCraft Fitur</span>
              <div className="w-10" />
            </div>

            {/* Slider Content Frame */}
            <div className={`p-4 transition-colors duration-500 min-h-[220px] flex flex-col justify-between ${slides[activeSlide].bgClass}`}>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-7 h-7 rounded-lg border-2 border-[#0F172A] flex items-center justify-center text-white text-sm"
                    style={{ backgroundColor: slides[activeSlide].color }}
                  >
                    <i className={`ti ${slides[activeSlide].icon}`} />
                  </div>
                  <h4 className="font-fredoka text-xs font-bold text-[#0F172A]">{slides[activeSlide].title}</h4>
                </div>
                <p className="font-nunito text-[10px] font-bold text-slate-650 leading-snug mb-3">
                  {slides[activeSlide].desc}
                </p>
              </div>

              {/* Dynamic Snippet Area */}
              <div className="w-full">
                {slides[activeSlide].snippet}
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="bg-slate-50 border-t-2 border-[#0F172A] px-4 py-2 flex items-center justify-center gap-1.5">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveSlide(idx)}
                  className={`w-2.5 h-2.5 rounded-full border border-[#0F172A] transition-all cursor-pointer ${
                    activeSlide === idx ? 'bg-indigo-600 scale-110' : 'bg-white'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* AI Highlight — Simplified, no "chatbot" labels with colorful cards */}
      <section className="neo-stagger-2 border-4 border-[#0F172A] p-6 md:p-8 rounded-[28px] shadow-[6px_6px_0px_#0F172A] text-left relative overflow-hidden bg-pastel-lavender">
        <div
          className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'linear-gradient(135deg, #6366F1, #A5B4FC)' }}
        />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-4 border-[#0F172A] pb-5">
          <div>
            <div
              className="text-white border-2 border-[#0F172A] px-4 py-1.5 rounded-xl font-fredoka text-xs font-bold inline-flex items-center gap-1.5 mb-3 shadow-[2px_2px_0px_#0F172A]"
              style={{
                background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
              }}
            >
              <i className="ti ti-sparkles text-xs" />
              BANTUAN AI
            </div>
            <h3 className="font-fredoka text-2xl md:text-3xl font-bold text-[#0F172A]">
              AI sebagai Teman Belajar
            </h3>
            <p className="font-nunito text-xs md:text-sm text-slate-750 font-bold mt-1">
              AI tidak memberikan jawaban instan secara langsung. AI menuntun kamu menemukan solusi sendiri secara mandiri!
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
          {[
            {
              icon: 'ti-messages',
              title: 'Panduan Belajar Interaktif',
              desc: 'Membimbing langkah-langkah coding dengan pertanyaan pemandu yang melatih nalar dan logika berpikir siswa.',
              color: '#3B82F6',
              bgClass: 'bg-[#FACC15]', // Solid Vibrant Yellow
              textColor: 'text-[#0F172A]',
              descColor: 'text-slate-800'
            },
            {
              icon: 'ti-code',
              title: 'Koreksi Kode Otomatis',
              desc: 'Memeriksa secara real-time dan memberikan umpan balik langsung terhadap struktur HTML & CSS yang kamu buat.',
              color: '#FACC15',
              bgClass: 'bg-[#6366F1]', // Solid Vibrant Indigo
              textColor: 'text-white',
              descColor: 'text-indigo-100'
            },
          ].map((card, idx) => (
            <div
              key={idx}
              className={`p-6 rounded-2xl flex flex-col gap-3 hover:-translate-y-1 transition-all border-4 border-[#0F172A] shadow-[6px_6px_0px_#0F172A] ${card.bgClass} ${card.textColor}`}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center font-bold border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] bg-white"
                style={{
                  color: card.color,
                }}
              >
                <i className={`ti ${card.icon} text-2xl`} />
              </div>
              <h4 className="font-fredoka text-base font-bold">
                {card.title}
              </h4>
              <p className={`font-nunito text-xs font-semibold leading-relaxed ${card.descColor}`}>
                {card.desc}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
