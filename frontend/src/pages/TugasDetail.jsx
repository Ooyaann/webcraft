import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import api from '../services/api';
import CTJourneyModal from '../components/ct-journey/CTJourneyModal';

export default function TugasDetail() {
  const { roomId, tugasId } = useParams(); // tugasId is the pertemuan_id
  const navigate = useNavigate();
  const { user, setActiveLevel, ctPreScore } = useStore();
  const [pertemuan, setPertemuan] = useState(null);
  const [tasks, setTasks] = useState({ learning_tasks: [], project_tasks: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [wizardStep, setWizardStep] = useState(1); // 1: Engage, 2: Investigate, 3: Action
  const [isJourneyOpen, setIsJourneyOpen] = useState(false);
  const [journeyAutoOpened, setJourneyAutoOpened] = useState(false);

  const isTeacher = user?.role === 'guru';

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      api.get(`/rooms/${roomId}/pertemuan`),
      api.get(`/pertemuan/${tugasId}/tasks`)
    ])
      .then(([pertRes, tasksRes]) => {
        const found = pertRes.data?.find(p => p.id === tugasId);
        setPertemuan(found || null);
        const t = tasksRes.data || { learning_tasks: [], project_tasks: [] };
        setTasks(t);

        // Register the active level so the CT Journey (and later the workspace)
        // has the correct challenge context, mission text, and validator rules.
        const primary = t.learning_tasks?.[0] || t.project_tasks?.[0];
        if (primary && found) {
          const isLearning = !!t.learning_tasks?.[0];
          const challenge = found.cbl_engage_json?.challenge
            || (isLearning ? `${found.judul}: Selesaikan instruksi sesuai petunjuk.` : primary.studi_kasus);
          setActiveLevel(primary.id, {
            id: primary.id,
            judul: found.judul,
            type: isLearning ? 'learning' : 'project',
            pertemuan_id: tugasId,
            misi: challenge,
            validator_rules: primary.validator_rules_json || []
          });
        }
      })
      .catch(err => console.error("Error loading task details:", err))
      .finally(() => setIsLoading(false));
  }, [roomId, tugasId, setActiveLevel]);

  // Auto-open CT Journey the first time the student reaches the Investigate phase
  useEffect(() => {
    if (!isTeacher && wizardStep === 2 && !journeyAutoOpened && ctPreScore === null) {
      setIsJourneyOpen(true);
      setJourneyAutoOpened(true);
    }
  }, [wizardStep, isTeacher, journeyAutoOpened, ctPreScore]);

  const handleStartTask = () => {
    const learningTaskId = tasks.learning_tasks[0]?.id;
    const projectTaskId = tasks.project_tasks[0]?.id;

    if (learningTaskId) {
      navigate(`/workspace/${learningTaskId}`);
    } else if (projectTaskId) {
      navigate(`/workspace/${projectTaskId}`);
    } else {
      alert("Tugas ini tidak memiliki modul coding yang aktif.");
    }
  };

  const ctDone = ctPreScore !== null;

  if (isLoading) {
    return (
      <div className="w-full px-6 py-12 flex justify-center items-center">
        <div className="neo-card p-12 text-center max-w-sm">
          <i className="ti ti-loader animate-spin text-3xl text-blue-600 mb-2" />
          <p className="font-nunito text-xs text-slate-500 font-bold">Memuat detail pertemuan...</p>
        </div>
      </div>
    );
  }

  if (!pertemuan) {
    return (
      <div className="w-full px-6 py-12 flex justify-center items-center">
        <div className="neo-card p-8 text-center max-w-sm border-4 border-[#0F172A]">
          <i className="ti ti-alert-triangle text-4xl text-red-500 mb-2" />
          <h3 className="font-fredoka text-lg font-bold">Detail Tidak Ditemukan</h3>
          <p className="font-nunito text-xs text-slate-500 font-bold mt-1">
            Data pertemuan ini tidak dapat ditemukan di server.
          </p>
        </div>
      </div>
    );
  }

  // Extract CBL details
  const cbl = pertemuan.cbl_engage_json || {};
  const bigIdea = cbl.big_idea || 'Coding & Web';
  const essentialQuestion = cbl.essential_question || 'Pertanyaan esensial sedang disiapkan.';
  const challenge = cbl.challenge || 'Tantangan praktik pemrograman web sedang disiapkan.';

  return (
    <div className="w-full px-4 md:px-6 py-8 text-left max-w-[1400px] mx-auto flex flex-col gap-6 neo-page-enter">
      {/* Header & Back Button */}
      <div className="flex justify-between items-center bg-white p-4 rounded-[20px] border-4 border-[#0F172A] shadow-[4px_4px_0px_#0F172A]">
        <button
          onClick={() => navigate(`/ruang-belajar/${roomId}`)}
          className="w-fit py-1.5 px-3 border-2 border-[#0F172A] bg-white text-slate-700 font-fredoka text-xs font-bold rounded-xl shadow-[2px_2px_0px_#0F172A] hover:-translate-y-0.5 active:translate-y-[0.5px] cursor-pointer transition-all flex items-center gap-1.5"
        >
          <i className="ti ti-arrow-left" />
          Kembali
        </button>
        <h2 className="font-fredoka text-base md:text-lg font-bold text-[#0F172A]">
          {pertemuan.judul}
        </h2>
      </div>

      {/* Single-box CBL Wizard: 1 Engage -> 2 Investigate -> 3 Action */}
      <div className="neo-section bg-white border-4 border-[#0F172A] rounded-[24px] shadow-[6px_6px_0px_#0F172A] flex flex-col overflow-hidden">
        {/* Progress Bar */}
        <div className="flex border-b-4 border-[#0F172A] bg-[#F1F5F9]">
          {[
            { step: 1, label: '1. Engage', icon: 'ti-bulb', activeColor: 'bg-[#FACC15] text-[#0F172A]' },
            { step: 2, label: '2. Investigate', icon: 'ti-search', activeColor: 'bg-[#3B82F6] text-white' },
            { step: 3, label: '3. Action', icon: 'ti-rocket', activeColor: 'bg-[#10B981] text-white' },
          ].map((s) => (
            <div
              key={s.step}
              className={`flex-1 py-3.5 px-2 text-center font-fredoka text-xs md:text-sm font-bold border-r-4 last:border-r-0 border-[#0F172A] transition-all ${
                wizardStep === s.step ? s.activeColor + ' border-b-4 border-b-[#0F172A]' : 'text-slate-400 bg-[#FFFDF9]'
              } ${wizardStep > s.step ? 'bg-[#E2E8F0] text-slate-655' : ''}`}
            >
              <i className={`ti ${s.icon} mr-1.5`} />
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Wizard Content Area */}
        <div className="p-6 md:p-8 min-h-[320px]">
          {/* ============ STEP 1: ENGAGE ============ */}
          {wizardStep === 1 && (
            <div className="flex flex-col gap-5 animate-fade-in">
              <div className="flex items-center justify-between border-b border-dashed border-slate-200 pb-3">
                <span className="bg-[#FACC15] text-[#0F172A] border-2 border-[#0F172A] px-3.5 py-1 rounded-xl font-fredoka text-[10px] font-bold shadow-[2px_2px_0px_#0F172A] flex items-center gap-1">
                  <i className="ti ti-bulb" />
                  FASE 1 · ENGAGE
                </span>
                <span className="font-fredoka text-xs text-slate-400 font-bold">
                  Topik: {bigIdea}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pertanyaan Esensial</span>
                <h3 className="font-fredoka text-lg md:text-xl font-bold text-slate-800 leading-tight">
                  {essentialQuestion}
                </h3>
              </div>

              <div className="bg-blue-50 border-2 border-[#0F172A] p-4 rounded-xl shadow-[3px_3px_0px_#0F172A] mt-2">
                <span className="text-[9px] font-black text-blue-700 uppercase tracking-widest block mb-1">Tantangan Kelas</span>
                <p className="font-nunito text-xs text-slate-800 font-semibold leading-relaxed">
                  {challenge}
                </p>
              </div>

              <div className="bg-amber-50/60 border-2 border-dashed border-amber-300 p-3 rounded-xl text-[11px] font-nunito font-bold text-amber-800 flex items-center gap-2">
                <i className="ti ti-arrow-right text-base" />
                Klik <b>Selanjutnya</b> untuk masuk ke fase Investigate: pelajari materi & susun rencana berpikir komputasional (CT).
              </div>
            </div>
          )}

          {/* ============ STEP 2: INVESTIGATE (materi + CT Journey) ============ */}
          {wizardStep === 2 && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <span className="w-fit bg-[#3B82F6] text-white border-2 border-[#0F172A] px-3.5 py-1 rounded-xl font-fredoka text-[10px] font-bold shadow-[2px_2px_0px_#0F172A] flex items-center gap-1">
                <i className="ti ti-search" />
                FASE 2 · INVESTIGATE
              </span>

              {/* CT Journey (aspek CT) — comes first in Investigate */}
              {!isTeacher && (
                <div className={`border-4 border-[#0F172A] rounded-2xl p-5 shadow-[4px_4px_0px_#0F172A] flex flex-col gap-3 ${ctDone ? 'bg-[#A7F3D0]' : 'bg-[#FDE68A]'}`}>
                  <div className="flex items-center gap-2">
                    <div className="bg-indigo-600 text-white w-8 h-8 rounded-lg border-2 border-[#0F172A] flex items-center justify-center">
                      <i className="ti ti-brain text-base" />
                    </div>
                    <div>
                      <h4 className="font-fredoka text-sm font-bold text-[#0F172A]">Analisis Berpikir Komputasional (CT Journey)</h4>
                      <p className="font-nunito text-[10px] text-[#0F172A] font-black">Dekomposisi · Abstraksi · Pola · Algoritma</p>
                    </div>
                  </div>

                  {ctDone ? (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                        {[
                          { label: 'Dekomposisi', val: ctPreScore?.decomposition, c: 'text-blue-600' },
                          { label: 'Abstraksi', val: ctPreScore?.abstraction, c: 'text-pink-600' },
                          { label: 'Pola', val: ctPreScore?.pattern_recognition, c: 'text-amber-600' },
                          { label: 'Algoritma', val: ctPreScore?.algorithm_design, c: 'text-emerald-600' },
                        ].map((s) => (
                          <div key={s.label} className="bg-white border-2 border-[#0F172A] rounded-lg p-2 shadow-[2px_2px_0px_#0F172A]">
                            <p className="font-nunito text-[8px] font-bold text-slate-400 uppercase">{s.label}</p>
                            <p className={`font-fredoka text-lg font-bold ${s.c}`}>{s.val ?? '-'}</p>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => setIsJourneyOpen(true)}
                        className="self-start px-3 py-1.5 bg-white border-2 border-[#0F172A] text-slate-700 font-fredoka text-[10px] font-bold rounded-lg shadow-[2px_2px_0px_#0F172A] hover:-translate-y-0.5 cursor-pointer transition-all flex items-center gap-1"
                      >
                        <i className="ti ti-eye" /> Lihat ulang analisis CT
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="font-nunito text-[11px] text-[#0F172A] font-extrabold leading-relaxed">
                        Sebelum mulai merakit kode, susun dulu rencana berpikirmu. Pecah masalah, pilih bagian penting, kenali pola, dan urutkan langkahnya.
                      </p>
                      <button
                        onClick={() => setIsJourneyOpen(true)}
                        className="self-start px-5 py-2.5 bg-indigo-650 text-white border-2 border-[#0F172A] font-fredoka text-xs font-bold rounded-xl shadow-[3px_3px_0px_#0F172A] hover:-translate-y-0.5 active:translate-y-[0.5px] cursor-pointer transition-all flex items-center gap-1.5"
                      >
                        <i className="ti ti-brain" />
                        Mulai Analisis CT
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Guiding questions */}
              {pertemuan.guiding_questions_json && pertemuan.guiding_questions_json.length > 0 && (
                <div className="text-left flex flex-col gap-2.5 border-l-4 border-blue-500 pl-4 py-1">
                  <h4 className="font-fredoka text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Pertanyaan Pemandu Belajar:
                  </h4>
                  <ul className="font-nunito text-xs text-slate-700 font-semibold space-y-2 list-disc pl-4">
                    {pertemuan.guiding_questions_json.map((q, idx) => (
                      <li key={idx} className="leading-relaxed">{q}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* ============ STEP 3: ACTION (mulai misi) ============ */}
          {wizardStep === 3 && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <span className="w-fit bg-[#10B981] text-white border-2 border-[#0F172A] px-3.5 py-1 rounded-xl font-fredoka text-[10px] font-bold shadow-[2px_2px_0px_#0F172A] flex items-center gap-1">
                <i className="ti ti-rocket" />
                FASE 3 · ACTION
              </span>

              <div className="bg-emerald-50/60 border-2 border-[#0F172A] p-4 rounded-xl shadow-[3px_3px_0px_#0F172A]">
                <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest block mb-1">Misi yang harus dikerjakan</span>
                <p className="font-nunito text-xs text-slate-800 font-semibold leading-relaxed">
                  {challenge}
                </p>
              </div>

              {!isTeacher && !ctDone && (
                <div className="bg-amber-50 border-2 border-dashed border-amber-400 p-3 rounded-xl text-[11px] font-nunito font-bold text-amber-800 flex items-center gap-2">
                  <i className="ti ti-alert-triangle text-base" />
                  Sebaiknya selesaikan dulu Analisis CT di fase Investigate agar rencanamu matang sebelum coding.
                </div>
              )}

              <div className={`mt-2 p-5 border-4 border-[#0F172A] shadow-[6px_6px_0px_#0F172A] flex flex-col sm:flex-row justify-between items-center gap-4 rounded-xl ${isTeacher ? 'bg-[#BAE6FD]' : 'bg-[#FBCFE8]'}`}>
                <div className="text-left flex-1">
                  <h4 className="font-fredoka text-base font-bold text-[#0F172A]">
                    {isTeacher ? 'Mode Fasilitator Kelas' : 'Sudah Siap Mengerjakan Misi?'}
                  </h4>
                  <p className="font-nunito text-[11px] text-[#0F172A] font-extrabold">
                    {isTeacher
                      ? 'Gunakan tombol di bawah untuk kembali mengelola parameter pertemuan ini.'
                      : 'Kamu akan masuk ke Workspace untuk merakit blok HTML & CSS sesuai misi.'}
                  </p>
                </div>

                <div className="flex gap-3 shrink-0 w-full sm:w-auto">
                  {isTeacher ? (
                    <button
                      onClick={() => navigate(`/ruang-belajar/${roomId}`)}
                      className="flex-grow px-5 py-2.5 bg-blue-600 text-white border-2 border-[#0F172A] shadow-[2.5px_2.5px_0px_#0F172A] font-fredoka text-xs font-bold rounded-xl hover:-translate-y-0.5 active:translate-y-[0.5px] cursor-pointer transition-all flex items-center justify-center gap-1.5"
                    >
                      <i className="ti ti-settings" />
                      Kelola Rencana
                    </button>
                  ) : (
                    <button
                      onClick={handleStartTask}
                      className="px-6 py-3 bg-[#EC4899] text-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] font-fredoka text-sm font-bold rounded-xl hover:-translate-y-0.5 active:translate-y-[0.5px] cursor-pointer transition-all flex items-center justify-center gap-1.5"
                    >
                      <i className="ti ti-rocket" />
                      Mulai Kerjakan Misi
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer / Navigation */}
        <div className="border-t-4 border-[#0F172A] px-6 py-4 bg-slate-100 flex justify-between items-center">
          <button
            onClick={() => setWizardStep(prev => Math.max(1, prev - 1))}
            className={`px-5 py-2 bg-white border-2 border-[#0F172A] text-slate-700 font-nunito font-bold rounded-xl text-xs shadow-[2.5px_2.5px_0px_#0F172A] hover:bg-slate-50 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-[0.5px] ${wizardStep === 1 ? 'opacity-0 pointer-events-none' : ''}`}
          >
            Kembali
          </button>

          <span className="font-nunito text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Langkah {wizardStep} dari 3
          </span>

          <button
            onClick={() => setWizardStep(prev => Math.min(3, prev + 1))}
            className={`px-6 py-2 bg-[#0F172A] text-white border-2 border-[#0F172A] shadow-[2.5px_2.5px_0px_#0F172A] font-nunito font-bold rounded-xl text-xs hover:bg-slate-800 hover:-translate-y-0.5 active:translate-y-[0.5px] cursor-pointer transition-all flex items-center gap-1.5 ${wizardStep === 3 ? 'opacity-0 pointer-events-none' : ''}`}
          >
            Selanjutnya <i className="ti ti-arrow-right" />
          </button>
        </div>
      </div>

      {/* Bahan Ajar & Materi Pembelajaran (Outside/Below the Wizard Box) */}
      {pertemuan.materi_list_json && pertemuan.materi_list_json.length > 0 && (
        <section className="neo-card p-6 border-4 border-[#0F172A] bg-[#EFF6FF] rounded-[24px] shadow-[4px_4px_0px_#0F172A] flex flex-col gap-4 text-left">
          <h3 className="font-fredoka text-base font-bold text-[#0F172A] flex items-center gap-2">
            <i className="ti ti-file-text text-blue-600 text-xl animate-pulse" />
            Bahan Ajar & Materi Pendukung
          </h3>
          <p className="font-nunito text-xs text-slate-650 font-bold -mt-1">
            Pelajari materi pendukung di bawah ini untuk membantumu menyelesaikan misi coding di atas:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
            {pertemuan.materi_list_json.map((m, idx) => (
              <a
                key={idx}
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                className="border-2 border-[#0F172A] p-3 rounded-xl bg-white hover:bg-blue-50 hover:-translate-y-0.5 shadow-[2.5px_2.5px_0px_#0F172A] transition-all flex items-center justify-between text-xs font-nunito font-bold text-slate-800"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <i className="ti ti-file-symlink text-blue-600 text-base" />
                  <span className="truncate">{m.title}</span>
                </div>
                <i className="ti ti-external-link text-slate-400" />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* CT Journey Modal — runs inside the Investigate phase */}
      <CTJourneyModal isOpen={isJourneyOpen} onClose={() => setIsJourneyOpen(false)} viewOnly={ctDone} />
    </div>
  );
}
