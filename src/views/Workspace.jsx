import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from '@/lib/router-compat';
import { useStore } from '../store/useStore';
import { validateAST, toFormattedCode } from '../services/astUtils';
import PaletBlok from '../components/workspace/PaletBlok';
import Kanvas from '../components/workspace/Kanvas';
import PreviewPanel from '../components/workspace/PreviewPanel';
import CodePanel from '../components/workspace/CodePanel';
import AITutorChat from '../components/ai/AITutorChat';
import CTScoreRadar from '../components/ai/CTScoreRadar';
import WorkspaceOnboarding from '../components/workspace/WorkspaceOnboarding';

import { aiService } from '../services/aiService';
import api from '../services/api';
import { confirmDialog } from '../components/common/confirm';
import { toast } from '../components/common/toast';

const DEFAULT_LEVEL_CONFIG = {
  id: 'easy-1',
  pertemuan_id: 'p1',
  judul: 'Pertemuan 1: Kartu Profil Pribadi',
  misi: 'Hai! Mari kita membuat Kartu Profil Pribadimu sendiri agar teman-teman bisa mengenalmu!\n\nIkuti petunjuk seru berikut ya:\n1. Pasang blok utama Lembar Kerja (<body>) sebagai tempat menaruh semua blok lainnya.\n2. Tambahkan Judul Terbesar (<h1>) di dalam Lembar Kerja, lalu ganti isinya dengan namamu.\n3. Tambahkan Paragraf (<p>) di bawah judulmu untuk menceritakan perkenalan singkat tentang dirimu (misalnya hobi atau cita-citamu!).',
  validator_rules: [
    { type: 'exists', selector: 'body', error_message: 'Misi belum selesai: Jangan lupa menambahkan blok Lembar Kerja <body> ya!' },
    { type: 'exists', selector: 'h1', error_message: 'Misi belum selesai: Yuk, tambahkan Judul Terbesar <h1> untuk namamu!' },
    { type: 'child_of', parent: 'body', child: 'h1', error_message: 'Misi belum selesai: Pastikan Judul <h1> diletakkan di dalam Lembar Kerja <body> ya!' },
    { type: 'exists', selector: 'p', error_message: 'Misi belum selesai: Kamu belum menambahkan blok Paragraf <p> untuk perkenalan dirimu.' },
    { type: 'child_of', parent: 'body', child: 'p', error_message: 'Misi belum selesai: Letakkan Paragraf <p> di dalam Lembar Kerja <body> agar bisa tampil di layar.' },
    { type: 'count', selector: 'body > *', min: 2, error_message: 'Misi belum selesai: Harus ada minimal 2 elemen konten di dalam Lembar Kerja <body>!' }
  ]
};

const SANDBOX_LEVEL_CONFIG = {
  id: 'sandbox',
  judul: 'Eksperimen Bebas (Sandbox)',
  misi: 'Selamat datang di ruang eksperimen bebas! Di sini kamu bebas berkreasi merakit blok HTML apa saja secara langsung tanpa ada tugas atau penilaian AI. Selamat bersenang-senang!',
  validator_rules: []
};

