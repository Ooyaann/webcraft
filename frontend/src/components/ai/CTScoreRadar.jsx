import React from 'react';

export default function CTScoreRadar({ scores }) {
  const decomposition = scores.decomposition || scores.dekomposisi || 70;
  const abstraction = scores.abstraction || scores.abstraksi || 70;
  const pattern = scores.pattern_recognition || scores.pattern || 70;
  const algorithm = scores.algorithm_design || scores.algoritma || 70;

  return (
    <div className="w-full bg-white border-2 border-[#0F172A] rounded-2xl p-4 shadow-[3px_3px_0px_#0F172A] flex flex-col gap-3.5">
      <div>
        <div className="flex justify-between items-center mb-0.5">
          <span className="font-fredoka text-[10px] font-bold text-slate-700">Dekomposisi</span>
          <span className="font-fredoka text-[10px] font-bold text-blue-600">{decomposition}%</span>
        </div>
        <div className="w-full bg-slate-100 border-2 border-[#0F172A] rounded-full h-2.5 overflow-hidden">
          <div 
            className="bg-blue-500 h-full border-r-2 border-[#0F172A]" 
            style={{ width: `${decomposition}%` }}
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-0.5">
          <span className="font-fredoka text-[10px] font-bold text-slate-700">Abstraksi</span>
          <span className="font-fredoka text-[10px] font-bold text-pink-650">{abstraction}%</span>
        </div>
        <div className="w-full bg-slate-100 border-2 border-[#0F172A] rounded-full h-2.5 overflow-hidden">
          <div 
            className="bg-pink-500 h-full border-r-2 border-[#0F172A]" 
            style={{ width: `${abstraction}%` }}
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-0.5">
          <span className="font-fredoka text-[10px] font-bold text-slate-700">Pengenalan Pola</span>
          <span className="font-fredoka text-[10px] font-bold text-amber-600">{pattern}%</span>
        </div>
        <div className="w-full bg-slate-100 border-2 border-[#0F172A] rounded-full h-2.5 overflow-hidden">
          <div 
            className="bg-amber-500 h-full border-r-2 border-[#0F172A]" 
            style={{ width: `${pattern}%` }}
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-0.5">
          <span className="font-fredoka text-[10px] font-bold text-slate-700">Desain Algoritma</span>
          <span className="font-fredoka text-[10px] font-bold text-emerald-600">{algorithm}%</span>
        </div>
        <div className="w-full bg-slate-100 border-2 border-[#0F172A] rounded-full h-2.5 overflow-hidden">
          <div 
            className="bg-emerald-500 h-full border-r-2 border-[#0F172A]" 
            style={{ width: `${algorithm}%` }}
          />
        </div>
      </div>
    </div>
  );
}
