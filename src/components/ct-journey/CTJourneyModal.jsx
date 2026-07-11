import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../store/useStore';
import { aiService } from '../../services/aiService';
import api from '../../services/api';

export default function CTJourneyModal({ isOpen, onClose, viewOnly = false }) {
  const { ctJourneyAnswers, setCtJourneyAnswers, setCtPreScore, activeLevelConfig, ctPreScore, user } = useStore();
  const [currentStep, setCurrentStep] = useState(1); // 1: Decomposition, 2: Abstraction, 3: Pattern, 4: Algorithm, 5: Summary
  const [sessionId, setSessionId] = useState(null);
  const [showLockConfirm, setShowLockConfirm] = useState(false);

  // Local state for forms
  const [decompInput, setDecompInput] = useState('');
  const [decompChips, setDecompChips] = useState([]);
  const [selectedAbstract, setSelectedAbstract] = useState([]);
  const [chipCategories, setChipCategories] = useState({});
  const [steps, setSteps] = useState([]);

  // Shuffle and guarantee the result is NOT in the original (correct) order,
  // so the student always has to actively reorder the algorithm steps.
  const shuffleArray = (array) => {
    if (array.length < 2) return [...array];
    let shuffled;
    let attempts = 0;
    do {
      shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      attempts++;
    } while (attempts < 8 && shuffled.every((v, idx) => v === array[idx]));
    return shuffled;
  };

  const getChipColorClass = (idx) => {
    const schemes = [
      'bg-gradient-to-r from-blue-50 to-blue-100/50 text-blue-700 border-2 border-blue-400 hover:from-blue-100 hover:to-blue-200/50',
      'bg-gradient-to-r from-pink-50 to-pink-100/50 text-pink-700 border-2 border-pink-400 hover:from-pink-100 hover:to-pink-200/50',
      'bg-gradient-to-r from-amber-50 to-amber-100/50 text-amber-700 border-2 border-amber-400 hover:from-amber-100 hover:to-amber-200/50',
      'bg-gradient-to-r from-emerald-50 to-emerald-100/50 text-emerald-700 border-2 border-emerald-400 hover:from-emerald-100 hover:to-emerald-200/50',
      'bg-gradient-to-r from-purple-50 to-purple-100/50 text-purple-700 border-2 border-purple-400 hover:from-purple-100 hover:to-purple-200/50',
      'bg-gradient-to-r from-orange-50 to-orange-100/50 text-orange-700 border-2 border-orange-400 hover:from-orange-100 hover:to-orange-200/50',
    ];
    return schemes[idx % schemes.length];
  };

  const getStepColorClass = (idx) => {
    const schemes = [
      'bg-gradient-to-r from-blue-50 to-sky-100/30 border-4 border-blue-500 text-blue-900',
      'bg-gradient-to-r from-pink-50 to-rose-100/30 border-4 border-pink-500 text-pink-900',
      'bg-gradient-to-r from-amber-50 to-yellow-100/30 border-4 border-amber-500 text-amber-900',
      'bg-gradient-to-r from-emerald-50 to-teal-100/30 border-4 border-emerald-500 text-emerald-900',
      'bg-gradient-to-r from-purple-50 to-indigo-100/30 border-4 border-purple-500 text-purple-900',
    ];
    return schemes[idx % schemes.length];
  };

  const [aiFeedback, setAiFeedback] = useState('');
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [accumulatedScores, setAccumulatedScores] = useState({
    decomposition: 0,
    abstraction: 0,
    pattern: 0,
    algorithm: 0
  });

  const getDefaultSteps = () => {
    const teacherCt = activeLevelConfig?.ct_journey || {};
    const teacherSteps = Array.isArray(teacherCt.algorithm_steps) ? teacherCt.algorithm_steps.filter(Boolean) : [];
    if (teacherSteps.length > 0) {
      return shuffleArray(teacherSteps);
    }
    const title = (activeLevelConfig?.judul || '').toLowerCase();
    if (title.includes('profil') || title.includes('kartu') || title.includes('easy-1')) {
      return shuffleArray([
        'Membuat wadah utama body',
        'Menambahkan judul utama h1 berisi nama profil',
        'Menyisipkan paragraf p untuk perkenalan diri',
        'Menyisipkan gambar foto profil menggunakan img',
        'Menambahkan style CSS untuk warna latar belakang kartu'
      ]);
    } else if (title.includes('musik') || title.includes('galeri') || title.includes('easy-2')) {
      return shuffleArray([
        'Membuat wadah utama body',
        'Menambahkan kotak pembungkus div di dalam body',
        'Menyisipkan judul sedang h2 tentang musik favorit',
        'Menyusun daftar lagu-lagu kesukaan',
        'Menghias tata letak galeri dengan CSS'
      ]);
    } else {
      return shuffleArray([
        'Membuat wadah utama body',
        'Menambahkan judul utama halaman',
        'Menyisipkan konten utama',
        'Menyusun daftar item pendukung',
        'Menambahkan style hiasan CSS'
      ]);
    }
  };

  // Dynamically initialize chips and steps based on active level title
  React.useEffect(() => {
    if (isOpen) {
      if (viewOnly) {
        // Load finalized answers from store
        setDecompChips(ctJourneyAnswers?.decomposition || []);
        setSelectedAbstract(ctJourneyAnswers?.abstraction || []);
        setChipCategories(ctJourneyAnswers?.pattern || {});
        setSteps(ctJourneyAnswers?.algorithm || []);
        
        // Match exact scores with those stored in database/zustand to prevent differences
        if (ctPreScore) {
          setAccumulatedScores({
            decomposition: ctPreScore.decomposition || 85,
            abstraction: ctPreScore.abstraction || 88,
            pattern: ctPreScore.pattern_recognition || 80,
            algorithm: ctPreScore.algorithm_design || 85
          });
        }
      } else {
        // Prevent wiping out state if already initialized locally
        if (decompChips.length > 0 || selectedAbstract.length > 0 || Object.keys(chipCategories).length > 0 || steps.length > 0) {
          return;
        }

        // If store already has saved answers, load them to resume
        if (ctJourneyAnswers && ctJourneyAnswers.decomposition && ctJourneyAnswers.decomposition.length > 0) {
          setDecompChips(ctJourneyAnswers.decomposition);
          setSelectedAbstract(ctJourneyAnswers.abstraction || []);
          setChipCategories(ctJourneyAnswers.pattern || {});
          
          if (ctJourneyAnswers.algorithm && ctJourneyAnswers.algorithm.length > 0) {
            setSteps(ctJourneyAnswers.algorithm);
          } else {
            setSteps(getDefaultSteps());
          }
          
          if (ctPreScore) {
            setAccumulatedScores({
              decomposition: ctPreScore.decomposition || 0,
              abstraction: ctPreScore.abstraction || 0,
              pattern: ctPreScore.pattern || 0,
              algorithm: ctPreScore.algorithm || 0
            });
          }
        } else {
          const teacherCt = activeLevelConfig?.ct_journey || {};
          const teacherDecomp = Array.isArray(teacherCt.decomposition_options) ? teacherCt.decomposition_options.filter(Boolean) : [];

          if (teacherDecomp.length > 0) {
            setDecompChips(teacherDecomp);
            setSteps(getDefaultSteps());
          } else {
            const title = (activeLevelConfig?.judul || '').toLowerCase();
            if (title.includes('profil') || title.includes('kartu') || title.includes('easy-1')) {
              setDecompChips(['Wadah body', 'Judul Profil', 'Paragraf Perkenalan', 'Foto Diri', 'Desain Kartu']);
            } else if (title.includes('musik') || title.includes('galeri') || title.includes('easy-2')) {
              setDecompChips(['Wadah body', 'Kotak pembungkus div', 'Judul Musik H2', 'Daftar Lagu', 'Desain Album']);
            } else {
              setDecompChips(['Wadah body', 'Judul Halaman', 'Teks Konten', 'Daftar Item', 'Style CSS']);
            }
            setSteps(getDefaultSteps());
          }
          setSelectedAbstract([]);
          setChipCategories({});
          setSessionId(null);
          setAccumulatedScores({
            decomposition: 0,
            abstraction: 0,
            pattern: 0,
            algorithm: 0
          });
        }
      }
    }
  }, [isOpen, viewOnly, activeLevelConfig, ctJourneyAnswers, ctPreScore]);

  // Auto-classify chips on load or when chips are added
  React.useEffect(() => {
    if (viewOnly) return; // Don't auto-classify when viewing locked responses
    const initial = { ...chipCategories };
    decompChips.forEach(chip => {
      if (!initial[chip]) {
        const lower = chip.toLowerCase();
        if (lower.includes('judul') || lower.includes('penjelasan') || lower.includes('teks') || lower.includes('deskripsi') || lower.includes('paragraf') || lower.includes('list') || lower.includes('item')) {
          initial[chip] = 'Teks';
        } else if (lower.includes('gambar') || lower.includes('foto') || lower.includes('ilustrasi') || lower.includes('visual') || lower.includes('logo') || lower.includes('img') || lower.includes('diri')) {
          initial[chip] = 'Visual';
        } else if (lower.includes('style') || lower.includes('warna') || lower.includes('hiasan') || lower.includes('font') || lower.includes('css') || lower.includes('penghias') || lower.includes('desain')) {
          initial[chip] = 'Style';
        } else {
          initial[chip] = 'Teks';
        }
      }
    });
    setChipCategories(initial);
  }, [decompChips, viewOnly]);

  if (!isOpen) return null;

  const challengeContext = {
    title: activeLevelConfig?.judul || "Misi Coding Web",
    description: activeLevelConfig?.misi || "Selesaikan tantangan coding web ini menggunakan Computational Thinking."
  };

  const handleAddChip = (e) => {
    e.preventDefault();
    if (decompInput.trim() && !decompChips.includes(decompInput.trim())) {
      setDecompChips([...decompChips, decompInput.trim()]);
      setDecompInput('');
    }
  };

  const handleRemoveChip = (index) => {
    setDecompChips(decompChips.filter((_, i) => i !== index));
  };

  const handleToggleAbstract = (chip) => {
    if (selectedAbstract.includes(chip)) {
      setSelectedAbstract(selectedAbstract.filter(c => c !== chip));
    } else {
      if (selectedAbstract.length < 3) {
        setSelectedAbstract([...selectedAbstract, chip]);
      }
    }
  };

  const moveStep = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= steps.length) return;
    const newSteps = [...steps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[nextIndex];
    newSteps[nextIndex] = temp;
    setSteps(newSteps);
  };

  const handleAnalyzeStep = async () => {
    setIsLoadingFeedback(true);
    setAiFeedback('');

    let answerText = '';
    let stepName = '';

    if (currentStep === 1) {
      stepName = 'decomposition';
      answerText = `Saya memecah web menjadi: ${decompChips.join(', ')}`;
    } else if (currentStep === 2) {
      stepName = 'abstraction';
      answerText = `Tiga bagian terpenting: ${selectedAbstract.join(', ')}`;
    } else if (currentStep === 3) {
      stepName = 'pattern';
      answerText = `Pengelompokan elemen: ${JSON.stringify(chipCategories)}`;
    } else if (currentStep === 4) {
      stepName = 'algorithm';
      answerText = `Urutan langkah pembuatan: ${steps.join(' -> ')}`;
    }

    try {
      const result = await aiService.analyzeCTStep(
        stepName,
        `Tantangan: ${challengeContext.title}. Evaluasi jawaban siswa untuk langkah ${stepName}.`,
        answerText,
        challengeContext
      );

      setAiFeedback(result.feedback);

      if (!viewOnly) {
        setAccumulatedScores(prev => ({
          ...prev,
          [stepName]: result.ct_score_delta
        }));

        // Store in Zustand
        let answerData = decompChips;
        if (currentStep === 2) answerData = selectedAbstract;
        if (currentStep === 3) answerData = chipCategories;
        if (currentStep === 4) answerData = steps;
        setCtJourneyAnswers(stepName, answerData);

        // Persist CT step to database if authenticated (cookie httpOnly)
        if (user) {
          try {
            const saveRes = await api.post('/ct-journey/session', {
              session_id: sessionId,
              task_id: 'easy-1',
              step: stepName,
              answer: answerText,
              score: result.ct_score_delta
            });
            if (saveRes.data?.session_id) {
              setSessionId(saveRes.data.session_id);
            }
          } catch (saveErr) {
            console.error("Gagal menyimpan progress CT Journey ke database:", saveErr);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingFeedback(false);
    }
  };

  const calculateLocalScore = (stepName, data) => {
    const textKws = ["judul", "h1", "h2", "paragraf", "p", "teks", "tulisan", "deskripsi", "nama", "lirik", "lagu", "keterampilan", "halaman", "item", "list", "li", "ul"];
    const visualKws = ["foto", "gambar", "img", "ilustrasi", "visual", "logo", "ikon", "video"];
    const styleKws = ["desain", "warna", "style", "css", "hiasan", "tampilan", "font", "background"];
    const webKws = ["body", "wadah", "div", "kontainer", "pembungkus", "button", "tombol", "kreatif"];
    const allValidKws = [...textKws, ...visualKws, ...styleKws, ...webKws];

    if (stepName === 'decomposition') {
      const items = data || [];
      if (items.length < 3) return 65;
      const words = items.join(" ").toLowerCase();
      const hasRelevant = allValidKws.some(kw => words.includes(kw));
      if (!hasRelevant) return 60;
      return Math.min(98, 85 + (items.length - 3) * 4);
    }

    if (stepName === 'abstraction') {
      const items = data || [];
      let styleCount = 0;
      items.forEach(item => {
        const itemLower = item.toLowerCase();
        if (styleKws.some(kw => itemLower.includes(kw))) styleCount++;
      });
      if (styleCount >= 2) return 70;
      return 92;
    }

    if (stepName === 'pattern') {
      const categories = data || {};
      let miscategorizedCount = 0;
      Object.keys(categories).forEach(name => {
        const nameLower = name.toLowerCase();
        const cat = categories[name];
        if (cat === "Teks") {
          if (visualKws.some(kw => nameLower.includes(kw)) && !textKws.some(kw => nameLower.includes(kw))) miscategorizedCount++;
          else if (styleKws.some(kw => nameLower.includes(kw)) && !textKws.some(kw => nameLower.includes(kw))) miscategorizedCount++;
        } else if (cat === "Visual") {
          if (textKws.some(kw => nameLower.includes(kw)) && !visualKws.some(kw => nameLower.includes(kw))) miscategorizedCount++;
          else if (styleKws.some(kw => nameLower.includes(kw)) && !visualKws.some(kw => nameLower.includes(kw))) miscategorizedCount++;
        } else if (cat === "Style") {
          if (textKws.some(kw => nameLower.includes(kw)) && !styleKws.some(kw => nameLower.includes(kw))) miscategorizedCount++;
          else if (visualKws.some(kw => nameLower.includes(kw)) && !styleKws.some(kw => nameLower.includes(kw))) miscategorizedCount++;
        }
      });
      if (miscategorizedCount > 0) return 72;
      return 95;
    }

    if (stepName === 'algorithm') {
      const stepsList = data || [];
      if (stepsList.length === 0) return 60;
      const firstStep = (stepsList[0] || "").toLowerCase();
      const lastStep = (stepsList[stepsList.length - 1] || "").toLowerCase();
      const hasBodyFirst = firstStep.includes("body") || firstStep.includes("wadah") || firstStep.includes("utama");
      const hasStyleLast = lastStep.includes("style") || lastStep.includes("css") || lastStep.includes("hiasan") || lastStep.includes("menghias");

      if (!hasBodyFirst) return 70;
      if (!hasStyleLast && stepsList.slice(0, -1).some(s => (s || "").toLowerCase().includes("style") || (s || "").toLowerCase().includes("css"))) return 75;
      return 95;
    }

    return 85;
  };

  const advanceStep = () => {
    // Save current step data to Zustand and Database if not already done
    let stepName = '';
    let answerData = null;
    let answerText = '';

    if (currentStep === 1) {
      stepName = 'decomposition';
      answerData = decompChips;
      answerText = `Saya memecah web menjadi: ${decompChips.join(', ')}`;
    } else if (currentStep === 2) {
      stepName = 'abstraction';
      answerData = selectedAbstract;
      answerText = `Tiga bagian terpenting: ${selectedAbstract.join(', ')}`;
    } else if (currentStep === 3) {
      stepName = 'pattern';
      answerData = chipCategories;
      answerText = `Pengelompokan elemen: ${JSON.stringify(chipCategories)}`;
    } else if (currentStep === 4) {
      stepName = 'algorithm';
      answerData = steps;
      answerText = `Urutan langkah pembuatan: ${steps.join(' -> ')}`;
    }

    if (stepName) {
      setCtJourneyAnswers(stepName, answerData);

      // Calculate local score dynamically if not reviewed by AI yet
      const localScore = calculateLocalScore(stepName, answerData);
      setAccumulatedScores(prev => ({
        ...prev,
        [stepName]: prev[stepName] || localScore
      }));

      // Background database sync (auth via cookie httpOnly)
      if (user) {
        api.post('/ct-journey/session', {
          session_id: sessionId,
          task_id: activeLevelConfig?.id || 'easy-1',
          step: stepName,
          answer: answerText,
          score: accumulatedScores[stepName] || localScore
        }).then(saveRes => {
          if (saveRes.data?.session_id) {
            setSessionId(saveRes.data.session_id);
          }
        }).catch(err => console.error("Gagal menyimpan progress CT Journey:", err));
      }
    }

    setAiFeedback('');
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    } else {
      // Calculate composite score
      const finalPreScore = {
        decomposition: accumulatedScores.decomposition || 85,
        pattern_recognition: accumulatedScores.pattern || 80,
        abstraction: accumulatedScores.abstraction || 88,
        algorithm_design: accumulatedScores.algorithm || 85
      };
      setCtPreScore(finalPreScore);
      onClose(); // Close modal and open workspace
    }
  };

  const handleNext = () => {
    if (viewOnly) {
      if (currentStep < 5) {
        setCurrentStep(currentStep + 1);
      } else {
        onClose();
      }
      return;
    }

    // Step 4 -> 5 locks the answers. Use an in-app confirmation instead of
    // window.confirm(), which some browsers silently suppress (making the
    // "Lanjutkan" button appear to do nothing).
    if (currentStep === 4) {
      setShowLockConfirm(true);
      return;
    }

    advanceStep();
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setAiFeedback('');
    }
  };

  const isNextDisabled = () => {
    if (viewOnly) return false;
    if (currentStep === 1 && (!decompChips || decompChips.length === 0)) return true;
    if (currentStep === 2 && (!selectedAbstract || selectedAbstract.length !== 3)) return true;
    return false;
  };

  return typeof window !== 'undefined' && createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex justify-center items-center p-4 md:p-6">
      <div className="w-full max-w-4xl max-h-[92vh] bg-white border-4 border-[#0F172A] rounded-[28px] shadow-[8px_8px_0px_#0F172A] flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white px-6 py-4 flex justify-between items-center border-b-4 border-[#0F172A] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="bg-white/10 w-9 h-9 rounded-xl border border-white/20 flex items-center justify-center shadow-inner">
              <i className="ti ti-brain text-xl font-bold animate-pulse text-yellow-300" />
            </div>
            <h3 className="font-fredoka text-lg md:text-xl font-bold tracking-wide">CT Journey · Penyelidikan Berpikir Komputasional</h3>
          </div>
          <div className="font-fredoka font-black text-[10px] bg-yellow-400 text-slate-900 px-3 py-1.5 rounded-lg border-2 border-[#0F172A] shadow-[1.5px_1.5px_0px_#0F172A] uppercase tracking-wider">
            {challengeContext.title}
          </div>
        </div>

        {/* Progress Bar (Light capsule pills) */}
        <div className="w-full bg-[#F8FAFC] border-b-4 border-[#0F172A] p-4 flex justify-between items-center text-xs md:text-sm font-fredoka font-bold overflow-x-auto gap-2 select-none shrink-0">
          {[
            { step: 1, label: '1. Dekomposisi', icon: 'ti-layout-grid-add', activeColor: 'bg-gradient-to-r from-amber-400 to-amber-500 text-[#0F172A]' },
            { step: 2, label: '2. Abstraksi', icon: 'ti-filter', activeColor: 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white' },
            { step: 3, label: '3. Pola', icon: 'ti-subtask', activeColor: 'bg-gradient-to-r from-pink-500 to-rose-600 text-white' },
            { step: 4, label: '4. Algoritma', icon: 'ti-list-numbers', activeColor: 'bg-gradient-to-r from-orange-500 to-amber-600 text-white' },
            { step: 5, label: '5. Ringkasan', icon: 'ti-certificate', activeColor: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white' },
          ].map((s, idx) => (
            <React.Fragment key={s.step}>
              {idx > 0 && <i className="ti ti-chevron-right text-slate-400 font-bold shrink-0" />}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 transition-all shrink-0 ${
                currentStep === s.step 
                  ? s.activeColor + ' border-[#0F172A] shadow-[2px_2px_0px_#0F172A] scale-102' 
                  : 'border-slate-300 bg-white text-slate-400'
              }`}>
                <i className={`ti ${s.icon} text-sm`} />
                <span>{s.label}</span>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Content Area */}
        <div className="p-5 md:p-6 flex-1 min-h-0 overflow-y-auto flex flex-col gap-5 text-left bg-gradient-to-tr from-slate-50 via-white to-indigo-50/20">
          {currentStep === 1 && (
            <div className="flex flex-col gap-5 animate-fade-in">
              <h4 className="font-fredoka text-base md:text-lg font-bold text-[#0F172A] flex items-center gap-2">
                <span className="bg-[#FACC15] w-8 h-8 rounded-lg border-2 border-[#0F172A] flex items-center justify-center shadow-[1.5px_1.5px_0px_#0F172A]">
                  <i className="ti ti-bulb text-[#0F172A] text-base" />
                </span>
                Fase 1: Dekomposisi (Decomposition)
              </h4>
              
              <div className="bg-gradient-to-r from-amber-50 to-[#FFFDF2] border-4 border-[#0F172A] p-5 rounded-2xl shadow-[4px_4px_0px_#0F172A] flex gap-3.5 relative overflow-hidden">
                <div className="bg-amber-100 border-2 border-[#0F172A] w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_#0F172A]">
                  <i className="ti ti-bulb text-amber-700 text-lg" />
                </div>
                <div className="relative z-10 flex-1">
                  <p className="font-nunito text-xs md:text-sm text-slate-800 font-bold leading-relaxed">
                    <b>Dekomposisi</b> adalah memecah tantangan besar menjadi bagian-bagian kecil yang lebih mudah dikelola.
                  </p>
                  <p className="font-fredoka text-xs md:text-sm text-blue-700 font-bold mt-1.5 leading-relaxed">
                    <i className="ti ti-help text-sm inline-block mr-1.5 align-middle" /> Menurutmu, bagian atau elemen apa saja yang harus ada di halaman web "{challengeContext.title}" ini?
                  </p>
                </div>
              </div>

              {!viewOnly && (
                <form onSubmit={handleAddChip} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ketik lalu klik Tambah. Contoh: Wadah body, Judul profil, CSS hiasan..."
                    value={decompInput}
                    onChange={(e) => setDecompInput(e.target.value)}
                    className="flex-1 px-4 py-3 bg-white border-4 border-[#0F172A] rounded-xl font-nunito font-bold text-xs md:text-sm focus:outline-none focus:translate-x-0.5 focus:shadow-[2px_2px_0px_#0F172A] transition-all placeholder:text-slate-400"
                  />
                  <button type="submit" className="px-6 py-3 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-fredoka font-bold rounded-xl border-4 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] hover:-translate-y-0.5 active:translate-y-[0.5px] transition-all cursor-pointer text-xs md:text-sm">
                    Tambah
                  </button>
                </form>
              )}

              <div className="flex flex-wrap gap-2.5 py-2">
                {decompChips.map((chip, idx) => (
                  <span
                    key={idx}
                    className={`flex items-center gap-2 border-2 border-[#0F172A] px-4 py-2 rounded-full font-fredoka text-xs font-bold shadow-[2.5px_2.5px_0px_#0F172A] transition-all transform hover:-translate-y-0.5 ${getChipColorClass(idx)}`}
                  >
                    {chip}
                    {!viewOnly && (
                      <button type="button" onClick={() => handleRemoveChip(idx)} className="hover:text-red-400 cursor-pointer transition-colors flex items-center font-bold">
                        <i className="ti ti-x text-xs" />
                      </button>
                    )}
                  </span>
                ))}
                {decompChips.length === 0 && (
                  <p className="text-slate-400 font-nunito font-bold text-xs italic">Belum ada bagian yang didefinisikan.</p>
                )}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="flex flex-col gap-5 animate-fade-in">
              <h4 className="font-fredoka text-base md:text-lg font-bold text-[#0F172A] flex items-center gap-2">
                <span className="bg-[#3B82F6] w-8 h-8 rounded-lg border-2 border-[#0F172A] flex items-center justify-center shadow-[1.5px_1.5px_0px_#0F172A]">
                  <i className="ti ti-search text-white text-base" />
                </span>
                Fase 2: Abstraksi (Abstraction)
              </h4>
              
              <div className="bg-gradient-to-r from-blue-50 to-[#F0F7FF] border-4 border-[#0F172A] p-5 rounded-2xl shadow-[4px_4px_0px_#0F172A] flex gap-3.5 relative overflow-hidden">
                <div className="bg-blue-100 border-2 border-[#0F172A] w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_#0F172A]">
                  <i className="ti ti-filter text-blue-700 text-lg" />
                </div>
                <div className="relative z-10 flex-1">
                  <p className="font-nunito text-xs md:text-sm text-slate-800 font-bold leading-relaxed">
                    <b>Abstraksi</b> adalah menyaring informasi yang tidak penting dan memfokuskan diri pada hal-hal yang krusial.
                  </p>
                  <p className="font-fredoka text-xs md:text-sm text-indigo-700 font-bold mt-1.5 leading-relaxed">
                    <i className="ti ti-target text-sm inline-block mr-1.5 align-middle" /> Pilih tepat <b>3 bagian</b> yang PALING penting untuk dibuat terlebih dahulu agar halaman web berfungsi dasar:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
                {decompChips.map((chip, idx) => {
                  const isSelected = selectedAbstract.includes(chip);
                  return (
                    <div
                      key={idx}
                      onClick={() => !viewOnly && handleToggleAbstract(chip)}
                      className={`flex items-center justify-between p-4 border-4 border-[#0F172A] rounded-2xl transition-all select-none ${
                        viewOnly ? 'cursor-default' : 'cursor-pointer hover:bg-slate-50 hover:-translate-y-0.5'
                      } ${isSelected
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-[4px_4px_0px_#0F172A] scale-[1.01]'
                          : 'bg-white text-slate-800 shadow-[2px_2px_0px_#0F172A]'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 border-2 rounded-lg flex items-center justify-center transition-all ${isSelected ? 'bg-white border-white text-indigo-600' : 'bg-slate-50 border-slate-300'}`}>
                          {isSelected && <i className="ti ti-check text-[10px] font-bold" />}
                        </div>
                        <span className="font-fredoka text-xs md:text-sm font-bold">{chip}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="font-fredoka text-xs text-slate-500 font-bold bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl w-fit">Terpilih: <span className="text-blue-600">{selectedAbstract.length}/3</span> bagian utama.</p>
            </div>
          )}

          {currentStep === 3 && (
            <div className="flex flex-col gap-5 animate-fade-in">
              <h4 className="font-fredoka text-base md:text-lg font-bold text-[#0F172A] flex items-center gap-2">
                <span className="bg-[#EC4899] w-8 h-8 rounded-lg border-2 border-[#0F172A] flex items-center justify-center shadow-[1.5px_1.5px_0px_#0F172A]">
                  <i className="ti ti-palette text-white text-base" />
                </span>
                Fase 3: Pengenalan Pola (Pattern Recognition)
              </h4>
              
              <div className="bg-gradient-to-r from-pink-50 to-[#FFF1F2] border-4 border-[#0F172A] p-5 rounded-2xl shadow-[4px_4px_0px_#0F172A] flex gap-3.5 relative overflow-hidden">
                <div className="bg-pink-100 border-2 border-[#0F172A] w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_#0F172A]">
                  <i className="ti ti-subtask text-pink-700 text-lg" />
                </div>
                <div className="relative z-10 flex-1">
                  <p className="font-nunito text-xs md:text-sm text-slate-800 font-bold leading-relaxed">
                    <b>Pengenalan Pola</b> adalah mencari kesamaan di antara bagian-bagian web untuk memecahkannya secara kolektif.
                  </p>
                  <p className="font-fredoka text-xs md:text-sm text-pink-700 font-bold mt-1.5 leading-relaxed">
                    <i className="ti ti-layers-intersect text-sm inline-block mr-1.5 align-middle" /> Kelompokkan setiap elemen web ke dalam kategori yang tepat:
                  </p>
                </div>
              </div>

              {/* Categorization controls */}
              {!viewOnly && (
                <div className="flex flex-col gap-2 max-h-56 overflow-y-auto p-3.5 border-4 border-[#0F172A] rounded-2xl bg-[#F8FAFC] shadow-[3px_3px_0px_#0F172A]">
                  {decompChips.map(chip => (
                    <div key={chip} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border-2 border-slate-200 hover:border-slate-300 p-3 rounded-xl gap-2.5 transition-colors">
                      <span className="font-fredoka text-xs font-bold text-[#0F172A]">{chip}</span>
                      <div className="flex gap-1.5">
                        {['Teks', 'Visual', 'Style'].map(cat => {
                          const isCurrent = chipCategories[chip] === cat;
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setChipCategories(prev => ({ ...prev, [chip]: cat }))}
                              className={`px-3.5 py-1.5 border-2 border-[#0F172A] text-[10px] font-fredoka font-black rounded-lg cursor-pointer transition-all ${isCurrent
                                  ? cat === 'Teks' ? 'bg-[#10B981] text-white shadow-[1px_1px_0px_#0F172A]' : cat === 'Visual' ? 'bg-[#EC4899] text-white shadow-[1px_1px_0px_#0F172A]' : 'bg-[#FACC15] text-[#0F172A] shadow-[1px_1px_0px_#0F172A]'
                                  : 'bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-700'
                                }`}
                            >
                              {cat}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Group Buckets */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                {['Teks', 'Visual', 'Style'].map(cat => {
                  const itemsInCat = decompChips.filter(chip => chipCategories[chip] === cat);
                  return (
                    <div key={cat} className={`border-4 border-[#0F172A] rounded-2xl p-4 shadow-[4px_4px_0px_#0F172A] ${
                      cat === 'Teks' ? 'bg-[#ECFDF5]' : cat === 'Visual' ? 'bg-[#FFF1F2]' : 'bg-[#FFFBEB]'
                    }`}>
                      <h5 className={`font-fredoka font-black text-xs md:text-sm mb-3 uppercase tracking-wide flex items-center gap-1.5 ${
                        cat === 'Teks' ? 'text-emerald-700' : cat === 'Visual' ? 'text-rose-700' : 'text-amber-700'
                      }`}>
                        <i className={`ti ${cat === 'Teks' ? 'ti-text-size' : cat === 'Visual' ? 'ti-photo' : 'ti-palette'} text-base`} />
                        {cat}
                      </h5>
                      <div className="flex flex-col gap-2 min-h-[80px] bg-white border-2 border-dashed border-slate-350 rounded-xl p-2.5">
                        {itemsInCat.map(item => (
                          <span key={item} className="bg-white border-2 border-[#0F172A] px-3 py-1.5 rounded-lg font-nunito text-xs font-bold text-[#0F172A] text-center block shadow-[1.5px_1.5px_0px_#0F172A]">
                            {item}
                          </span>
                        ))}
                        {itemsInCat.length === 0 && (
                          <span className="text-[10px] text-slate-400 font-nunito font-bold italic text-center py-5">Belum ada</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="flex flex-col gap-5 animate-fade-in">
              <h4 className="font-fredoka text-base md:text-lg font-bold text-[#0F172A] flex items-center gap-2">
                <span className="bg-[#F97316] w-8 h-8 rounded-lg border-2 border-[#0F172A] flex items-center justify-center shadow-[1.5px_1.5px_0px_#0F172A]">
                  <i className="ti ti-rocket text-white text-base animate-bounce" />
                </span>
                Fase 4: Desain Algoritma (Algorithmic Thinking)
              </h4>
              
              <div className="bg-gradient-to-r from-orange-50 to-[#FFF7ED] border-4 border-[#0F172A] p-5 rounded-2xl shadow-[4px_4px_0px_#0F172A] flex gap-3.5 relative overflow-hidden">
                <div className="bg-orange-100 border-2 border-[#0F172A] w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_#0F172A]">
                  <i className="ti ti-list-numbers text-orange-700 text-lg" />
                </div>
                <div className="relative z-10 flex-1">
                  <p className="font-nunito text-xs md:text-sm text-slate-800 font-bold leading-relaxed">
                    <b>Desain Algoritma</b> adalah merancang langkah-langkah logis berurutan untuk menyelesaikan masalah.
                  </p>
                  <p className="font-fredoka text-xs md:text-sm text-orange-700 font-bold mt-1.5 leading-relaxed">
                    <i className="ti ti-list text-sm inline-block mr-1.5 align-middle" /> Urutkan langkah pengerjaan berikut dari yang pertama (atas) ke terakhir (bawah):
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 py-2">
                {steps.map((step, idx) => (
                  <div key={idx} className={`flex items-center gap-4 rounded-xl shadow-[3px_3px_0px_#0F172A] p-3 transition-all hover:-translate-y-0.5 ${getStepColorClass(idx)}`}>
                    <span className="font-fredoka text-xs font-bold text-[#0F172A] bg-white border-2 border-[#0F172A] w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_#0F172A]">
                      {idx + 1}
                    </span>
                    <span className="font-fredoka text-xs md:text-sm font-bold text-[#0F172A] flex-1 leading-snug">{step}</span>
                    {!viewOnly && (
                      <div className="flex gap-1 bg-white border-2 border-[#0F172A] p-0.5 rounded-lg shadow-[1px_1px_0px_#0F172A]">
                        <button
                          type="button"
                          onClick={() => moveStep(idx, -1)}
                          disabled={idx === 0}
                          className={`p-1 rounded hover:bg-slate-100 cursor-pointer transition-colors ${idx === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
                        >
                          <i className="ti ti-arrow-up text-xs font-bold text-slate-850" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveStep(idx, 1)}
                          disabled={idx === steps.length - 1}
                          className={`p-1 rounded hover:bg-slate-100 cursor-pointer transition-colors ${idx === steps.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
                        >
                          <i className="ti ti-arrow-down text-xs font-bold text-slate-855" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="flex flex-col gap-5 animate-fade-in">
              <h4 className="font-fredoka text-base md:text-lg font-bold text-[#0F172A] flex items-center gap-2">
                <span className="bg-[#10B981] w-8 h-8 rounded-lg border-2 border-[#0F172A] flex items-center justify-center shadow-[1.5px_1.5px_0px_#0F172A]">
                  <i className="ti ti-certificate text-white text-base animate-spin-slow" />
                </span>
                Fase 5: Ringkasan Analisis & Rencana Kerja
              </h4>
              
              <div className="bg-gradient-to-r from-emerald-50 to-[#ECFDF5] border-4 border-[#0F172A] p-5 rounded-2xl shadow-[4px_4px_0px_#0F172A] flex gap-3.5 relative overflow-hidden">
                <div className="bg-emerald-100 border-2 border-[#0F172A] w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_#0F172A]">
                  <i className="ti ti-certificate text-emerald-700 text-lg" />
                </div>
                <div className="relative z-10 flex-1">
                  <p className="font-nunito text-xs md:text-sm text-slate-800 font-bold leading-relaxed">
                    <b>Fase 5: Ringkasan Analisis & Rencana Kerja</b>
                  </p>
                  <p className="font-fredoka text-xs md:text-sm text-emerald-700 font-bold mt-1.5 leading-relaxed">
                    <i className="ti ti-check text-sm inline-block mr-1.5 align-middle" /> Rencana berpikir komputasional Anda berhasil dirumuskan!
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2 text-center">
                <div className="bg-gradient-to-br from-blue-400 to-blue-600 border-4 border-[#0F172A] rounded-2xl p-4 shadow-[4px_4px_0px_#0F172A] text-white">
                  <p className="font-fredoka text-[10px] md:text-xs font-black uppercase tracking-wider text-blue-100">Dekomposisi</p>
                  <p className="font-fredoka text-2xl md:text-3xl font-black mt-2">{accumulatedScores.decomposition || 85}</p>
                </div>
                <div className="bg-gradient-to-br from-rose-400 to-pink-600 border-4 border-[#0F172A] rounded-2xl p-4 shadow-[4px_4px_0px_#0F172A] text-white bg-rose-500">
                  <p className="font-fredoka text-[10px] md:text-xs font-black uppercase tracking-wider text-pink-100">Abstraksi</p>
                  <p className="font-fredoka text-2xl md:text-3xl font-black mt-2">{accumulatedScores.abstraction || 88}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-400 to-amber-505 border-4 border-[#0F172A] rounded-2xl p-4 shadow-[4px_4px_0px_#0F172A] text-[#0F172A] bg-amber-400">
                  <p className="font-fredoka text-[10px] md:text-xs font-black uppercase tracking-wider text-amber-900">Pola</p>
                  <p className="font-fredoka text-2xl md:text-3xl font-black mt-2">{accumulatedScores.pattern || 80}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-400 to-teal-600 border-4 border-[#0F172A] rounded-2xl p-4 shadow-[4px_4px_0px_#0F172A] text-white bg-emerald-500">
                  <p className="font-fredoka text-[10px] md:text-xs font-black uppercase tracking-wider text-emerald-100">Algoritma</p>
                  <p className="font-fredoka text-2xl md:text-3xl font-black mt-2">{accumulatedScores.algorithm || 85}</p>
                </div>
              </div>

              <div className="border-4 border-[#0F172A] bg-[#E8F8EE] p-5 rounded-[20px] text-left mt-3 flex items-start gap-4 shadow-[4px_4px_0px_#0F172A]">
                <div className="bg-[#34D399] border-2 border-[#0F172A] text-[#0F172A] w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#0F172A]">
                  <i className="ti ti-circle-check text-lg font-bold" />
                </div>
                <div>
                  <h5 className="font-fredoka font-bold text-emerald-900 text-sm md:text-base mb-0.5">
                    {viewOnly ? 'Hasil analisis CT tersimpan!' : 'Rencana berpikirmu sudah siap!'}
                  </h5>
                  <p className="font-nunito text-xs md:text-sm text-slate-800 font-bold leading-relaxed">
                    {viewOnly
                      ? 'Kamu telah menyelesaikan semua fase CT Journey ini sebelumnya. Analisis berpikir komputasional ini menjadi bekalmu saat coding di Workspace.'
                      : 'Kamu sudah memecah masalah, memilih bagian penting, mengenali pola, dan menyusun algoritmanya. Gunakan rencana ini sebagai panduan saat merakit kode di fase Action nanti. Semangat!'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* AI feedback section */}
          {aiFeedback && (
            <div className="mt-4 border-4 border-[#0F172A] bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-5 rounded-[20px] flex items-start gap-4 shadow-[4px_4px_0px_#0F172A] animate-fade-in">
              <div className="bg-white border-2 border-[#0F172A] text-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#0F172A]">
                <i className="ti ti-robot text-lg animate-bounce" />
              </div>
              <div className="text-left">
                <p className="font-fredoka text-xs md:text-sm font-black flex items-center gap-1.5 text-yellow-300">
                  <i className="ti ti-sparkles text-sm animate-pulse" /> Analisis AI WebCraft
                </p>
                <p className="font-nunito text-xs md:text-sm font-semibold leading-relaxed mt-2 text-white">{aiFeedback}</p>
              </div>
            </div>
          )}
        </div>

        {/* In-app lock confirmation (replaces window.confirm for reliability) */}
        {showLockConfirm && (
          <div className="absolute inset-0 z-30 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border-4 border-[#0F172A] rounded-2xl shadow-[6px_6px_0px_#0F172A] max-w-sm w-full p-5 text-center">
              <div className="mx-auto w-12 h-12 bg-amber-100 border-2 border-[#0F172A] rounded-xl flex items-center justify-center mb-3 shadow-[2px_2px_0px_#0F172A]">
                <i className="ti ti-lock text-amber-700 text-xl" />
              </div>
              <h4 className="font-fredoka font-bold text-[#0F172A] text-base mb-1">Kunci jawaban CT Journey?</h4>
              <p className="font-nunito text-xs text-slate-600 font-semibold mb-4 leading-relaxed">
                Setelah lanjut, jawabanmu akan dikunci dan tidak bisa diubah lagi.
              </p>
              <div className="flex gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => setShowLockConfirm(false)}
                  className="px-4 py-2 border-2 border-[#0F172A] bg-white text-slate-700 rounded-xl text-xs font-fredoka font-bold cursor-pointer hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => { setShowLockConfirm(false); advanceStep(); }}
                  className="px-4 py-2 bg-blue-600 text-white border-2 border-[#0F172A] rounded-xl text-xs font-fredoka font-bold cursor-pointer shadow-[2px_2px_0px_#0F172A] hover:-translate-y-0.5 transition-all"
                >
                  Ya, lanjutkan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t-4 border-[#0F172A] px-6 py-4.5 flex justify-between items-center bg-white rounded-b-[24px] shrink-0">
          {currentStep < 5 ? (
            <button
              onClick={onClose}
              className="px-5.5 py-2.5 border-4 border-[#0F172A] bg-[#F1F5F9] hover:bg-[#E2E8F0] text-slate-700 font-fredoka font-bold rounded-xl text-xs md:text-sm shadow-[3px_3px_0px_#0F172A] hover:-translate-y-0.5 active:translate-y-[0.5px] active:shadow-[1px_1px_0px_#0F172A] transition-all cursor-pointer"
            >
              Tutup
            </button>
          ) : (
            <div />
          )}

          <div className="flex gap-3 items-center">
            {currentStep > 1 && currentStep < 5 && (
              <button
                type="button"
                onClick={handleBack}
                className="px-5.5 py-2.5 bg-white border-4 border-[#0F172A] text-slate-700 font-fredoka font-bold rounded-xl text-xs md:text-sm shadow-[3px_3px_0px_#0F172A] hover:bg-[#F8FAFC] hover:-translate-y-0.5 active:translate-y-[0.5px] active:shadow-[1px_1px_0px_#0F172A] cursor-pointer transition-all"
              >
                Kembali
              </button>
            )}

            {currentStep < 5 && (
              <button
                onClick={handleAnalyzeStep}
                disabled={isLoadingFeedback || isNextDisabled()}
                title="Minta tanggapan AI atas jawabanmu"
                className={`px-5.5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-fredoka font-bold rounded-xl text-xs md:text-sm border-4 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] hover:-translate-y-0.5 active:translate-y-[0.5px] active:shadow-[1px_1px_0px_#0F172A] cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                  (isLoadingFeedback || isNextDisabled()) ? 'opacity-50 cursor-not-allowed shadow-none transform-none active:translate-y-0' : ''
                }`}
              >
                {isLoadingFeedback ? (
                  <i className="ti ti-loader animate-spin text-sm" />
                ) : (
                  <>
                    <i className="ti ti-sparkles text-sm text-yellow-300 animate-pulse" />
                    <span>Analisis AI</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleNext}
              disabled={isNextDisabled()}
              className={`px-5.5 py-2.5 bg-[#3B82F6] hover:bg-[#2563EB] text-white border-4 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] font-fredoka font-bold rounded-xl text-xs md:text-sm hover:-translate-y-0.5 active:translate-y-[0.5px] active:shadow-[1px_1px_0px_#0F172A] cursor-pointer transition-all ${
                isNextDisabled() ? 'opacity-50 cursor-not-allowed shadow-none transform-none active:translate-y-0' : ''
              }`}
            >
              {currentStep === 5 ? 'Selesai' : 'Lanjutkan'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
