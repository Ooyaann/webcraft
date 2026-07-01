import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { validateAST, toFormattedCode } from '../services/astUtils';
import PaletBlok from '../components/workspace/PaletBlok';
import Kanvas from '../components/workspace/Kanvas';
import PreviewPanel from '../components/workspace/PreviewPanel';
import CodePanel from '../components/workspace/CodePanel';
import AITutorChat from '../components/ai/AITutorChat';
import CTScoreRadar from '../components/ai/CTScoreRadar';
import { aiService } from '../services/aiService';
import api from '../services/api';

const DEFAULT_LEVEL_CONFIG = {
  id: 'easy-1',
  judul: 'Halaman Profil Sederhana',
  misi: 'Buatlah halaman web profil sederhana! Pastikan ada wadah utama <body>, judul utama <h1> berisi namamu, dan sebuah paragraf <p> berisi perkenalan singkat.',
  validator_rules: [
    { type: 'exists', selector: 'body', error_message: 'Misi belum selesai: Kamu belum membuat wadah utama <body>!' },
    { type: 'exists', selector: 'h1', error_message: 'Misi belum selesai: Kamu belum menambahkan judul utama <h1>!' },
    { type: 'child_of', parent: 'body', child: 'h1', error_message: 'Misi belum selesai: Judul <h1> harus berada di dalam wadah <body>!' },
    { type: 'exists', selector: 'p', error_message: 'Misi belum selesai: Kamu belum menambahkan paragraf <p>!' },
    { type: 'child_of', parent: 'body', child: 'p', error_message: 'Misi belum selesai: Paragraf <p> harus berada di dalam wadah <body>!' },
    { type: 'count', selector: 'body > *', min: 2, error_message: 'Misi belum selesai: Harus ada minimal 2 elemen konten di dalam <body>!' }
  ]
};

