import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { useStore } from '../../store/useStore';
import api from '../../services/api';

export default function BerandaSiswa({ user }) {
  const navigate = useNavigate();
  const { activeRoom } = useStore();
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [projectSubmissions, setProjectSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Fetch submissions for stats
    api.get('/submissions/learning/me')
      .then((res) => setSubmissions(res.data || []))
      .catch(() => { });

    api.get('/submissions/project/me')
      .then((res) => setProjectSubmissions(res.data || []))
      .catch(() => { });

    // Fetch student's class assignments if connected to a room
    if (activeRoom) {
      setIsLoading(true);
      api.get(`/rooms/${activeRoom.id}/pertemuan`)
        .then((res) => setTasks(res.data || []))
        .catch((err) => console.error('Error loading tasks:', err))
        .finally(() => setIsLoading(false));
    }
  }, [activeRoom]);

  // Sembunyikan pertemuan yang sudah TUNTAS — aturan sama dengan RoomDetail:
  // misi belajar di bawah KKM (remidi) tetap tampil agar dikerjakan ulang.
  const completedIds = new Set([
    ...submissions.filter((s) => s.tuntas !== false).map((s) => s.pertemuan_id).filter(Boolean),
    ...projectSubmissions.map((p) => p.pertemuan_id).filter(Boolean),
  ]);
  const remedialIds = new Set(
    submissions.filter((s) => s.tuntas === false).map((s) => s.pertemuan_id).filter(Boolean),
  );
  const activeTasks = tasks
    .filter((t) => t.is_published && !completedIds.has(t.id))
    .slice(0, 3);

  // Find real teacher feedback from project or learning submissions
  const latestFeedback = useMemo(() => {
    const gradedProjects = projectSubmissions.filter(s => s.teacher_comment && s.teacher_comment.trim() !== '');
    if (gradedProjects.length > 0) {
      const latestProj = gradedProjects[gradedProjects.length - 1];
      return {
        author: 'Guru Kelas',
        text: latestProj.teacher_comment,
        score: latestProj.teacher_score,
        task: latestProj.task_title
      };
    }
    return null;
  }, [projectSubmissions]);

  return (
    <div className="w-full flex flex-col gap-6 py-8 px-4 md:px-6 text-left max-w-[1400px] mx-auto neo-page-enter">
      {/* Welcome Banner — colorful, solid vibrant gradient background */}
      <section
        className="neo-stagger-1 border-4 border-[#0F172A] p-6 rounded-[24px] shadow-[6px_6px_0px_#0F172A] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #DBEAFE 0%, #FCE7F3 50%, #D1FAE5 100%)' }}
      >
        {/* Animated Background Shape inside Welcome Banner */}
        <div
          className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20 pointer-events-none animate-float-symbol"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}
        />
        <div className="relative z-10">
          <h2 className="font-fredoka text-2xl md:text-3xl font-bold text-[#0F172A] mb-1">
            Selamat Datang, {user.name ? user.name.replace(/\s*\((Siswa|Guru)\)/i, '') : ''}!
          </h2>
          <p className="font-nunito text-xs text-slate-700 font-bold">
            Siap lanjutkan tantangan coding hari ini?
          </p>
        </div>
        
        {/* Role Badge - premium styled box containing only "Siswa" */}
        <div className="flex items-center gap-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-3 border-[#0F172A] px-4.5 py-2.5 rounded-2xl shadow-[4px_4px_0px_#0F172A] shrink-0 font-fredoka font-bold text-sm select-none hover:-translate-y-0.5 transition-all">
          <div className="w-8 h-8 bg-white/15 border-2 border-white/25 rounded-xl flex items-center justify-center shadow-inner shrink-0">
            <i className="ti ti-user text-white text-base animate-pulse" />
          </div>
          <span className="tracking-wide">Siswa</span>
        </div>
      </section>

      {/* Classroom Announcement Board */}
      {activeRoom?.announcement && (
        <section className="neo-stagger-2 bg-pastel-yellow border-4 border-[#0F172A] p-5 rounded-[24px] shadow-[6px_6px_0px_#0F172A] text-left flex flex-col gap-2 relative overflow-hidden transition-transform hover:-translate-y-0.5">
          <div className="absolute right-0 top-0 w-24 h-24 bg-amber-200/30 rounded-full blur-xl -mr-6 -mt-6 pointer-events-none" />
          <h3 className="font-fredoka text-sm font-bold text-[#0F172A] flex items-center gap-1.5 z-10">
            <i className="ti ti-bell-ringing text-lg animate-bounce" style={{ animationDuration: '2s' }} />
            Pengumuman Kelas Baru
          </h3>
          <p className="font-nunito text-xs text-slate-800 font-semibold leading-relaxed z-10 whitespace-pre-line">
            {activeRoom.announcement}
          </p>
        </section>
      )}

      {/* Quick Navigation Cards — soft vibrant gradients with neo-brutalist frame */}
      <section className="neo-stagger-3 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            icon: 'ti-school',
            label: 'Ruang Belajar',
            desc: 'Buka kelas',
            color: '#3B82F6',
            bgClass: 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white',
            descColor: 'text-blue-100',
            to: '/ruang-belajar',
          },
          {
            icon: 'ti-photo-heart',
            label: 'Galeri Karya',
            desc: 'Lihat karya',
            color: '#EC4899',
            bgClass: 'bg-gradient-to-br from-pink-500 to-rose-600 text-white',
            descColor: 'text-pink-100',
            to: '/galeri',
          },
          {
            icon: 'ti-checklist',
            label: 'Tugasku',
            desc: 'Cek tugas',
            color: '#10B981',
            bgClass: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white',
            descColor: 'text-emerald-100',
            to: '/tugasku',
          },
          {
            icon: 'ti-circle-check',
            label: 'Misi Dikirim',
            desc: `${submissions.length + projectSubmissions.length} misi`,
            color: '#F59E0B',
            bgClass: 'bg-gradient-to-br from-amber-300 to-yellow-500 text-[#0F172A]',
            descColor: 'text-slate-700',
            to: null,
          },
        ].map((item, idx) => (
          <button
            key={idx}
            onClick={() => item.to && navigate(item.to)}
            className={`border-4 border-[#0F172A] p-4 rounded-2xl shadow-[4px_4px_0px_#0F172A] text-center neo-hover-bounce flex flex-col items-center gap-2.5 ${item.bgClass} ${item.to ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] bg-white text-slate-800 transform hover:scale-110 transition-transform">
              <i className={`ti ${item.icon} text-xl`} style={{ color: item.color }} />
            </div>
            <div>
              <p className="font-fredoka text-sm font-bold leading-tight">
                {item.label}
              </p>
              <p className={`font-nunito text-[10px] font-bold mt-0.5 ${item.descColor}`}>
                {item.desc}
              </p>
            </div>
          </button>
        ))}
      </section>

      {/* Grid: Active Missions + Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Active Missions (Left Panel) */}
        <div className="lg:col-span-7 neo-stagger-4 bg-pastel-blue border-4 border-[#0F172A] p-6 rounded-[24px] shadow-[6px_6px_0px_#0F172A] flex flex-col justify-between relative overflow-hidden">
          {/* Subtle floating symbol accent */}
          <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-blue-300/35 flex items-center justify-center text-sm font-fredoka border border-blue-400/50 animate-float-symbol pointer-events-none">⭐</div>
          
          <div>
            <h3 className="font-fredoka text-base font-bold text-[#0F172A] mb-4 flex items-center gap-2 border-b-2 border-dashed border-[#0F172A]/20 pb-3">
              <i className="ti ti-checklist text-[#EC4899] text-lg animate-pulse" />
              Misi Aktif Kelas
            </h3>

            {isLoading ? (
              <div className="py-6 text-center">
                <div className="neo-spinner mx-auto mb-2" />
                <p className="font-nunito text-xs text-slate-500 font-bold">
                  Memuat tugas...
                </p>
              </div>
            ) : !activeRoom ? (
              <div className="text-center py-6">
                <p className="font-nunito text-xs text-slate-500 font-bold mb-4">
                  Belum bergabung ke kelas manapun.
                </p>
                <button
                  onClick={() => navigate('/ruang-belajar')}
                  className="px-4 py-2 border-2 border-[#0F172A] font-fredoka text-xs font-bold rounded-xl shadow-[3px_3px_0px_#0F172A] hover:-translate-y-0.5 active:translate-y-[0.5px] cursor-pointer transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #FACC15, #FDE68A)',
                    color: '#0F172A',
                  }}
                >
                  Gabung Kelas
                </button>
              </div>
            ) : activeTasks.length === 0 ? (
              <p className="font-nunito text-xs text-slate-550 font-bold text-center py-6">
                Tidak ada tugas aktif saat ini.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {activeTasks.map((t, index) => (
                  <div
                    key={t.id}
                    className={`border-2 border-[#0F172A] p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[3px_3px_0px_#0F172A] hover:-translate-y-1 active:translate-y-[1px] active:shadow-[1px_1px_0px_#0F172A] transition-all cursor-pointer ${
                      index % 2 === 0 ? 'bg-[#EFF6FF]' : 'bg-[#ECFDF5]' // Alternating light pastel blue and mint
                    }`}
                  >
                    <div className="text-left min-w-0 w-full sm:w-auto">
                      <h4 className="font-fredoka text-sm font-bold text-[#0F172A] line-clamp-2">
                        {t.judul}
                      </h4>
                      <span className={`inline-block px-2 py-0.5 border border-[#0F172A] rounded-md text-[8px] font-black uppercase mt-1.5 shadow-[1px_1px_0px_#0F172A] ${
                        t.tipe === 'project' ? 'bg-pink-300 text-[#0F172A]' : 'bg-blue-300 text-[#0F172A]'
                      }`}>
                        {t.tipe === 'project' ? 'Proyek Kreatif' : 'Misi Belajar'}
                      </span>
                      {remedialIds.has(t.id) && (
                        <span className="inline-block px-2 py-0.5 border border-[#0F172A] rounded-md text-[8px] font-black uppercase mt-1.5 ml-1.5 shadow-[1px_1px_0px_#0F172A] bg-amber-300 text-[#0F172A]">
                          <i className="ti ti-refresh mr-0.5" />Remidi
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => navigate(`/ruang-belajar/${activeRoom.id}/tugas/${t.id}`)}
                      className="w-full sm:w-auto px-3.5 py-1.5 bg-[#FACC15] text-[#0F172A] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] font-fredoka text-[10px] font-bold rounded-xl hover:-translate-y-0.5 active:translate-y-[1px] cursor-pointer transition-all shrink-0 flex items-center justify-center"
                    >
                      Mulai
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Notifications from Teacher (Right Panel) */}
        <div className="lg:col-span-5 neo-stagger-5 bg-pastel-peach border-4 border-[#0F172A] p-6 rounded-[24px] shadow-[6px_6px_0px_#0F172A] flex flex-col justify-between relative overflow-hidden">
          {/* Subtle floating graduation cap accent */}
          <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-pink-300/35 flex items-center justify-center text-sm font-fredoka border border-pink-400/50 animate-float-symbol pointer-events-none" style={{ animationDelay: '3s' }}>🎓</div>

          <div>
            <h3 className="font-fredoka text-base font-bold text-[#0F172A] mb-4 flex items-center gap-2 border-b-2 border-dashed border-[#0F172A]/20 pb-3">
              <i className="ti ti-bell text-amber-500 text-lg animate-wiggle" style={{ animationDuration: '1.2s' }} />
              Notifikasi dari Guru
            </h3>

            <div className="flex flex-col gap-3">
              {!latestFeedback ? (
                <div className="border-2 border-[#0F172A] border-dashed p-4 rounded-xl text-center bg-[#FFF1F2] text-slate-650 font-nunito text-xs font-bold leading-normal">
                  Belum ada umpan balik dari Guru kelas. Tetap semangat berlatih coding ya!
                </div>
              ) : (
                <div className="border-2 border-[#0F172A] shadow-[4px_4px_0px_#0F172A] p-4 rounded-2xl bg-[#FFFBEB] text-xs font-nunito font-bold flex flex-col gap-2 text-left hover:-translate-y-0.5 transition-transform">
                  <div className="flex justify-between items-center border-b-2 border-dashed border-[#0F172A]/25 pb-1.5 mb-0.5">
                    <span className="font-fredoka text-slate-800 text-xs">
                      {latestFeedback.author}
                    </span>
                    <span className="bg-[#6366F1] text-white px-2 py-0.5 rounded-lg text-[9px] border-2 border-[#0F172A] font-fredoka shadow-[1px_1px_0px_#0F172A]">
                      {latestFeedback.task}
                    </span>
                  </div>
                  <p className="text-slate-700 font-semibold leading-relaxed italic">
                    "{latestFeedback.text}"
                  </p>
                  {latestFeedback.score && (
                    <div className="text-[9px] text-slate-400 font-bold mt-1 text-right flex justify-between items-center border-t border-slate-100 pt-1.5">
                      <span>Kategori: Lulus</span>
                      <span>
                        Skor: <span className="text-[#6366F1] font-fredoka text-sm font-black">{latestFeedback.score}/100</span>
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
