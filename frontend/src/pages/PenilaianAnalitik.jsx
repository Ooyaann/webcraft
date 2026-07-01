import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import api from '../services/api';
import { aiService } from '../services/aiService';

export default function PenilaianAnalitik() {
  const { activeRoom, setActiveRoom } = useStore();
  const [rooms, setRooms] = useState([]);
  const [projectSubmissions, setProjectSubmissions] = useState([]);
  const [studentGrades, setStudentGrades] = useState([]);
  const [insights, setInsights] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Fetch rooms list on mount
  useEffect(() => {
    api.get('/rooms')
      .then(res => {
        const list = res.data || [];
        setRooms(list);
        if (!activeRoom && list.length > 0) {
          setActiveRoom(list[0]);
        }
      })
      .catch(err => console.error("Error fetching rooms list:", err));
  }, []);

  // Load submissions and class insights whenever activeRoom changes
  useEffect(() => {
    if (activeRoom) {
      fetchData();
    } else {
      setIsLoading(false);
    }
  }, [activeRoom]);

  const fetchData = async () => {
    if (!activeRoom) return;
    setIsLoading(true);
    try {
      // 1. Fetch project submissions
      const subRes = await api.get('/submissions/project');
      const allSubs = subRes.data || [];
      const roomSubs = allSubs.filter(sub => sub.room_id === activeRoom.id);
      setProjectSubmissions(roomSubs);

      // 2. Fetch real student grades for this room
      const gradesRes = await api.get(`/rooms/${activeRoom.id}/grades`);
      setStudentGrades(gradesRes.data || []);

      // 3. Fetch AI class insights for active room
      const insRes = await aiService.getClassInsights(activeRoom.id, 'easy-1');
      setInsights(insRes);
    } catch (err) {
      console.error("Gagal memuat data analitik kelas:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Compute Grade Distribution metrics dynamically
  const distributionData = useMemo(() => {
    let under70 = 0, under80 = 0, under90 = 0, under100 = 0;
    studentGrades.forEach(s => {
      const avg = Math.round(((s.pre || 0) + (s.learning || 0) + (s.project || 80)) / 3);
      if (avg < 70) under70++;
      else if (avg < 80) under80++;
      else if (avg < 90) under90++;
      else under100++;
    });

    return {
      under70,
      under80,
      under90,
      under100
    };
  }, [studentGrades]);

  // Compute class average for each CT pillar dynamically
  const classPillarData = useMemo(() => {
    if (studentGrades.length === 0) {
      return [
        { name: 'Dekomposisi', score: 0, color: 'bg-blue-500', text: 'blue-600' },
        { name: 'Abstraksi', score: 0, color: 'bg-pink-500', text: 'pink-650' },
        { name: 'Pengenalan Pola', score: 0, color: 'bg-amber-500', text: 'amber-600' },
        { name: 'Desain Algoritma', score: 0, color: 'bg-emerald-500', text: 'emerald-600' }
      ];
    }
    const sumDecomp = studentGrades.reduce((sum, s) => sum + (s.decomposition || 0), 0);
    const sumAbstract = studentGrades.reduce((sum, s) => sum + (s.abstraction || 0), 0);
    const sumPattern = studentGrades.reduce((sum, s) => sum + (s.pattern_recognition || 0), 0);
    const sumAlgo = studentGrades.reduce((sum, s) => sum + (s.algorithm_design || 0), 0);
    const count = studentGrades.length;

    return [
      { name: 'Dekomposisi', score: Math.round(sumDecomp / count), color: 'bg-blue-500', text: 'blue-600' },
      { name: 'Abstraksi', score: Math.round(sumAbstract / count), color: 'bg-pink-500', text: 'pink-650' },
      { name: 'Pengenalan Pola', score: Math.round(sumPattern / count), color: 'bg-amber-500', text: 'amber-600' },
      { name: 'Desain Algoritma', score: Math.round(sumAlgo / count), color: 'bg-emerald-500', text: 'emerald-600' }
    ];
  }, [studentGrades]);

  // Compute class average CT score
  const classAverageCT = useMemo(() => {
    if (studentGrades.length === 0) return 0;
    const total = studentGrades.reduce((sum, s) => sum + (s.ct || 0), 0);
    return Math.round(total / studentGrades.length);
  }, [studentGrades]);

  // Compute class participation rate
  const participationRate = useMemo(() => {
    if (studentGrades.length === 0) return 0;
    const activeStudents = studentGrades.filter(s => s.learning > 0 || s.project > 0).length;
    return Math.round((activeStudents / studentGrades.length) * 100);
  }, [studentGrades]);

  return (
    <div className="w-full px-4 md:px-6 py-8 flex flex-col gap-8 text-left max-w-[1200px] mx-auto">
      {/* Title */}
      <div>
        <h2 className="font-fredoka text-3xl font-bold text-slate-800 mb-1">Penilaian & Analitik Kelas</h2>
        <p className="font-nunito text-slate-650 font-semibold">
          Pantau rekapitulasi nilai, statistik pencapaian kognitif, dan peta kesulitan berpikir komputasional siswa secara real-time.
        </p>
      </div>

      {/* Custom Class Selector Dropdown */}
      {rooms.length > 0 && (
        <div className="bg-white border-4 border-[#0F172A] shadow-[6px_6px_0px_#0F172A] p-5 rounded-[24px] flex flex-col sm:flex-row gap-4 items-center justify-between relative z-30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 border-2 border-[#0F172A] rounded-xl flex items-center justify-center shadow-[2px_2px_0px_#0F172A] text-blue-600 shrink-0">
              <i className="ti ti-school text-xl" />
            </div>
            <div>
              <span className="font-nunito text-[9px] font-black text-slate-400 uppercase tracking-widest block">Manajemen Kelas</span>
              <span className="font-fredoka text-base font-bold text-slate-800">Kelas Aktif Saat Ini</span>
            </div>
          </div>

          <div className="relative w-full sm:w-80">
            {/* Custom Dropdown Trigger */}
            <div
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-[#0F172A] rounded-xl font-fredoka font-bold text-blue-700 shadow-[3px_3px_0px_#0F172A] hover:-translate-y-0.5 active:translate-y-[0.5px] cursor-pointer flex justify-between items-center transition-all select-none"
            >
              <span className="truncate mr-2">
                {activeRoom ? `${activeRoom.name}` : 'Pilih Kelas...'}
              </span>
              <i className={`ti ti-chevron-down text-base font-bold transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* Custom Dropdown Menu */}
            {isDropdownOpen && (
              <>
                {/* Backdrop overlay to close when clicking outside */}
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setIsDropdownOpen(false)}
                />

                <div className="absolute right-0 top-full mt-2 w-full bg-white border-2 border-[#0F172A] shadow-[5px_5px_0px_#0F172A] rounded-xl z-50 overflow-hidden flex flex-col max-h-60 overflow-y-auto">
                  {rooms.map((room) => {
                    const isSelected = room.id === activeRoom?.id;
                    return (
                      <button
                        key={room.id}
                        type="button"
                        onClick={() => {
                          setActiveRoom(room);
                          setIsDropdownOpen(false);
                        }}
                        className={`px-4 py-3 text-left font-nunito font-bold text-xs border-b border-dashed border-slate-100 transition-colors cursor-pointer w-full flex justify-between items-center ${isSelected
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'text-[#0F172A] hover:bg-blue-50 hover:text-blue-700'
                          }`}
                      >
                        <span className="truncate pr-2">{room.name}</span>
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-fredoka font-bold border shrink-0 ${isSelected
                            ? 'bg-blue-500 text-white border-blue-400'
                            : 'bg-yellow-300 text-[#0F172A] border-[#0F172A]'
                          }`}>
                          {room.code}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {!activeRoom ? (
        <div className="py-16 text-center border-4 border-[#0F172A] rounded-[24px] bg-white shadow-[6px_6px_0px_#0F172A] p-8 max-w-xl mx-auto flex flex-col items-center gap-3">
          <div className="w-16 h-16 bg-slate-100 border-2 border-slate-350 text-slate-400 rounded-2xl flex items-center justify-center shadow-[2px_2px_0px_#0F172A]">
            <i className="ti ti-school text-3xl" />
          </div>
          <h3 className="font-fredoka text-xl font-bold text-slate-800">Pilih Ruang Kelas Terlebih Dahulu</h3>
          <p className="font-nunito text-xs text-slate-500 font-bold max-w-sm leading-relaxed">
            Masuk ke menu Ruang Belajar dan pilih salah satu kelas aktif Anda untuk melihat buku nilai dan analisis perkembangan siswa.
          </p>
        </div>
      ) : isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center bg-white border-4 border-[#0F172A] rounded-2xl shadow-[6px_6px_0px_#0F172A]">
          <i className="ti ti-loader animate-spin text-4xl text-slate-400" />
          <p className="font-nunito font-bold text-slate-500 mt-4">Memuat data analitik...</p>
        </div>
      ) : studentGrades.length === 0 ? (
        <div className="py-16 text-center border-4 border-[#0F172A] rounded-[24px] bg-white shadow-[6px_6px_0px_#0F172A] p-8 max-w-xl mx-auto flex flex-col items-center gap-3">
          <div className="w-16 h-16 bg-slate-100 border-2 border-slate-350 text-slate-400 rounded-2xl flex items-center justify-center shadow-[2px_2px_0px_#0F172A]">
            <i className="ti ti-users text-3xl" />
          </div>
          <h3 className="font-fredoka text-xl font-bold text-slate-800">Belum Ada Siswa Bergabung</h3>
          <p className="font-nunito text-xs text-slate-500 font-bold max-w-sm leading-relaxed">
            Berikan Kode Kelas <strong className="text-blue-600 text-sm uppercase tracking-wide">"{activeRoom.code}"</strong> kepada siswa Anda agar mereka dapat bergabung dan mulai mengerjakan misi belajar!
          </p>
        </div>
      ) : (
        <>
          {/* Summary Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border-2 border-[#0F172A] p-4 rounded-xl shadow-[3px_3px_0px_#0F172A] text-center">
              <span className="font-nunito text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Rata-rata CT Kelas</span>
              <span className="font-fredoka text-2xl font-bold text-blue-600">{classAverageCT}%</span>
            </div>
            <div className="bg-white border-2 border-[#0F172A] p-4 rounded-xl shadow-[3px_3px_0px_#0F172A] text-center">
              <span className="font-nunito text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Siswa Aktif</span>
              <span className="font-fredoka text-2xl font-bold text-[#0F172A]">{studentGrades.length} Siswa</span>
            </div>
            <div className="bg-white border-2 border-[#0F172A] p-4 rounded-xl shadow-[3px_3px_0px_#0F172A] text-center">
              <span className="font-nunito text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Proyek Disubmit</span>
              <span className="font-fredoka text-2xl font-bold text-emerald-600">{projectSubmissions.length} Karya</span>
            </div>
            <div className="bg-white border-2 border-[#0F172A] p-4 rounded-xl shadow-[3px_3px_0px_#0F172A] text-center">
              <span className="font-nunito text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Partisipasi Misi</span>
              <span className="font-fredoka text-2xl font-bold text-pink-600">{participationRate}%</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Left Panel: Table of student grades */}
            <div className="lg:col-span-8 bg-white border-4 border-[#0F172A] shadow-[6px_6px_0px_#0F172A] p-6 rounded-[24px] flex flex-col justify-between overflow-hidden">
              <div className="w-full">
                <h3 className="font-fredoka text-lg font-bold text-[#0F172A] mb-4 flex items-center gap-2">
                  <i className="ti ti-table text-blue-600 text-xl" />
                  Buku Nilai Computational Thinking
                </h3>

                <div className="overflow-x-auto border-2 border-[#0F172A] rounded-xl shadow-[2px_2px_0px_#0F172A]">
                  <table className="w-full text-xs font-nunito font-bold text-slate-700 min-w-[500px]">
                    <thead>
                      <tr className="bg-slate-100 border-b-2 border-[#0F172A] text-left">
                        <th className="p-3 text-center">No</th>
                        <th className="p-3">Nama Lengkap</th>
                        <th className="p-3 text-center">Pre-Test</th>
                        <th className="p-3 text-center">Rakit HTML</th>
                        <th className="p-3 text-center">Proyek</th>
                        <th className="p-3 text-center">Skor CT</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentGrades.map((student, idx) => (
                        <tr key={idx} className="border-b border-slate-200 bg-white hover:bg-slate-50">
                          <td className="p-3 text-center text-slate-450">{idx + 1}</td>
                          <td className="p-3 font-fredoka font-bold text-slate-800">{student.name}</td>
                          <td className="p-3 text-center">{student.pre}</td>
                          <td className="p-3 text-center">{student.learning}</td>
                          <td className="p-3 text-center">{student.project || '-'}</td>
                          <td className="p-3 text-center text-blue-600 font-bold">{student.ct}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] border ${student.status === "Selesai"
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-250'
                                : student.status === "Perlu Dinilai"
                                  ? 'bg-amber-50 text-amber-700 border-amber-250'
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}>
                              {student.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Panel: Clean HTML Sebaran & Distribusi (No Recharts) */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              {/* Pillar CT Distribution using simple progress bars */}
              <div className="bg-white border-4 border-[#0F172A] shadow-[6px_6px_0px_#0F172A] p-5 rounded-[24px] flex flex-col justify-between">
                <h4 className="font-fredoka text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                  <i className="ti ti-chart-radar text-blue-600" />
                  Rata-rata Pilar CT Kelas
                </h4>
                <div className="flex flex-col gap-3.5">
                  {classPillarData.map((p, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="font-fredoka text-[10px] font-bold text-slate-700">{p.name}</span>
                        <span className={`font-fredoka text-[10px] font-bold text-${p.text}`}>{p.score}%</span>
                      </div>
                      <div className="w-full bg-slate-100 border-2 border-[#0F172A] rounded-full h-3 overflow-hidden">
                        <div
                          className={`${p.color} h-full border-r-2 border-[#0F172A]`}
                          style={{ width: `${p.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Score Range Distribution Card */}
              <div className="bg-white border-4 border-[#0F172A] shadow-[6px_6px_0px_#0F172A] p-5 rounded-[24px] flex flex-col">
                <h4 className="font-fredoka text-sm font-bold text-slate-800 mb-3 text-left flex items-center gap-1.5">
                  <i className="ti ti-chart-bar text-amber-500" />
                  Distribusi Nilai Kelas
                </h4>

                <div className="flex flex-col gap-2.5">
                  <div className="flex justify-between items-center border-2 border-[#0F172A] p-2.5 rounded-xl bg-slate-50 shadow-[2px_2px_0px_#0F172A]">
                    <span className="font-fredoka text-[10px] font-bold text-slate-700">Maju (90 - 100)</span>
                    <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-lg text-[10px] font-fredoka font-bold border border-emerald-300">
                      {distributionData.under100} Siswa
                    </span>
                  </div>

                  <div className="flex justify-between items-center border-2 border-[#0F172A] p-2.5 rounded-xl bg-slate-50 shadow-[2px_2px_0px_#0F172A]">
                    <span className="font-fredoka text-[10px] font-bold text-slate-700">Cakap (80 - 89)</span>
                    <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-lg text-[10px] font-fredoka font-bold border border-blue-300">
                      {distributionData.under90} Siswa
                    </span>
                  </div>

                  <div className="flex justify-between items-center border-2 border-[#0F172A] p-2.5 rounded-xl bg-slate-50 shadow-[2px_2px_0px_#0F172A]">
                    <span className="font-fredoka text-[10px] font-bold text-slate-700">Layak (70 - 79)</span>
                    <span className="bg-yellow-100 text-yellow-850 px-2.5 py-0.5 rounded-lg text-[10px] font-fredoka font-bold border border-yellow-300">
                      {distributionData.under80} Siswa
                    </span>
                  </div>

                  <div className="flex justify-between items-center border-2 border-[#0F172A] p-2.5 rounded-xl bg-slate-50 shadow-[2px_2px_0px_#0F172A]">
                    <span className="font-fredoka text-[10px] font-bold text-slate-700">Perlu Bimbingan (&lt; 70)</span>
                    <span className="bg-red-100 text-red-800 px-2.5 py-0.5 rounded-lg text-[10px] font-fredoka font-bold border border-red-300">
                      {distributionData.under70} Siswa
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
