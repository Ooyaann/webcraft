import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import api from '../services/api';

export default function Tugasku() {
  const navigate = useNavigate();
  const { activeRoom } = useStore();
  const [pendingTasks, setPendingTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!activeRoom) return;

    setIsLoading(true);
    Promise.all([
      api.get(`/rooms/${activeRoom.id}/pertemuan`),
      api.get('/submissions/learning/me'),
      api.get('/submissions/project/me').catch(() => ({ data: [] }))
    ])
      .then(([tasksRes, subsRes, projRes]) => {
        const allTasks = tasksRes.data || [];
        const mySubs = subsRes.data || [];
        const myProjs = projRes.data || [];

        // Completion tracked by pertemuan_id (robust)
        const completedPertemuan = new Set([
          ...(mySubs.map(s => s.pertemuan_id).filter(Boolean) || []),
          ...(myProjs.map(p => p.pertemuan_id).filter(Boolean) || [])
        ]);
        const pending = allTasks.filter(task => {
          if (!task.is_published) return false;
          return !completedPertemuan.has(task.id);
        });

        setPendingTasks(pending);
      })
      .catch(err => console.error("Error loading tugasku:", err))
      .finally(() => setIsLoading(false));
  }, [activeRoom]);

  if (!activeRoom) {
    return (
      <div className="w-full px-6 py-12 flex flex-col items-center justify-center max-w-lg mx-auto">
        <div className="neo-card p-8 text-center border-4 border-[#0F172A] shadow-[6px_6px_0px_#0F172A] w-full">
          <i className="ti ti-school text-5xl text-blue-600 mb-4" />
          <h2 className="font-fredoka text-xl font-bold mb-2">Belum Terhubung Kelas</h2>
          <p className="font-nunito text-xs text-slate-500 font-bold mb-6">
            Silakan bergabung dengan kelas terlebih dahulu di menu Ruang Belajar untuk melihat daftar tugas Anda!
          </p>
          <button
            onClick={() => navigate('/ruang-belajar')}
            className="px-5 py-2.5 bg-[#FACC15] text-[#0F172A] border-2 border-[#0F172A] font-fredoka text-xs font-bold rounded-xl shadow-[3px_3px_0px_#0F172A] hover:-translate-y-0.5 active:translate-y-[0.5px] cursor-pointer transition-all"
          >
            Buka Ruang Belajar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 md:px-6 py-8 text-left max-w-4xl mx-auto flex flex-col gap-6">
      <div className="border-b-2 border-dashed border-slate-350 pb-4">
        <h2 className="font-fredoka text-2xl md:text-3xl font-bold text-[#0F172A] flex items-center gap-2">
          <i className="ti ti-checklist text-[#EC4899]" />
          Daftar Tugasku
        </h2>
        <p className="font-nunito text-xs text-slate-500 font-bold mt-1">
          Daftar seluruh tugas dan proyek yang perlu diselesaikan dari kelas: {activeRoom.name}.
        </p>
      </div>

      {isLoading ? (
        <div className="neo-card p-12 text-center">
          <i className="ti ti-loader animate-spin text-3xl text-blue-600 mb-2" />
          <p className="font-nunito text-xs text-slate-500 font-bold">Memuat daftar tugas Anda...</p>
        </div>
      ) : pendingTasks.length === 0 ? (
        <div className="neo-card p-12 text-center border-4 border-[#0F172A] shadow-[6px_6px_0px_#0F172A] bg-slate-50">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-[#0F172A]">
            <i className="ti ti-clipboard-off text-3xl" />
          </div>
          <h3 className="font-fredoka text-xl font-bold text-[#0F172A] mb-1">Tidak ada tugas</h3>
          <p className="font-nunito text-xs text-slate-500 font-bold leading-relaxed max-w-md mx-auto">
            Belum ada tugas yang perlu dikerjakan saat ini.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {pendingTasks.map((task, idx) => {
            const isPreTest = task.tipe === 'pretest';
            const isPostTest = task.tipe === 'posttest';
            const isProject = task.tipe === 'project';
            
            return (
              <div 
                key={task.id || idx}
                className="neo-card p-5 border-4 border-[#0F172A] shadow-[6px_6px_0px_#0F172A] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white hover:-translate-y-0.5 transition-all"
              >
                <div className="text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-fredoka font-bold border ${
                      isPreTest || isPostTest
                        ? 'bg-purple-105 text-purple-700 border-purple-200'
                        : isProject
                        ? 'bg-amber-100 text-amber-700 border-amber-200'
                        : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    }`}>
                      {task.tipe?.toUpperCase() || 'MISI BELAJAR'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-nunito font-bold">Urutan: {task.urutan}</span>
                  </div>
                  
                  <h3 className="font-fredoka text-base md:text-lg font-bold text-[#0F172A]">
                    {task.judul}
                  </h3>
                  <p className="font-nunito text-xs text-slate-500 font-semibold mt-1">
                    {isPreTest 
                      ? 'Evaluasi awal kemampuan berpikir komputasional.' 
                      : isPostTest 
                      ? 'Evaluasi akhir pencapaian belajar.' 
                      : isProject 
                      ? 'Terapkan konsep coding untuk memecahkan tantangan proyek kreatif.' 
                      : 'Rakit blok HTML & CSS pemrograman web secara terpandu.'}
                  </p>
                </div>

                <button
                  onClick={() => navigate(`/ruang-belajar/${activeRoom.id}/tugas/${task.id}`)}
                  className="px-5 py-2.5 bg-blue-600 text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] font-fredoka text-xs font-bold rounded-xl hover:-translate-y-0.5 active:translate-y-[0.5px] cursor-pointer transition-all flex items-center gap-1.5 shrink-0"
                >
                  <i className="ti ti-arrow-right" />
                  Mulai Kerjakan
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
