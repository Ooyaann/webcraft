import React from 'react';
import StarRating from './StarRating';

export default function KaryaCard({ karya, onAppreciate }) {
  return (
    <div className="neo-card bg-white hover:-translate-y-2 transition-transform overflow-hidden flex flex-col group relative">
      {/* Decorative top bar */}
      <div className={`h-4 w-full border-b-2 border-[#0F172A] ${karya.previewColor || 'bg-gray-200'}`}></div>
      
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="font-fredoka text-xl font-bold text-[#0F172A] leading-tight mb-1 group-hover:text-[#3B82F6] transition-colors line-clamp-2">
          {karya.title}
        </h3>
        <p className="font-nunito text-sm text-gray-600 font-bold mb-3 flex items-center gap-1">
          <span className="material-symbols-rounded text-sm">person</span>
          Oleh: {karya.studentName}
        </p>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {karya.badges?.map((badge, idx) => (
            <span key={idx} className="bg-[#10B981]/20 text-[#10B981] border-2 border-[#10B981] px-2 py-0.5 rounded text-[10px] font-bold">
              {badge}
            </span>
          ))}
        </div>
        
        <div className="mt-auto pt-3 border-t-2 border-dashed border-gray-300 flex justify-between items-center">
          <StarRating rating={karya.stars || 0} readOnly size="sm" />
          
          <button 
            onClick={() => onAppreciate(karya.id)}
            className="flex items-center gap-1 text-[#EC4899] font-bold text-sm bg-pink-50 px-2 py-1 rounded border-2 border-transparent hover:border-[#EC4899] transition-all"
          >
            <span className="material-symbols-rounded text-base fill-current">favorite</span>
            {karya.appreciations || 0}
          </button>
        </div>
      </div>
      
      {/* Hover preview button overlay */}
      <div className="absolute inset-0 bg-[#0F172A]/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none group-hover:pointer-events-auto">
        <button className="neo-btn bg-[#FACC15] text-[#0F172A] px-6 py-2 rounded-full font-fredoka font-bold flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all">
          <span className="material-symbols-rounded">visibility</span>
          Lihat Karya
        </button>
      </div>
    </div>
  );
}
