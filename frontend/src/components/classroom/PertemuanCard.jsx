import React from 'react';

export default function PertemuanCard({ pertemuan, onClick }) {
  return (
    <div 
      onClick={onClick}
      className="bg-[#E0F2FE] border-2 border-[#0F172A] rounded-xl p-4 shadow-[4px_4px_0px_#0F172A] cursor-pointer hover:-translate-y-1 transition-transform"
    >
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-fredoka text-lg font-bold text-[#0F172A]">{pertemuan.title}</h4>
        {pertemuan.is_active ? (
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border border-[#0F172A]"></span>
          </span>
        ) : (
          <span className="h-3 w-3 rounded-full bg-gray-400 border border-[#0F172A]"></span>
        )}
      </div>
      <p className="text-sm font-nunito text-gray-700 font-semibold mb-3">{pertemuan.topic}</p>
      
      <div className="w-full bg-white border-2 border-[#0F172A] rounded-full h-2.5 mb-1 overflow-hidden">
        <div className="bg-[#3B82F6] h-2.5 border-r-2 border-[#0F172A]" style={{ width: `${pertemuan.completionRate}%` }}></div>
      </div>
      <div className="text-xs text-right font-bold text-[#0F172A]">{pertemuan.completionRate}% Selesai</div>
    </div>
  );
}