export default function Workspace() {
  const navigate = useNavigate();
  const { tugasId } = useParams(); // task ID
  const {
    ast,
    activeLevel,
    setActiveLevel,
    activeLevelConfig,
    ctJourneyAnswers,
    attemptHistory,
    recordAttempt,
    resetWorkspace,
    user
  } = useStore();

  const [activeTab, setActiveTab] = useState('kanvas'); // 'kanvas' | 'preview' | 'code'
  const [validationErrors, setValidationErrors] = useState([]);
  const [showValidationResult, setShowValidationResult] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // Reflection/Post-coding states
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [reflectionAnswer, setReflectionAnswer] = useState('');
  const [isAnalyzingReflection, setIsAnalyzingReflection] = useState(false);
  const [finalReport, setFinalReport] = useState(null);

  // Block teachers from entering workspace
  useEffect(() => {
    if (user && user.role === 'guru') {
      alert("Akses Ditolak: Sebagai Guru (Fasilitator), Anda tidak dapat masuk ke lembar kerja praktik mandiri siswa.");
      navigate('/ruang-belajar');
    }
  }, [user, navigate]);


  // Reset workspace & set level config when tugasId changes
  useEffect(() => {
    // ponytail: always reset AST when entering a new task
    resetWorkspace();

    if (tugasId === 'easy-1' || !tugasId) {
      setActiveLevel(DEFAULT_LEVEL_CONFIG.id, {
        ...DEFAULT_LEVEL_CONFIG,
        type: 'learning'
      });
    } else {
      api.get(`/pertemuan/tasks/${tugasId}`)
        .then(res => {
          const config = res.data;
          setActiveLevel(config.id, {
            id: config.id,
            judul: config.judul,
            type: config.type,
            pertemuan_id: config.pertemuan_id || null,
            misi: config.misi || config.studi_kasus || `${config.judul}: Selesaikan instruksi sesuai petunjuk.`,
            validator_rules: config.validator_rules_json || []
          });
        })
        .catch(err => {
          console.error("Gagal memuat tugas dinamis, menggunakan fallback default:", err);
          setActiveLevel(DEFAULT_LEVEL_CONFIG.id, {
            ...DEFAULT_LEVEL_CONFIG,
            type: 'learning'
          });
        });
    }
  }, [tugasId, setActiveLevel, resetWorkspace]);

  const triggerConfetti = () => {
    const container = document.createElement('div');
    container.className = 'fixed inset-0 pointer-events-none z-[9999] overflow-hidden';
    document.body.appendChild(container);

    const colors = ['#3B82F6', '#FACC15', '#10B981', '#EC4899', '#6366F1', '#8B5CF6'];
    const count = 100;

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() * 8 + 6;

      particle.style.position = 'absolute';
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.backgroundColor = color;
      particle.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      particle.style.left = `${Math.random() * 100}vw`;
      particle.style.top = `-20px`;

      const duration = Math.random() * 2 + 1.5;
      const spinSpeed = Math.random() * 360 + 360;
      const drift = (Math.random() - 0.5) * 300;

      particle.style.transition = `transform ${duration}s cubic-bezier(0.1, 0.8, 0.3, 1), opacity ${duration}s ease-out`;
      container.appendChild(particle);

      setTimeout(() => {
        particle.style.transform = `translate(${drift}px, ${window.innerHeight + 50}px) rotate(${spinSpeed}deg)`;
        particle.style.opacity = '0';
      }, 50);
    }

    setTimeout(() => {
      container.remove();
    }, 4000);
  };

  const handleValidate = async () => {
    if (!activeLevelConfig) return;

    // If it is a project task (no validator rules), then it is always valid!
    if (activeLevelConfig.type === 'project' || !activeLevelConfig.validator_rules || activeLevelConfig.validator_rules.length === 0) {
      setIsSuccess(true);
      setValidationErrors([]);
      setShowValidationResult(true);
      triggerConfetti();
      alert("Proyek Kreatif: Kode Anda siap dikirim! Klik 'Kirim Hasil Misi' untuk mengumpulkan.");
      return;
    }

    setIsValidating(true);
    setShowValidationResult(false);

    try {
      const codeStr = toFormattedCode(ast);
      const result = await aiService.validateCode(
        codeStr,
        activeLevelConfig.validator_rules,
        activeLevelConfig.judul
      );

      const isOk = result.is_valid;
      setIsSuccess(isOk);

      if (isOk) {
        setValidationErrors([]);
        triggerConfetti();
      } else {
        setValidationErrors([{ message: result.feedback }]);
      }

      setShowValidationResult(true);

      // Record this attempt in history
      const historyErrors = isOk ? [] : [{ message: result.feedback }];
      recordAttempt(historyErrors);
    } catch (err) {
      console.error("Gagal melakukan validasi kode:", err);
      // Fallback local validation if server is down completely
      const errors = validateAST(ast, activeLevelConfig.validator_rules);
      setValidationErrors(errors);
      setShowValidationResult(true);
      const isOk = errors.length === 0;
      setIsSuccess(isOk);
      if (isOk) {
        triggerConfetti();
      }
      recordAttempt(errors);
    } finally {
      setIsValidating(false);
    }
  };


  const handleSubmitChallenge = () => {
    if (!isSuccess) return;
    setShowReflectionModal(true);
  };

  const handleSendReflection = async () => {
    if (!reflectionAnswer.trim()) return;
    setIsAnalyzingReflection(true);

    try {
      const result = await aiService.analyzeCTSession(
        attemptHistory,
        ctJourneyAnswers,
        { question: "Bagian mana yang paling sulit?", answer: reflectionAnswer }
      );

      setFinalReport(result);

      // Save submission to database if logged in
      const token = localStorage.getItem('webcraft_token');
      if (token) {
        try {
          if (activeLevelConfig?.type === 'project') {
            await api.post('/submissions/project', {
              task_id: activeLevelConfig?.id,
              final_ast: ast,
              ct_session_id: null
            });
          } else {
            await api.post('/submissions/learning', {
              task_id: activeLevelConfig?.id || 'easy-1',
              ast_snapshots: attemptHistory,
              attempt_count: attemptHistory.length,
              ct_session_id: null,
              reflection_answers: { question: "Bagian mana yang paling sulit?", answer: reflectionAnswer },
              ai_feedback: result.narrative
            });
          }

          // Also save computed CT scores to database for Perkembanganku trends.
          // Use the real pertemuan_id (not the task id); skip for the standalone demo.
          if (activeLevelConfig?.pertemuan_id) {
            await api.post('/ct-scores', {
              decomposition: result.decomposition,
              abstraction: result.abstraction,
              pattern_recognition: result.pattern_recognition,
              algorithm_design: result.algorithm_design,
              pertemuan_id: activeLevelConfig.pertemuan_id
            });
          }
        } catch (saveErr) {
          console.error("Gagal mengirimkan data submission ke server:", saveErr);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzingReflection(false);
    }
  };


  return (
    <div className="w-full h-screen bg-[#E0F2FE] flex flex-col relative overflow-hidden font-nunito">
      {/* Top Toolbar Navigation */}
      <header className="w-full bg-[#0F172A] text-white px-6 py-4 flex justify-between items-center border-b-4 border-[#0F172A] shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/ruang-belajar')}
            className="p-1.5 border-2 border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
          >
            <i className="ti ti-arrow-left text-base" />
          </button>
          <div className="text-left leading-none">
            <h2 className="font-fredoka text-base font-bold text-white tracking-tight">
              Misi: {activeLevelConfig?.judul || 'Memuat...'}
            </h2>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Ruang Praktik Mandiri</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3.5 py-1.5 bg-[#FACC15] text-[#0F172A] border-2 border-[#0F172A] font-fredoka text-xs font-bold rounded-xl shadow-[2px_2px_0px_#0F172A] flex items-center gap-1 shrink-0">
            <i className="ti ti-rocket" />
            Fase Action
          </span>
        </div>
      </header>

      {/* Main Workspace Split Layout (3 Panels) */}
      <div className="flex-1 w-full flex flex-col overflow-hidden">
        
        {/* Mission Instructions Panel */}
        {activeLevelConfig?.misi && (
          <div className="bg-indigo-50 border-b-4 border-[#0F172A] px-4 py-3 flex items-start gap-2 shrink-0">
            <i className="ti ti-target text-indigo-600 text-base mt-0.5 shrink-0" />
            <div className="text-left">
              <span className="font-fredoka text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Misi yang harus dikerjakan:</span>
              <p className="font-nunito text-xs text-indigo-900 font-bold leading-relaxed mt-0.5">{activeLevelConfig.misi}</p>
            </div>
          </div>
        )}

        <div className="flex-1 w-full flex items-stretch overflow-hidden">
          {/* Left Panel (Palette) */}
          <div className="w-[280px] border-r-4 border-[#0F172A] h-full overflow-y-auto bg-slate-50 shrink-0">
            <PaletBlok />
          </div>

          {/* Middle Panel (Editor: Kanvas & Code) */}
          <div className="flex-1 h-full flex flex-col overflow-hidden bg-white border-r-4 border-[#0F172A]">
            <div className="bg-slate-100 border-b-4 border-[#0F172A] p-2 flex justify-start gap-2 shrink-0">
              <button
                onClick={() => setActiveTab('kanvas')}
                className={`px-4 py-2 border-2 border-[#0F172A] font-fredoka text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-[2px_2px_0px_#0F172A] hover:-translate-y-0.5 active:translate-y-[0.5px] ${activeTab === 'kanvas'
                    ? 'bg-blue-600 text-white shadow-none translate-y-[1px]'
                    : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
              >
                <i className="ti ti-layout-grid text-sm" />
                Kanvas Rakit
              </button>

              <button
                onClick={() => setActiveTab('code')}
                className={`px-4 py-2 border-2 border-[#0F172A] font-fredoka text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-[2px_2px_0px_#0F172A] hover:-translate-y-0.5 active:translate-y-[0.5px] ${activeTab === 'code'
                    ? 'bg-slate-800 text-white shadow-none translate-y-[1px]'
                    : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
              >
                <i className="ti ti-code text-sm" />
                Kode HTML
              </button>
            </div>

            <div className="flex-1 w-full relative overflow-y-auto bg-slate-50">
              <div className={`absolute inset-0 w-full h-full p-0 flex flex-col ${activeTab === 'kanvas' ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none'}`}>
                <Kanvas />
              </div>
              <div className={`absolute inset-0 w-full h-full p-4 flex flex-col ${activeTab === 'code' ? 'z-10 opacity-100 font-mono' : 'z-0 opacity-0 pointer-events-none'}`}>
                <CodePanel />
              </div>
            </div>
          </div>

          {/* Right Panel (Live Preview) */}
          <div className="w-[30%] min-w-[320px] max-w-[450px] h-full flex flex-col bg-white shrink-0">
            <div className="bg-emerald-100 border-b-4 border-[#0F172A] p-2 flex items-center justify-center gap-2 shrink-0 h-[52px]">
              <i className="ti ti-eye text-emerald-700 text-lg" />
              <span className="font-fredoka text-sm font-bold text-emerald-800">Hasil Live Preview</span>
            </div>
            <div className="flex-1 relative bg-white p-4 overflow-y-auto">
              <PreviewPanel />
            </div>
          </div>
        </div>

        {/* Global Action Footer Bar */}
        <div className="bg-white border-t-4 border-[#0F172A] p-4 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
          <div className="flex items-center gap-3 text-left w-full sm:w-auto">
            <div className="bg-pink-50 border-2 border-[#0F172A] px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-[2px_2px_0px_#0F172A]">
              <i className="ti ti-history text-pink-600 text-sm" />
              <span className="font-nunito text-[10px] font-bold text-pink-700">Percobaan: {attemptHistory.length}x</span>
            </div>

            {showValidationResult && (
              <div className={`px-3 py-1.5 rounded-xl border-2 border-[#0F172A] font-nunito text-[10px] font-bold flex items-center gap-1.5 shadow-[2px_2px_0px_#0F172A] ${isSuccess ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                }`}>
                <i className={`ti ${isSuccess ? 'ti-circle-check' : 'ti-alert-triangle'} text-sm`} />
                <span>
                  {isSuccess
                    ? 'Luar biasa! Semua aturan struktur kriteria misi telah terpenuhi!'
                    : `${validationErrors.length} kesalahan ditemukan. Coba evaluasi lagi!`}
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-3 w-full sm:w-auto shrink-0">
            <button
              onClick={handleValidate}
              disabled={isValidating}
              className={`flex-1 sm:flex-initial px-5 py-2.5 bg-white border-2 border-[#0F172A] text-slate-700 hover:bg-slate-50 font-nunito font-bold rounded-xl shadow-[3px_3px_0px_#0F172A] hover:-translate-y-0.5 active:translate-y-[0.5px] cursor-pointer transition-all flex items-center justify-center gap-1.5 text-xs ${isValidating ? 'opacity-70 cursor-not-allowed' : ''
                }`}
            >
              {isValidating ? (
                <>
                  <i className="ti ti-loader animate-spin text-base" />
                  AI Sedang Memeriksa...
                </>
              ) : (
                <>
                  <i className="ti ti-sparkles text-indigo-600 text-base" />
                  Cek Logika Kode (AI)
                </>
              )}
            </button>


            <button
              onClick={handleSubmitChallenge}
              disabled={!isSuccess}
              className={`flex-1 sm:flex-initial px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-nunito font-bold rounded-xl shadow-[3px_3px_0px_#0F172A] hover:shadow-[4px_4px_0px_#0F172A] hover:-translate-y-0.5 active:translate-y-[0.5px] active:shadow-[1px_1px_0px_#0F172A] cursor-pointer transition-all flex items-center justify-center gap-1.5 border-2 border-[#0F172A] text-xs ${!isSuccess ? 'opacity-40 cursor-not-allowed transform-none hover:translate-y-0 shadow-none hover:shadow-none' : ''
                }`}
            >
              <i className="ti ti-send text-base" />
              Kirim Hasil Misi
            </button>
          </div>
        </div>
      </div>

      {/* Validation Result Detail List */}
      {showValidationResult && validationErrors.length > 0 && (
        <div className="bg-red-50 border-t-4 border-[#0F172A] p-4 text-left shrink-0 max-h-[140px] overflow-y-auto">
          <h4 className="font-nunito text-xs font-bold text-red-750 flex items-center gap-1 mb-2">
            <i className="ti ti-alert-triangle text-red-600 text-sm font-bold" />
            Rincian Kesalahan Struktur Kode:
          </h4>
          <ul className="font-nunito text-[11px] text-red-700 font-bold space-y-1 list-disc pl-4">
            {validationErrors.map((err, idx) => (
              <li key={idx}>{err.message || err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Socratic AI Tutor Bubble */}
      <AITutorChat />

      {/* Reflection Post-coding Modal */}
      {showReflectionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white border-4 border-[#0F172A] rounded-2xl shadow-[8px_8px_0px_#0F172A] flex flex-col max-h-[90vh]">
            <div className="bg-emerald-500 text-white px-6 py-4 flex items-center gap-2 rounded-t-xl border-b-4 border-[#0F172A]">
              <i className="ti ti-rate-review text-lg font-bold" />
              <h3 className="font-fredoka text-lg font-bold">Refleksi Mandiri (Post-Coding)</h3>
            </div>

            <div className="p-6 overflow-y-auto text-left flex flex-col gap-4">
              {!finalReport ? (
                <>
                  <p className="font-fredoka text-sm text-slate-800 font-bold leading-snug">
                    Bagian mana yang paling sulit tadi? Mengapa?
                  </p>
                  <textarea
                    rows={3}
                    value={reflectionAnswer}
                    onChange={(e) => setReflectionAnswer(e.target.value)}
                    className="w-full p-3 bg-slate-50 border-2 border-[#0F172A] rounded-xl font-nunito font-bold text-xs focus:outline-none focus:translate-x-0.5 focus:shadow-[1px_1px_0px_#0F172A] transition-all"
                    disabled={isAnalyzingReflection}
                  />
                </>
              ) : (
                <div className="flex flex-col gap-5">
                  <div className="bg-emerald-50 border-2 border-emerald-500 text-emerald-700 p-4 rounded-xl font-nunito font-bold text-xs text-center shadow-sm flex items-center justify-center gap-1.5">
                    <i className="ti ti-circle-check text-emerald-600 text-sm" />
                    Misi Belajar Selesai! Skor perkembangan kognitif Anda telah disimpan di database.
                  </div>

                  {/* CT Score focus — 4 dimensions */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    {[
                      { label: 'Dekomposisi', val: finalReport?.decomposition, c: 'text-blue-600', bg: 'bg-blue-50' },
                      { label: 'Abstraksi', val: finalReport?.abstraction, c: 'text-pink-600', bg: 'bg-pink-50' },
                      { label: 'Pengenalan Pola', val: finalReport?.pattern_recognition, c: 'text-amber-600', bg: 'bg-amber-50' },
                      { label: 'Algoritma', val: finalReport?.algorithm_design, c: 'text-emerald-600', bg: 'bg-emerald-50' },
                    ].map((s) => (
                      <div key={s.label} className={`border-2 border-[#0F172A] rounded-xl p-3 ${s.bg} shadow-[2px_2px_0px_#0F172A]`}>
                        <p className="font-nunito text-[9px] font-bold text-slate-500 uppercase tracking-wide">{s.label}</p>
                        <p className={`font-fredoka text-2xl font-bold ${s.c} mt-1`}>{s.val ?? '-'}<span className="text-xs text-slate-400">/100</span></p>
                      </div>
                    ))}
                  </div>

                  {/* Radar + AI suggestion below */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    <div className="md:col-span-5">
                      <CTScoreRadar scores={finalReport || {}} />
                    </div>
                    <div className="md:col-span-7 border-2 border-indigo-300 bg-indigo-50/60 p-4 rounded-xl shadow-[3px_3px_0px_#0F172A] text-left">
                      <h5 className="font-fredoka text-xs font-bold text-indigo-900 mb-1.5 flex items-center gap-1.5">
                        <span className="bg-indigo-600 text-white px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-1">
                          <i className="ti ti-sparkles" /> AI
                        </span>
                        Saran AI untukmu:
                      </h5>
                      <p className="font-nunito text-[11px] text-slate-700 font-semibold leading-relaxed">
                        {finalReport?.narrative || 'Analisis CT kognitif selesai.'}
                      </p>
                      {finalReport?.recommendations?.length > 0 && (
                        <ul className="mt-2 space-y-1 list-disc pl-4 font-nunito text-[10px] text-indigo-900 font-semibold">
                          {finalReport.recommendations.slice(0, 2).map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t-4 border-[#0F172A] px-6 py-4 flex justify-between items-center bg-slate-50 rounded-b-xl">
              <button
                onClick={() => {
                  if (finalReport) {
                    setShowReflectionModal(false);
                    navigate('/ruang-belajar');
                  } else {
                    setShowReflectionModal(false);
                  }
                }}
                className="px-4 py-2 border-2 border-[#0F172A] bg-white text-slate-700 hover:bg-slate-50 font-nunito font-bold rounded-lg text-xs shadow-[2px_2px_0px_#0F172A] cursor-pointer transition-all"
              >
                {finalReport ? 'Kembali ke Ruang Belajar' : 'Kembali'}
              </button>

              {!finalReport && (
                <button
                  onClick={handleSendReflection}
                  disabled={!reflectionAnswer.trim() || isAnalyzingReflection}
                  className={`px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-nunito font-bold rounded-lg text-xs shadow-[3px_3px_0px_#0F172A] hover:shadow-[4px_4px_0px_#0F172A] hover:-translate-y-0.5 active:translate-y-[0.5px] active:shadow-[1px_1px_0px_#0F172A] cursor-pointer transition-all flex items-center gap-2 border-2 border-[#0F172A] ${(!reflectionAnswer.trim() || isAnalyzingReflection) ? 'opacity-40 cursor-not-allowed shadow-none transform-none hover:translate-y-0 hover:shadow-none' : ''
                    }`}
                >
                  <i className="ti ti-sparkles" />
                  {isAnalyzingReflection ? 'Menganalisis Jawaban...' : 'Kirim & Dapatkan Skor'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
