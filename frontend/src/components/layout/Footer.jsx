import React from 'react';
import { useNavigate } from 'react-router-dom';
import WebCraftLogo from '../common/WebCraftLogo';


export default function Footer() {
  const navigate = useNavigate();

  return (
    <footer
      className="w-full border-t-4 border-[#0F172A] py-14 mt-auto md:-ml-32 md:w-[calc(100%+8rem)] z-10 relative"
      style={{ background: 'linear-gradient(180deg, #0F172A 0%, #090D16 100%)' }}
    >
      <div className="max-w-[1400px] mx-auto px-6 md:pl-36 md:pr-12 grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
        {/* Brand Column */}
        <div className="flex flex-col gap-4 text-left">
          <div className="flex items-center gap-2.5">
            <WebCraftLogo className="w-8 h-8" />
            <h3 className="font-fredoka text-xl font-bold text-white tracking-tight">
              WebCraft
            </h3>
          </div>
          <p className="font-nunito text-xs text-slate-400 font-semibold leading-relaxed max-w-sm">
            Platform pembelajaran coding berbasis web yang mengintegrasikan pendekatan Challenge Based Learning dengan Artificial Intelligence untuk meningkatkan keterampilan Computational Thinking peserta didik SMP melalui fitur Triple-View Interface yang menghubungkan blok visual, kode, dan hasil secara real-time.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="bg-indigo-900/50 text-indigo-300 px-3 py-1 rounded-xl text-[10px] font-fredoka font-bold border border-indigo-800 shadow-[1px_1px_0px_#000000] flex items-center gap-1">
              <i className="ti ti-sparkles text-[10px] animate-pulse" /> AI Assisted
            </span>
          </div>
        </div>

        {/* Credits */}
        <div className="flex flex-col gap-4 items-start md:items-end text-left md:text-right">
          <div className="flex items-center gap-2 bg-slate-800/80 border-2 border-slate-700 px-4 py-2.5 rounded-xl shadow-[3px_3px_0px_#000000] hover:-translate-y-0.5 transition-transform">
            <i className="ti ti-code text-blue-400 text-base" />
            <span className="font-fredoka text-xs font-bold text-slate-200">
              WebCraft — Belajar Web Interaktif
            </span>
          </div>
          <p className="font-nunito text-[11px] text-slate-500 font-semibold leading-relaxed mt-2">
            Platform inovatif untuk siswa SMP belajar<br />
            <strong>pemrograman web berbasis tantangan.</strong>
          </p>
          <div className="w-full border-t border-dashed border-slate-800/80 my-2 block md:hidden" />
          <p className="font-nunito text-[10px] text-slate-600 font-bold mt-1">
            &copy; {new Date().getFullYear()} WebCraft. Hak Cipta Dilindungi Undang-Undang.
          </p>
        </div>
      </div>
    </footer>
  );
}
