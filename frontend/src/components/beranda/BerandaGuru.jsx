import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import api from '../../services/api';

export default function BerandaGuru({ user }) {
  const navigate = useNavigate();
  const { setActiveRoom } = useStore();
  const [rooms, setRooms] = useState([]);
  const [projectSubmissions, setProjectSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    api.get('/rooms')
      .then(res => setRooms(res.data || []))
      .catch(err => console.error("Error loading rooms:", err))
      .finally(() => setIsLoading(false));

    api.get('/submissions/project')
      .then(res => setProjectSubmissions(res.data || []))
      .catch(err => console.error("Error loading project submissions:", err));
  }, []);

  const handleOpenRoom = (room) => {
    setActiveRoom(room);
    navigate(`/ruang-belajar/${room.id}`);
  };

  const pendingGradingCount = useMemo(() => {
    return projectSubmissions.filter(s => s.teacher_score === null).length;
  }, [projectSubmissions]);

  return (
    <div className="w-full flex flex-col gap-8 py-8 px-4 md:px-6 text-left max-w-[1400px] mx-auto neo-page-enter">
      {/* Welcome Banner */}
      <section className="neo-stagger-1 bg-gradient-to-r from-blue-50 to-indigo-50 border-4 border-[#0F172A] p-6 rounded-[24px] shadow-[6px_6px_0px_#0F172A] relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-blue-200/40 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

        <div className="relative z-10">
          <h2 className="font-fredoka text-2xl md:text-3xl font-bold text-[#0F172A] mb-1">
            Selamat Datang, {user.name ? user.name.replace(/\s*\((Siswa|Guru)\)/i, '') : ''}!
          </h2>
          <p className="font-nunito text-xs text-slate-600 font-bold">
            Kelola kelas dan tinjau perkembangan siswa Anda di sini.
          </p>
        </div>
      </section>

      {/* Metrics Row */}
      <section className="neo-stagger-2 grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-pastel-blue border-4 border-[#0F172A] p-5 rounded-2xl shadow-[4px_4px_0px_#0F172A] flex items-center gap-4 neo-hover-bounce">
          <div className="w-12 h-12 bg-blue-100 border-2 border-[#0F172A] text-blue-600 rounded-xl flex items-center justify-center shadow-[2px_2px_0px_#0F172A] shrink-0">
            <i className="ti ti-school text-2xl" />
          </div>
          <div>
            <span className="font-nunito text-[10px] font-black text-slate-400 uppercase tracking-widest block">Kelas Dikelola</span>
            <span className="font-fredoka text-2xl font-bold text-slate-800">{rooms.length}</span>
          </div>
        </div>

        <div className="bg-pastel-peach border-4 border-[#0F172A] p-5 rounded-2xl shadow-[4px_4px_0px_#0F172A] flex items-center gap-4 neo-hover-bounce">
          <div className="w-12 h-12 bg-pink-100 border-2 border-[#0F172A] text-pink-600 rounded-xl flex items-center justify-center shadow-[2px_2px_0px_#0F172A] shrink-0">
            <i className="ti ti-clock text-2xl" />
          </div>
          <div>
            <span className="font-nunito text-[10px] font-black text-slate-400 uppercase tracking-widest block">Perlu Dinilai</span>
            <span className="font-fredoka text-2xl font-bold text-slate-800">{pendingGradingCount}</span>
          </div>
        </div>

        <div className="bg-pastel-mint border-4 border-[#0F172A] p-5 rounded-2xl shadow-[4px_4px_0px_#0F172A] flex items-center gap-4 neo-hover-bounce">
          <div className="w-12 h-12 bg-emerald-100 border-2 border-[#0F172A] text-emerald-600 rounded-xl flex items-center justify-center shadow-[2px_2px_0px_#0F172A] shrink-0">
            <i className="ti ti-send text-2xl" />
          </div>
          <div>
            <span className="font-nunito text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Submission</span>
            <span className="font-fredoka text-2xl font-bold text-slate-800">{projectSubmissions.length}</span>
          </div>
        </div>
      </section>

      {/* Class list */}
      <section className="neo-stagger-3 bg-pastel-lavender border-4 border-[#0F172A] p-6 rounded-[24px] shadow-[6px_6px_0px_#0F172A]">
        <h3 className="font-fredoka text-lg font-bold text-[#0F172A] mb-4 flex items-center gap-2 border-b-2 border-dashed border-slate-200 pb-3">
          <i className="ti ti-layout text-blue-600 text-xl" />
          Daftar Ruang Kelas Saya
        </h3>

        {isLoading ? (
          <div className="py-6 text-center">
            <div className="neo-spinner mx-auto mb-2" />
            <p className="font-nunito text-xs text-slate-500 font-bold">Memuat kelas...</p>
          </div>
        ) : rooms.length === 0 ? (
          <p className="font-nunito text-xs text-slate-500 font-bold text-center py-6">Anda belum membuat kelas manapun.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="border-2 border-[#0F172A] p-4 rounded-xl flex flex-col justify-between bg-white hover:bg-slate-50 transition-all shadow-[3px_3px_0px_#0F172A] text-left gap-4 neo-hover-bounce"
              >
                <div>
                  <h4 className="font-fredoka text-base font-bold text-[#0F172A]">{room.name}</h4>
                  <p className="font-nunito text-[10px] font-bold text-slate-500 mt-1 uppercase">
                    Kode Kelas: <span className="text-blue-600 tracking-wider font-fredoka text-xs">{room.code}</span>
                  </p>
                </div>
                <button
                  onClick={() => handleOpenRoom(room)}
                  className="w-full py-2 bg-blue-600 text-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] font-fredoka text-xs font-bold rounded-lg hover:-translate-y-0.5 active:translate-y-[0.5px] cursor-pointer transition-all flex items-center justify-center gap-1.5"
                >
                  <i className="ti ti-settings" />
                  Kelola Kelas
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
