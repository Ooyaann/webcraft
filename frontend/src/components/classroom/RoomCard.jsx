import React from 'react';

export default function RoomCard({ room, onClick }) {
  return (
    <div 
      onClick={onClick}
      className="neo-card bg-white p-4 cursor-pointer hover:-translate-y-1 transition-transform group flex flex-col justify-between"
    >
      <div>
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-fredoka text-xl text-[#0F172A] font-bold group-hover:text-[#3B82F6] transition-colors">{room.name}</h3>
          <span className="bg-[#10B981] text-white text-xs font-bold px-2 py-1 rounded border-2 border-[#0F172A]">
            {room.code}
          </span>
        </div>
        <p className="text-sm font-nunito text-gray-600 font-semibold mb-4">{room.description}</p>
      </div>
      <div className="flex justify-between items-center text-xs font-bold text-[#0F172A]">
        <div className="flex items-center gap-1 bg-yellow-100 px-2 py-1 rounded border-2 border-[#0F172A]">
          <span className="material-symbols-rounded text-sm">groups</span>
          {room.studentCount} Siswa
        </div>
        <div className="flex items-center gap-1 bg-sky-100 px-2 py-1 rounded border-2 border-[#0F172A]">
          <span className="material-symbols-rounded text-sm">assignment</span>
          {room.pertemuanCount || 0} Pertemuan
        </div>
      </div>
    </div>
  );
}
