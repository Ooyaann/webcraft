import React from 'react';

export default function ProjectCard({ project, onGradeClick }) {
  return (
    <div className="neo-card bg-white p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-fredoka text-lg font-bold text-[#0F172A]">{project.title}</h4>
          <p className="text-sm font-nunito text-gray-600 font-semibold">Oleh: {project.studentName}</p>
        </div>
        <div className="flex items-center gap-1 bg-[#10B981]/20 text-[#10B981] px-2 py-1 rounded border-2 border-[#10B981]">
          <span className="material-symbols-rounded text-sm">psychology</span>
          <span className="font-bold text-xs">CT: {project.ctScore || '?'}</span>
        </div>
      </div>
      
      <div className="flex gap-2 mb-4">
        {project.status === 'graded' ? (
          <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 border-2 border-[#0F172A] rounded">Sudah Dinilai</span>
        ) : (
          <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 border-2 border-[#0F172A] rounded animate-pulse">Menunggu Nilai</span>
        )}
      </div>

      <button 
        onClick={onGradeClick}
        className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] rounded font-fredoka font-bold py-1.5 transition-transform active:translate-y-0.5 active:shadow-none"
      >
        {project.status === 'graded' ? 'Lihat Nilai' : 'Beri Nilai Produk'}
      </button>
    </div>
  );
}
