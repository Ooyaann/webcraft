import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from '@/lib/router-compat';
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

  const cleanName = user.name ? user.name.replace(/\s*\((Siswa|Guru)\)/i, '') : 'Guru';
  const greetingName = /^(bapak|ibu|pak|bu)\b/i.test(cleanName)
    ? cleanName
    : `Bapak/Ibu ${cleanName}`;

  return (
    <div className="w-full flex flex-col gap-8 py-8 px-4 md:px-6 text-left max-w-[1400px] mx-auto neo-page-enter">
      {/* Welcome Banner */}
      <section className="neo-stagger-1 bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 text-white border-4 border-[#0F172A] p-8 rounded-[28px] shadow-[8px_8px_0px_#0F172A] relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="bg-yellow-300 text-slate-900 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] inline-block mb-3 font-fredoka">
              <i className="ti ti-briefcase mr-1" /> Panel Pendidik
            </span>
            <h2 className="font-fredoka text-2xl md:text-4xl font-bold text-white mb-2 tracking-wide leading-tight">
              Selamat Datang, {greetingName}!
            </h2>
            <p className="font-nunito text-xs md:text-sm text-emerald-50 font-extrabold max-w-xl leading-relaxed">
              Selamat bekerja! Kelola ruang kelas, awasi perkembangan berpikir komputasional, serta tinjau hasil karya web siswa Anda di sini.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm border-2 border-white/20 px-5 py-3 rounded-2xl flex items-center gap-3 shrink-0 shadow-inner">
            <i className="ti ti-calendar-stats text-3xl text-yellow-300 animate-pulse" />
            <div className="text-left">
              <span className="text-[10px] font-bold text-yellow-300 block uppercase font-fredoka">Hari Ini</span>
              <span className="font-fredoka text-xs md:text-sm font-black text-white">
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Row */}
      <section className="neo-stagger-2 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-tr from-blue-500 to-indigo-700 text-white border-4 border-[#0F172A] p-5.5 rounded-2xl shadow-[6px_6px_0px_#0F172A] flex items-center justify-between gap-4 hover:-translate-y-0.5 transition-all">
          <div className="flex flex-col gap-1.5">
            <span className="font-fredoka text-[11px] font-black text-indigo-100 uppercase tracking-widest block">Kelas Dikelola</span>
            <span className="font-fredoka text-3xl md:text-4xl font-black text-white">{rooms.length}</span>
          </div>
          <div className="w-14 h-14 bg-white/15 border-2 border-white/25 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
            <i className="ti ti-school text-3xl text-white" />
          </div>
        </div>

        <div className="bg-gradient-to-tr from-amber-400 to-orange-500 text-slate-900 border-4 border-[#0F172A] p-5.5 rounded-2xl shadow-[6px_6px_0px_#0F172A] flex items-center justify-between gap-4 hover:-translate-y-0.5 transition-all">
          <div className="flex flex-col gap-1.5">
            <span className="font-fredoka text-[11px] font-black text-orange-950 uppercase tracking-widest block">Perlu Dinilai</span>
            <span className="font-fredoka text-3xl md:text-4xl font-black text-slate-900">{pendingGradingCount}</span>
          </div>
          <div className="w-14 h-14 bg-slate-900/10 border-2 border-slate-900/15 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
            <i className="ti ti-clock text-3xl text-slate-900 animate-spin-slow" />
          </div>
        </div>

        <div className="bg-gradient-to-tr from-pink-500 to-rose-600 text-white border-4 border-[#0F172A] p-5.5 rounded-2xl shadow-[6px_6px_0px_#0F172A] flex items-center justify-between gap-4 hover:-translate-y-0.5 transition-all">
          <div className="flex flex-col gap-1.5">
            <span className="font-fredoka text-[11px] font-black text-pink-100 uppercase tracking-widest block">Total Submission</span>
            <span className="font-fredoka text-3xl md:text-4xl font-black text-white">{projectSubmissions.length}</span>
          </div>
          <div className="w-14 h-14 bg-white/15 border-2 border-white/25 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
            <i className="ti ti-send text-3xl text-white" />
          </div>
        </div>
      </section>

      {/* Class list */}
      <section className="neo-stagger-3 bg-white border-4 border-[#0F172A] p-6 md:p-8 rounded-[28px] shadow-[8px_8px_0px_#0F172A]">
        <h3 className="font-fredoka text-lg md:text-xl font-bold text-[#0F172A] mb-6 flex items-center gap-2.5 border-b-4 border-dashed border-slate-100 pb-4">
          <span className="bg-blue-100 text-blue-600 w-9 h-9 rounded-xl border-2 border-[#0F172A] flex items-center justify-center shadow-[1.5px_1.5px_0px_#0F172A] shrink-0">
            <i className="ti ti-layout text-lg" />
          </span>
          Daftar Ruang Kelas Saya
        </h3>

        {isLoading ? (
          <div className="py-12 text-center">
            <div className="neo-spinner mx-auto mb-3" />
            <p className="font-nunito text-xs text-slate-500 font-bold">Memuat kelas...</p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="py-12 text-center border-4 border-dashed border-slate-200 rounded-[20px] bg-slate-50/50">
            <i className="ti ti-folders text-4xl text-slate-300 mb-2 block" />
            <p className="font-nunito text-xs text-slate-500 font-bold">Bapak/Ibu belum membuat kelas manapun.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="border-3 border-[#0F172A] p-5 rounded-2xl flex flex-col justify-between bg-gradient-to-br from-slate-50 to-indigo-50/10 hover:to-indigo-50/20 hover:-translate-y-0.5 transition-all shadow-[4px_4px_0px_#0F172A] text-left gap-5"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h4 className="font-fredoka text-base md:text-lg font-bold text-[#0F172A]">{room.name}</h4>
                    <p className="font-nunito text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wide">
                      Mata Pelajaran Web Development
                    </p>
                  </div>
                  <div className="bg-yellow-300 text-slate-900 border-2 border-[#0F172A] px-3 py-1.5 rounded-lg shadow-[2px_2px_0px_#0F172A] font-fredoka font-black text-xs tracking-wider shrink-0 select-all">
                    {room.code}
                  </div>
                </div>

                <button
                  onClick={() => handleOpenRoom(room)}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white border-3 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] font-fredoka text-xs font-bold rounded-xl hover:-translate-y-0.5 active:translate-y-[0.5px] cursor-pointer transition-all flex items-center justify-center gap-1.5"
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