export default function Workspace({ isSandbox = false }) {
  const navigate = useNavigate();
  const { tugasId } = useParams(); // task ID
  const {
    ast,
    setActiveLevel,
    activeLevelConfig,
    ctJourneyAnswers,
    attemptHistory,
    recordAttempt,
    resetWorkspace,
    undo,
    redo,
    astPast,
    astFuture,
    user
  } = useStore();

  const canUndo = astPast.length > 0;
  const canRedo = astFuture.length > 0;

  // HP portrait: Triple-View butuh layar lebar → minta putar ke landscape.
  const [isPortraitPhone, setIsPortraitPhone] = useState(false);
  // ponytail: single flag for compact layout on short screens (mobile landscape) or tablet portrait views
  const [isCompact, setIsCompact] = useState(false);
  useEffect(() => {
    const check = () => {
      // Blokir rotasi untuk layar kecil dan medium (HP/Tablet portrait < 1024px).
      // Workspace membutuhkan layar melebar (landscape) untuk menampilkan seluruh editor.
      setIsPortraitPhone(window.innerWidth < 1024 && window.innerHeight > window.innerWidth);
      
      // Mode compact (tabbed) diaktifkan untuk HP landscape (tinggi <= 500px) ATAU tablet landscape/portrait (lebar < 1200px)
      setIsCompact(window.innerWidth < 1200 || window.innerHeight <= 500);
    };
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  const [activeTab, setActiveTab] = useState('kanvas'); // 'kanvas' | 'preview' | 'code'
  const [validationErrors, setValidationErrors] = useState([]);
  const [showValidationResult, setShowValidationResult] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  // Layar sempit (HP landscape): preview default disembunyikan agar editor lega
  const [showPreview, setShowPreview] = useState(
    () => typeof window === 'undefined' || window.innerWidth >= 900,
  );

  const [isOnboardingOpen, setIsOnboardingOpen] = useState(() => {
    const hideOnboarding = localStorage.getItem('webcraft_hide_onboarding');
    return hideOnboarding !== 'true';
  });

  const [showMissionPopup, setShowMissionPopup] = useState(false);

  // Open mission popup on mount or when onboarding closes
  useEffect(() => {
    if (activeLevelConfig?.misi) {
      const hideOnboarding = localStorage.getItem('webcraft_hide_onboarding') === 'true';
      if (hideOnboarding) {
        setShowMissionPopup(true);
      }
    }
  }, [activeLevelConfig]);

  const handleOnboardingClose = () => {
    setIsOnboardingOpen(false);
    if (activeLevelConfig?.misi) {
      setShowMissionPopup(true);
    }
  };

  // Reflection/Post-coding states
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [reflectionAnswer, setReflectionAnswer] = useState('');
  const [isAnalyzingReflection, setIsAnalyzingReflection] = useState(false);
  const [finalReport, setFinalReport] = useState(null);



  // --- Pembatas panel Triple-View yang bisa diseret (resize) ---
  const [paletteWidth, setPaletteWidth] = useState(() => {
    const saved = parseInt(localStorage.getItem('webcraft_palette_w') ?? '', 10);
    if (Number.isFinite(saved)) return Math.min(480, Math.max(200, saved));
    return window.innerWidth < 900 ? 220 : 280; // default hemat di layar sempit
  });
  const [previewWidth, setPreviewWidth] = useState(() => {
    const saved = parseInt(localStorage.getItem('webcraft_preview_w') ?? '', 10);
    return Number.isFinite(saved) ? Math.min(700, Math.max(240, saved)) : 380;
  });
  const [isResizing, setIsResizing] = useState(false);

  const startResize = (which) => (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = which === 'palette' ? paletteWidth : previewWidth;
    const handle = e.currentTarget;
    setIsResizing(true);
    // Pointer capture: event seret tetap mengalir ke pembatas walau kursor
    // melintasi iframe preview (tanpa ini seretan "macet" di atas iframe).
    try { handle.setPointerCapture(e.pointerId); } catch { /* event sintetik */ }

    // Batas atas dinamis: editor tengah selalu kebagian ruang ≥ ~330px,
    // berapa pun lebar layar (panel lain diukur saat seretan dimulai).
    const maxPalette = Math.min(
      480,
      window.innerWidth - (showPreview ? previewWidth : 0) - 340,
    );
    const maxPreview = Math.min(700, window.innerWidth - paletteWidth - 340);

    const onMove = (ev) => {
      const delta = ev.clientX - startX;
      // Lantai minimum diterapkan TERAKHIR agar selalu menang atas batas
      // dinamis (di jendela sempit batas dinamis bisa < lantai).
      if (which === 'palette') {
        setPaletteWidth(Math.max(200, Math.min(maxPalette, startWidth + delta)));
      } else {
        // Pembatas kanan: geser ke kiri = preview melebar
        setPreviewWidth(Math.max(240, Math.min(maxPreview, startWidth - delta)));
      }
    };
    const onUp = () => {
      setIsResizing(false);
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
      // Simpan lebar terakhir agar layout diingat antar sesi
      setPaletteWidth((w) => { localStorage.setItem('webcraft_palette_w', String(w)); return w; });
      setPreviewWidth((w) => { localStorage.setItem('webcraft_preview_w', String(w)); return w; });
    };
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
  };

  // Keyboard shortcuts for undo/redo (ignored while typing in a field).
  useEffect(() => {
    const handleKey = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const target = e.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [undo, redo]);

  // Block teachers from entering workspace unless in sandbox
  useEffect(() => {
    if (!isSandbox && user && user.role === 'guru') {
      toast.error("Sebagai Guru, Anda tidak dapat masuk ke lembar kerja praktik mandiri siswa.");
      navigate('/ruang-belajar');
    }
  }, [user, navigate, isSandbox]);

  // Alur berurutan: siswa harus menyelesaikan Analisis CT (fase Investigate)
  // sebelum masuk workspace misi — menutup akses langsung via URL.
  useEffect(() => {
    if (isSandbox || !activeLevelConfig || activeLevelConfig.type === 'sandbox') return;
    if (!user || user.role !== 'siswa') return;
    const { ctPreScore } = useStore.getState();
    if (ctPreScore == null) {
      const dest = activeLevelConfig.room_id && activeLevelConfig.pertemuan_id
        ? `/ruang-belajar/${activeLevelConfig.room_id}/tugas/${activeLevelConfig.pertemuan_id}`
        : '/ruang-belajar';
      navigate(dest, { replace: true });
    }
  }, [activeLevelConfig, isSandbox, user, navigate]);


  // Reset workspace & set level config when tugasId changes or isSandbox changes
  useEffect(() => {
    // ponytail: always reset AST when entering a new task
    resetWorkspace();

    if (isSandbox) {
      setActiveLevel(SANDBOX_LEVEL_CONFIG.id, {
        ...SANDBOX_LEVEL_CONFIG,
        type: 'sandbox'
      });
    } else if (tugasId === 'easy-1' || !tugasId) {
      setActiveLevel(DEFAULT_LEVEL_CONFIG.id, {
        ...DEFAULT_LEVEL_CONFIG,
        type: 'learning'
      });
    } else {
      api.get(`/pertemuan/tasks/${tugasId}`)
        .then(res => {
          const config = res.data;
          // Pindah ke task berbeda → analisis CT task sebelumnya tidak berlaku
          // (paritas dengan TugasDetail; menutup jalur pintas via URL).
          const { activeLevel, resetCtJourney } = useStore.getState();
          if (activeLevel && activeLevel !== config.id) {
            resetCtJourney();
          }
          setActiveLevel(config.id, {
            id: config.id,
            judul: config.judul,
            type: config.type,
            pertemuan_id: config.pertemuan_id || null,
            room_id: config.room_id || null,
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
  }, [tugasId, isSandbox, setActiveLevel, resetWorkspace]);

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
      toast.success("Proyek Kreatif: Kode Anda siap dikirim! Klik 'Kirim Hasil Misi' untuk mengumpulkan.");
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

      // Save submission to database if logged in (auth via cookie httpOnly)
      if (user) {
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
      {/* Ajakan putar HP: workspace hanya nyaman di landscape */}
      {isPortraitPhone && (
        <div className="fixed inset-0 z-[99998] bg-[#0F172A]/95 flex flex-col items-center justify-center gap-5 p-8 text-center">
          <div className="w-20 h-20 border-4 border-white rounded-2xl flex items-center justify-center animate-wiggle" style={{ animationDuration: '2s' }}>
            <i className="ti ti-device-mobile-rotated text-white text-5xl" />
          </div>
          <h3 className="font-fredoka text-xl font-bold text-white">Putar Layarmu ke Mode Landscape</h3>
          <p className="font-nunito text-sm font-bold text-slate-300 max-w-xs leading-relaxed">
            Workspace Triple-View butuh layar melebar supaya palet blok, kanvas, dan preview muat bersamaan. Putar perangkatmu, ya!
          </p>
          <button
            onClick={() => navigate(isSandbox ? '/' : '/ruang-belajar')}
            className="px-5 py-2.5 bg-white text-[#0F172A] border-2 border-[#0F172A] font-fredoka text-xs font-bold rounded-xl shadow-[3px_3px_0px_rgba(255,255,255,0.3)] cursor-pointer"
          >
            <i className="ti ti-arrow-left mr-1" /> Kembali
          </button>
        </div>
      )}

      {/* Top Toolbar Navigation */}
      {!isCompact && (
        <header className="w-full bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex justify-between items-center border-b-4 border-[#0F172A] shrink-0 shadow-md px-6 py-3.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (isSandbox) {
                  navigate('/');
                } else {
                  navigate('/ruang-belajar');
                }
              }}
              className="p-1 border-2 border-slate-700 hover:border-slate-500 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer flex items-center justify-center"
            >
              <i className="ti ti-arrow-left text-base" />
            </button>
            <div className="text-left leading-none">
              <h2 className="font-fredoka font-bold text-white tracking-tight text-base">
                Misi: {activeLevelConfig?.judul || 'Memuat...'}
              </h2>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Ruang Praktik Mandiri</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsOnboardingOpen(true)}
              title="Buka Panduan Penggunaan"
              className="border-2 border-indigo-400 bg-indigo-950 hover:bg-indigo-900 text-indigo-200 hover:text-white font-fredoka font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-[2px_2px_0px_rgba(255,255,255,0.15)] hover:-translate-y-0.5 active:translate-y-[0.5px] px-3 py-1.5 text-xs"
            >
              <i className="ti ti-help text-sm animate-pulse" />
              <span className="hidden sm:inline">Panduan</span>
            </button>

            {activeLevelConfig?.misi && (
              <button
                type="button"
                onClick={() => setShowMissionPopup(true)}
                title={isSandbox ? "Lihat Sambutan Sandbox" : "Lihat Misi Pembelajaran"}
                className="border-2 border-blue-400 bg-blue-950 hover:bg-blue-900 text-blue-200 hover:text-white font-fredoka font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-[2px_2px_0px_rgba(255,255,255,0.15)] hover:-translate-y-0.5 active:translate-y-[0.5px] px-3 py-1.5 text-xs"
              >
                <i className={`ti ${isSandbox ? 'ti-flask' : 'ti-target'} text-sm`} />
                <span className="hidden sm:inline">Misi</span>
              </button>
            )}



            <button
              type="button"
              onClick={() => setShowPreview(prev => !prev)}
              className={`border-2 border-slate-700 font-fredoka font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-[2px_2px_0px_rgba(255,255,255,0.15)] hover:-translate-y-0.5 active:translate-y-[0.5px] px-3 py-1.5 text-xs ${
                showPreview ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-800 text-slate-350 hover:bg-slate-700'
              }`}
            >
              <i className={`ti ${showPreview ? 'ti-layout-sidebar-right-collapse' : 'ti-layout-sidebar-right-expand'} text-sm`} />
              <span className="hidden sm:inline">{showPreview ? 'Sembunyikan Preview' : 'Tampilkan Preview'}</span>
            </button>

            <div className="flex items-center gap-1">
              <button
                onClick={undo}
                disabled={!canUndo}
                title="Urungkan (Ctrl+Z)"
                className="border-2 border-slate-700 rounded-lg transition-all cursor-pointer text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent p-1.5"
              >
                <i className="ti ti-arrow-back-up text-base" />
              </button>
              <button
                onClick={redo}
                disabled={!canRedo}
                title="Ulangi (Ctrl+Y)"
                className="border-2 border-slate-700 rounded-lg transition-all cursor-pointer text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent p-1.5"
              >
                <i className="ti ti-arrow-forward-up text-base" />
              </button>
            </div>
            <span className="bg-gradient-to-r from-amber-400 to-amber-500 text-[#0F172A] border-2 border-[#0F172A] font-fredoka font-black rounded-lg shadow-[2px_2px_0px_#0F172A] flex items-center gap-1 shrink-0 px-3.5 py-1.5 text-xs">
              <i className="ti ti-rocket text-sm animate-bounce-slow" />
              Fase Action
            </span>
          </div>
        </header>
      )}

      {/* Main Workspace Split Layout (3 Panels) */}
      <div className="flex-1 w-full flex flex-col overflow-hidden">
        
        {/* Mission Instructions Panel removed in favor of Misi Header Button */}

        <div className="flex-1 w-full flex items-stretch overflow-hidden">
          {/* Left Panel (Palette) */}
          <div className="h-full overflow-hidden bg-slate-50 shrink-0" style={{ width: paletteWidth }}>
            <PaletBlok isCompact={isCompact} />
          </div>

          {/* Pembatas geser: Palet ↔ Editor */}
          <div
            onPointerDown={startResize('palette')}
            className="w-[6px] shrink-0 bg-[#0F172A] cursor-col-resize touch-none hover:bg-blue-600 active:bg-blue-600 transition-colors"
            title="Seret untuk mengatur lebar palet blok"
          />

          {/* Middle Panel (Editor: Kanvas & Code & Preview) */}
          <div className="flex-1 h-full flex flex-col overflow-hidden bg-white min-w-0">
            <div className={`bg-slate-50 border-b-4 border-[#0F172A] flex justify-between items-center shrink-0 ${isCompact ? 'py-1.5 px-3 gap-2' : 'p-2.5 gap-2.5'}`}>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('kanvas')}
                  className={`border-2 border-[#0F172A] font-fredoka font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-[1.5px_1.5px_0px_#0F172A] hover:-translate-y-0.5 active:translate-y-[0.5px] ${
                    isCompact
                      ? `h-8 ${activeTab === 'kanvas' ? 'px-3 text-[10px]' : 'w-8 text-xs'}`
                      : 'px-4.5 py-2 text-xs'
                  } ${activeTab === 'kanvas'
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-none translate-y-[0.5px]'
                      : 'bg-white text-slate-600 hover:bg-slate-100/75'
                    }`}
                >
                  <i className={`ti ti-layout-grid ${isCompact ? 'text-xs' : 'text-sm'}`} />
                  {(!isCompact || activeTab === 'kanvas') && <span>Kanvas</span>}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('code')}
                  className={`border-2 border-[#0F172A] font-fredoka font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-[1.5px_1.5px_0px_#0F172A] hover:-translate-y-0.5 active:translate-y-[0.5px] ${
                    isCompact
                      ? `h-8 ${activeTab === 'code' ? 'px-3 text-[10px]' : 'w-8 text-xs'}`
                      : 'px-4.5 py-2 text-xs'
                  } ${activeTab === 'code'
                      ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-white shadow-none translate-y-[0.5px]'
                      : 'bg-white text-slate-600 hover:bg-slate-100/75'
                    }`}
                >
                  <i className={`ti ti-code ${isCompact ? 'text-xs' : 'text-sm'}`} />
                  {(!isCompact || activeTab === 'code') && <span>Kode</span>}
                </button>

                {isCompact && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    className={`border-2 border-[#0F172A] font-fredoka font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-[1.5px_1.5px_0px_#0F172A] hover:-translate-y-0.5 active:translate-y-[0.5px] ${
                      activeTab === 'preview' ? 'h-8 px-3 text-[10px]' : 'h-8 w-8 text-xs'
                    } ${activeTab === 'preview'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-none translate-y-[0.5px]'
                        : 'bg-white text-slate-600 hover:bg-slate-100/75'
                      }`}
                  >
                    <i className="ti ti-eye text-xs" />
                    {activeTab === 'preview' && <span>Preview</span>}
                  </button>
                )}
              </div>
              
              {isCompact && (
                <div className="flex items-center gap-1.5 ml-auto">
                  {/* Action Phase Badge (Dot/Minimal version) */}
                  <span className="w-8 h-8 rounded-lg bg-amber-400 border-2 border-[#0F172A] flex items-center justify-center shadow-[1.5px_1.5px_0px_#0F172A] shrink-0" title="Fase Action">
                    <i className="ti ti-rocket text-[12px] text-[#0F172A]" />
                  </span>

                  {/* Undo Button */}
                  <button
                    onClick={undo}
                    disabled={!canUndo}
                    title="Urungkan (Ctrl+Z)"
                    className="w-8 h-8 border-2 border-[#0F172A] rounded-lg bg-white text-[#0F172A] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-all active:translate-y-[0.5px] shadow-[1.5px_1.5px_0px_#0F172A] hover:-translate-y-0.5"
                  >
                    <i className="ti ti-arrow-back-up text-sm font-bold" />
                  </button>

                  {/* Redo Button */}
                  <button
                    onClick={redo}
                    disabled={!canRedo}
                    title="Ulangi (Ctrl+Y)"
                    className="w-8 h-8 border-2 border-[#0F172A] rounded-lg bg-white text-[#0F172A] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-all active:translate-y-[0.5px] shadow-[1.5px_1.5px_0px_#0F172A] hover:-translate-y-0.5"
                  >
                    <i className="ti ti-arrow-forward-up text-sm font-bold" />
                  </button>

                  {/* Misi / Challenge Info Button */}
                  {activeLevelConfig?.misi && (
                    <button
                      type="button"
                      onClick={() => setShowMissionPopup(true)}
                      title={isSandbox ? "Lihat Sambutan Sandbox" : "Lihat Misi Pembelajaran"}
                      className="w-8 h-8 border-2 border-[#0F172A] rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center cursor-pointer transition-all active:translate-y-[0.5px] shadow-[1.5px_1.5px_0px_#0F172A] hover:-translate-y-0.5 animate-pulse"
                    >
                      <i className={`ti ${isSandbox ? 'ti-flask text-xs' : 'ti-target text-xs'} text-white font-bold`} />
                    </button>
                  )}

                  {/* Help Onboarding Button */}
                  <button
                    type="button"
                    onClick={() => setIsOnboardingOpen(true)}
                    title="Bantuan Panduan"
                    className="w-8 h-8 border-2 border-[#0F172A] rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 text-white flex items-center justify-center cursor-pointer transition-all active:translate-y-[0.5px] shadow-[1.5px_1.5px_0px_#0F172A] hover:-translate-y-0.5"
                  >
                    <i className="ti ti-help text-sm text-white font-bold" />
                  </button>

                  {/* Divider line */}
                  <span className="w-[1.5px] h-4 bg-slate-350 mx-0.5"></span>

                  {/* Exit / Back Button */}
                  <button
                    onClick={async () => {
                      if (await confirmDialog({
                        title: 'Keluar Workspace',
                        message: 'Apakah Anda yakin ingin keluar? Progres koding yang belum disubmit mungkin hilang.',
                        danger: true,
                        confirmText: 'Keluar',
                        cancelText: 'Batal'
                      })) {
                        navigate(isSandbox ? '/' : '/ruang-belajar');
                      }
                    }}
                    title="Keluar dari Workspace"
                    className="px-3 h-8 border-2 border-[#0F172A] rounded-lg bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center gap-1 cursor-pointer font-fredoka text-[10px] font-black shadow-[1.5px_1.5px_0px_#0F172A] hover:-translate-y-0.5 active:translate-y-[0.5px] transition-all"
                  >
                    <i className="ti ti-arrow-left text-[11px]" />
                    Keluar
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 w-full relative overflow-y-auto bg-slate-50">
              <div className={`absolute inset-0 w-full h-full p-0 flex flex-col ${activeTab === 'kanvas' ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none'}`}>
                <Kanvas isCompact={isCompact} />
              </div>
              <div className={`absolute inset-0 w-full h-full p-4 flex flex-col ${activeTab === 'code' ? 'z-10 opacity-100 font-mono' : 'z-0 opacity-0 pointer-events-none'}`}>
                <CodePanel />
              </div>
              {isCompact && (
                <div className={`absolute inset-0 w-full h-full p-4 flex flex-col bg-white overflow-y-auto ${activeTab === 'preview' ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none'}`}>
                  <PreviewPanel />
                </div>
              )}
            </div>
          </div>

          {/* Pembatas geser: Editor ↔ Preview (statis saat preview disembunyikan) */}
          {!isCompact && (
            <div
              onPointerDown={showPreview ? startResize('preview') : undefined}
              className={`w-[6px] shrink-0 bg-[#0F172A] touch-none transition-colors ${
                showPreview ? 'cursor-col-resize hover:bg-blue-600 active:bg-blue-600' : ''
              }`}
              title={showPreview ? 'Seret untuk mengatur lebar preview' : undefined}
            />
          )}

          {/* Right Panel (Live Preview Drawer) */}
          {!isCompact && (
            <div
              className={`h-full flex flex-col bg-white shrink-0 ${isResizing ? '' : 'transition-all duration-300'} ${
                showPreview ? 'opacity-100 visible' : 'opacity-0 invisible overflow-hidden'
              }`}
              style={{ width: showPreview ? previewWidth : 0 }}
            >
              <div className={`bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-b-4 border-[#0F172A] flex items-center justify-center gap-1.5 shrink-0 shadow-sm ${isCompact ? 'py-1 px-2' : 'p-2 h-[52px]'}`}>
                <i className={`ti ti-eye text-white ${isCompact ? 'text-xs' : 'text-base'} animate-pulse`} />
                <span className={`font-fredoka font-bold text-white tracking-wide ${isCompact ? 'text-[10px]' : 'text-sm'}`}>Live Preview</span>
              </div>
              <div className="flex-1 relative bg-white p-4 overflow-y-auto">
                <PreviewPanel />
              </div>
            </div>
          )}
          </div>

        {/* Global Action Footer Bar */}
        <div className={`bg-white border-t-4 border-[#0F172A] flex justify-between items-center shrink-0 ${isCompact ? 'p-1 px-2 gap-2 flex-row' : 'p-4 gap-4 flex-col sm:flex-row'}`}>
          <div className="flex items-center gap-2 sm:gap-3 text-left w-auto">
            {isCompact ? (
              <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white border-2 border-[#0F172A] px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-[1.5px_1.5px_0px_#0F172A]">
                <i className="ti ti-history text-white text-[10px]" />
                <span className="font-fredoka text-[9px] font-bold">Uji: {attemptHistory.length}x</span>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white border-2 border-[#0F172A] px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-[2px_2px_0px_#0F172A]">
                <i className="ti ti-history text-white text-xs animate-spin-slow" />
                <span className="font-fredoka text-[10px] font-bold">Percobaan: {attemptHistory.length}x</span>
              </div>
            )}

            {showValidationResult && (
              isCompact ? (
                <div className={`px-2 py-0.5 rounded-lg border-2 border-[#0F172A] font-fredoka text-[9px] font-bold flex items-center gap-1 shadow-[1.5px_1.5px_0px_#0F172A] ${
                  isSuccess 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-red-500 text-white'
                }`}>
                  <i className={`ti ${isSuccess ? 'ti-circle-check text-xs' : 'ti-alert-triangle text-xs'}`} />
                  <span>{isSuccess ? 'Tuntas!' : `Kesalahan (${validationErrors.length})`}</span>
                </div>
              ) : (
                <div className={`px-3.5 py-1.5 rounded-xl border-2 border-[#0F172A] font-fredoka text-[10px] font-bold flex items-center gap-1.5 shadow-[2px_2px_0px_#0F172A] ${
                  isSuccess 
                    ? 'bg-gradient-to-r from-emerald-450 to-teal-500 text-white bg-emerald-500' 
                    : 'bg-gradient-to-r from-red-50 to-rose-100/50 text-red-700'
                }`}>
                  <i className={`ti ${isSuccess ? 'ti-circle-check text-white text-xs animate-bounce' : 'ti-alert-triangle text-red-500 text-xs animate-pulse'}`} />
                  <span>
                    {isSuccess
                      ? 'Luar biasa! Struktur kriteria misi telah terpenuhi!'
                      : `${validationErrors.length} kesalahan ditemukan. Evaluasi kembali!`}
                  </span>
                </div>
              )
            )}
          </div>

          {isSandbox ? (
            <div className="flex gap-2 w-auto shrink-0">
              <button
                type="button"
                onClick={async () => {
                  if (await confirmDialog({
                    title: 'Atur Ulang Kanvas',
                    message: isCompact ? "Reset kanvas?" : "Apakah Anda yakin ingin mengatur ulang kanvas dan mulai dari awal?",
                    danger: true,
                    confirmText: 'Reset',
                    cancelText: 'Batal'
                  })) {
                    resetWorkspace();
                  }
                }}
                className={`bg-white text-slate-700 border-2 border-[#0F172A] font-fredoka font-bold shadow-[2px_2px_0px_#0F172A] hover:-translate-y-0.5 active:translate-y-[0.5px] cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                  isCompact ? 'px-2.5 py-1 text-[9.5px] rounded-lg' : 'px-5 py-2.5 rounded-xl text-xs'
                }`}
              >
                <i className="ti ti-refresh" />
                {isCompact ? 'Reset' : 'Atur Ulang Kanvas'}
              </button>

              <button
                type="button"
                onClick={() => {
                  const codeStr = toFormattedCode(ast);
                  navigator.clipboard.writeText(codeStr);
                  toast.success(isCompact ? "Kode disalin!" : "Kode HTML berhasil disalin ke clipboard!");
                }}
                className={`bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-2 border-[#0F172A] font-fredoka font-bold shadow-[2px_2px_0px_#0F172A] hover:-translate-y-0.5 active:translate-y-[0.5px] cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                  isCompact ? 'px-2.5 py-1 text-[9.5px] rounded-lg' : 'px-6 py-2.5 rounded-xl text-xs'
                }`}
              >
                <i className="ti ti-copy" />
                {isCompact ? 'Salin' : 'Salin Kode HTML'}
              </button>
            </div>
          ) : (
            <div className="flex gap-2 w-auto shrink-0">
              <button
                type="button"
                onClick={handleValidate}
                disabled={isValidating}
                className={`bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 text-white border-2 border-[#0F172A] font-fredoka font-bold shadow-[2px_2px_0px_#0F172A] hover:-translate-y-0.5 active:translate-y-[0.5px] cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                  isCompact ? 'px-2.5 py-1 text-[9.5px] rounded-lg' : 'px-5 py-2.5 rounded-xl text-xs'
                } ${isValidating ? 'opacity-70 cursor-not-allowed shadow-none' : ''}`}
              >
                {isValidating ? (
                  <>
                    <i className="ti ti-loader animate-spin" />
                    {isCompact ? 'Proses...' : 'AI Sedang Memeriksa...'}
                  </>
                ) : (
                  <>
                    <i className="ti ti-sparkles text-yellow-300 animate-pulse" />
                    {isCompact ? 'Uji AI' : 'Cek Logika Kode (AI)'}
                  </>
                )}
              </button>

              <button
                onClick={handleSubmitChallenge}
                disabled={!isSuccess}
                className={`bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-2 border-[#0F172A] font-fredoka font-bold shadow-[2px_2px_0px_#0F172A] hover:-translate-y-0.5 active:translate-y-[0.5px] cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                  isCompact ? 'px-2.5 py-1 text-[9.5px] rounded-lg' : 'px-6 py-2.5 rounded-xl text-xs'
                } ${!isSuccess ? 'opacity-40 cursor-not-allowed transform-none hover:translate-y-0 shadow-none' : ''}`}
              >
                <i className="ti ti-send" />
                {isCompact ? 'Kirim' : 'Kirim Hasil Misi'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Validation Result Detail List */}
      {showValidationResult && validationErrors.length > 0 && (
        <div className={`bg-red-50 border-t-4 border-[#0F172A] text-left shrink-0 overflow-y-auto relative ${isCompact ? 'p-2 max-h-[60px]' : 'p-4 max-h-[140px]'}`}>
          {/* Close Button */}
          <button
            onClick={() => setShowValidationResult(false)}
            className="absolute top-2 right-2 md:top-3 md:right-3 w-5 h-5 flex items-center justify-center rounded bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 transition-colors cursor-pointer"
            title="Tutup Rincian"
          >
            <i className="ti ti-x text-[10px] font-bold" />
          </button>

          <h4 className="font-nunito text-xs font-bold text-red-750 flex items-center gap-1 mb-2 pr-6">
            <i className="ti ti-alert-triangle text-red-600 text-sm font-bold" />
            Rincian Kesalahan Struktur Kode:
          </h4>
          <ul className="font-nunito text-[11px] text-red-700 font-bold space-y-1 list-disc pl-4 pr-6">
            {validationErrors.map((err, idx) => (
              <li key={idx}>{err.message || err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Socratic AI Tutor Bubble */}
      {!isSandbox && <AITutorChat shiftUp={showValidationResult && validationErrors.length > 0} />}

      {/* Reflection Post-coding Modal */}
      {showReflectionModal && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white border-4 border-[#0F172A] rounded-2xl shadow-[8px_8px_0px_#0F172A] flex flex-col max-h-[90vh]">
            <div className="bg-emerald-500 text-white px-6 py-4 flex items-center gap-2 rounded-t-xl border-b-4 border-[#0F172A]">
              <i className="ti ti-message-star text-lg font-bold" />
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
        </div>,
        document.body
      )}

      {/* Mission Information Popup Modal */}
      {showMissionPopup && typeof window !== 'undefined' && (() => {
        const getFriendlyCriteria = (rule) => {
          const type = rule.type;
          const sel = rule.selector || '';
          const parent = rule.parent || '';
          const child = rule.child || '';
          
          if (type === 'exists') {
            if (sel === 'body') return 'Menyiapkan halaman utama web kamu dengan memasang Lembar Kerja (<body>)';
            if (sel === 'h1') return 'Membuat judul utama yang besar (<h1>) untuk menuliskan namamu';
            if (sel === 'p') return 'Menuliskan perkenalan singkat tentang dirimu menggunakan blok Paragraf (<p>)';
            if (sel === 'div') return 'Memasang Kotak Grup (<div>) sebagai wadah penata musik kesukaanmu';
            if (sel === 'h2') return 'Membuat judul berukuran sedang (<h2>) untuk menuliskan nama musik favoritmu';
            if (sel === 'style') return 'Memasang blok Hiasan Gaya (<style>) untuk mewarnai dan mempercantik halaman webmu';
            if (sel === 'ul') return 'Membuat Daftar Bulatan (<ul>) agar poin-poin keterampilanmu tersusun rapi';
            if (sel === 'li') return 'Menambahkan Poin Daftar (<li>) untuk menuliskan nama keterampilanmu satu-per-satu';
            return `Menambahkan blok <${sel}> ke dalam halaman web`;
          }
          if (type === 'child_of') {
            const getReadableName = (tag) => {
              if (tag === 'body') return 'Lembar Kerja (<body>)';
              if (tag === 'div') return 'Kotak Grup (<div>)';
              if (tag === 'h1') return 'Judul Utama (<h1>)';
              if (tag === 'h2') return 'Judul Sedang (<h2>)';
              if (tag === 'p') return 'Paragraf (<p>)';
              if (tag === 'ul') return 'Daftar Bulatan (<ul>)';
              if (tag === 'li') return 'Poin Daftar (<li>)';
              return `<${tag}>`;
            };
            return `Memasukkan blok ${getReadableName(child)} ke dalam ${getReadableName(parent)}`;
          }
          if (type === 'count') {
            return `Menambahkan minimal ${rule.min || 2} blok konten seru di dalam Lembar Kerja (<body>)`;
          }
          return rule.error_message || 'Kriteria wajib dipenuhi';
        };

        const cleanRules = activeLevelConfig?.validator_rules?.map(getFriendlyCriteria) || [];

        return createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative bg-white w-full max-w-lg border-4 border-[#0F172A] rounded-2xl shadow-[8px_8px_0px_#0F172A] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-950 text-white px-6 py-4 border-b-4 border-[#0F172A] flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <i className={`ti ${isSandbox ? 'ti-flask text-yellow-350 animate-bounce' : 'ti-target text-yellow-350 animate-pulse'} text-xl`} />
                  <h3 className="font-fredoka text-sm font-black tracking-wide leading-none text-white">
                    {isSandbox ? 'Sambutan Eksperimen Sandbox' : 'Detail Misi Pembelajaran'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowMissionPopup(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <i className="ti ti-x text-sm" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto text-left flex flex-col gap-5">
                <div>
                  <span className="font-fredoka text-[9px] font-black uppercase tracking-widest text-indigo-600 block mb-1">
                    {isSandbox ? 'Ruang Bebas' : 'Misi Aktif'}
                  </span>
                  <h4 className="font-fredoka text-base font-bold text-slate-800 leading-snug">
                    {isSandbox ? 'Mode Sandbox (Eksperimen Bebas)' : activeLevelConfig?.judul}
                  </h4>
                </div>

                {/* Mission / Challenge Description */}
                <div className="flex flex-col gap-2">
                  <span className="font-fredoka text-[9px] font-black uppercase tracking-widest text-indigo-500 block">Tantangan Misi</span>
                  <div className="border-2 border-[#0F172A] rounded-xl p-4 bg-indigo-50/40 shadow-[2px_2px_0px_rgba(0,0,0,0.05)]">
                    <p className="font-nunito text-xs text-slate-700 font-extrabold leading-relaxed whitespace-pre-line">
                      {activeLevelConfig?.misi}
                    </p>
                  </div>
                </div>

                {/* Success Criteria (Only if Rules Exist) */}
                {!isSandbox && cleanRules.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className="font-fredoka text-[9px] font-black uppercase tracking-widest text-[#EC4899] block">Kriteria Keberhasilan</span>
                    <div className="border-2 border-[#0F172A] rounded-xl p-3.5 bg-pink-50/30 flex flex-col gap-2.5 shadow-[2px_2px_0px_rgba(0,0,0,0.05)]">
                      {cleanRules.map((cleanMsg, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs font-nunito font-bold text-slate-750">
                          <i className="ti ti-checkbox text-[#EC4899] mt-0.5 text-base shrink-0" />
                          <span className="leading-snug">{cleanMsg}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Workspace Workflow */}
                <div className="flex flex-col gap-2">
                  <span className="font-fredoka text-[9px] font-black uppercase tracking-widest text-[#10B981] block">Alur Pengerjaan Workspace</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                    {[
                      { step: '1', title: 'Rakit Blok', desc: 'Seret & susun blok HTML dari palet kiri ke kanvas koding.', icon: 'ti-layout-grid-add', color: 'bg-blue-500' },
                      { step: '2', title: 'Isi Konten', desc: 'Klik dan ganti isi teks/sumber gambar sesuai instruksi.', icon: 'ti-edit', color: 'bg-amber-500' },
                      { step: '3', title: 'Uji AI', desc: 'Klik tombol Uji AI untuk memeriksa struktur dan logika kode.', icon: 'ti-sparkles', color: 'bg-purple-500' },
                      { step: '4', title: 'Kirim Karya', desc: 'Kirim hasil karyamu, jawab refleksi, dan dapatkan skor CT!', icon: 'ti-send', color: 'bg-emerald-500' }
                    ].map(flow => (
                      <div key={flow.step} className="border-2 border-[#0F172A] rounded-xl p-3 bg-slate-50 flex gap-2.5 shadow-[2px_2px_0px_rgba(0,0,0,0.05)] items-start">
                        <div className={`w-7 h-7 rounded-lg ${flow.color} text-white flex items-center justify-center shrink-0 border-2 border-[#0F172A] shadow-[1px_1px_0px_#0F172A]`}>
                          <i className={`ti ${flow.icon} text-sm`} />
                        </div>
                        <div className="leading-tight">
                          <h5 className="font-fredoka text-xs font-bold text-slate-800">{flow.step}. {flow.title}</h5>
                          <p className="font-nunito text-[10px] text-slate-500 font-bold mt-1 leading-normal">{flow.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 border-t-4 border-[#0F172A] p-4 flex justify-end shrink-0">
                <button
                  onClick={() => setShowMissionPopup(false)}
                  className="px-6 py-2.5 bg-blue-600 text-white border-2 border-[#0F172A] rounded-xl font-fredoka text-xs font-bold shadow-[2px_2px_0px_#0F172A] hover:-translate-y-0.5 active:translate-y-[1px] hover:shadow-[3px_3px_0px_#0F172A] active:shadow-[1px_1px_0px_#0F172A] cursor-pointer transition-all"
                >
                  {isSandbox ? 'Mulai Eksperimen!' : 'Mulai Misi!'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}

      {/* Workspace Onboarding Guide Tutorial Modal */}
      <WorkspaceOnboarding
        isOpen={isOnboardingOpen}
        onClose={handleOnboardingClose}
      />


    </div>
  );
}
