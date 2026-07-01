import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { aiService } from '../../services/aiService';
import api from '../../services/api';

export default function CTJourneyModal({ isOpen, onClose, viewOnly = false }) {
  const { ctJourneyAnswers, setCtJourneyAnswers, setCtPreScore, activeLevelConfig, ctPreScore } = useStore();
  const [currentStep, setCurrentStep] = useState(1); // 1: Decomposition, 2: Abstraction, 3: Pattern, 4: Algorithm, 5: Summary
  const [sessionId, setSessionId] = useState(null);

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
      'bg-[#3B82F6] text-white border-2 border-[#0F172A] hover:bg-[#2563EB]',
      'bg-[#EC4899] text-white border-2 border-[#0F172A] hover:bg-[#DB2777]',
      'bg-[#FACC15] text-[#0F172A] border-2 border-[#0F172A] hover:bg-[#EAB308]',
      'bg-[#10B981] text-white border-2 border-[#0F172A] hover:bg-[#059669]',
      'bg-[#8B5CF6] text-white border-2 border-[#0F172A] hover:bg-[#7C3AED]',
      'bg-[#F97316] text-white border-2 border-[#0F172A] hover:bg-[#EA580C]',
    ];
    return schemes[idx % schemes.length];
  };

  const getStepColorClass = (idx) => {
    const schemes = [
      'bg-[#93C5FD] border-4 border-[#0F172A]', // sky-300
      'bg-[#F9A8D4] border-4 border-[#0F172A]', // pink-300
      'bg-[#FDE68A] border-4 border-[#0F172A]', // amber-300
      'bg-[#A7F3D0] border-4 border-[#0F172A]', // emerald-300
      'bg-[#C084FC] border-4 border-[#0F172A]', // purple-300
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
        const title = (activeLevelConfig?.judul || '').toLowerCase();
        if (title.includes('profil') || title.includes('kartu') || title.includes('easy-1')) {
          setDecompChips(['Wadah body', 'Judul Profil', 'Paragraf Perkenalan', 'Foto Diri', 'Desain Kartu']);
          setSteps(shuffleArray([
            'Membuat wadah utama body',
            'Menambahkan judul utama h1 berisi nama profil',
            'Menyisipkan paragraf p untuk perkenalan diri',
            'Menyisipkan gambar foto profil menggunakan img',
            'Menambahkan style CSS untuk warna latar belakang kartu'
          ]));
        } else if (title.includes('musik') || title.includes('galeri') || title.includes('easy-2')) {
          setDecompChips(['Wadah body', 'Kotak pembungkus div', 'Judul Musik H2', 'Daftar Lagu', 'Desain Album']);
          setSteps(shuffleArray([
            'Membuat wadah utama body',
            'Menambahkan kotak pembungkus div di dalam body',
            'Menyisipkan judul sedang h2 tentang musik favorit',
            'Menyusun daftar lagu-lagu kesukaan',
            'Menghias tata letak galeri dengan CSS'
          ]));
        } else {
          setDecompChips(['Wadah body', 'Judul Halaman', 'Teks Konten', 'Daftar Item', 'Style CSS']);
          setSteps(shuffleArray([
            'Membuat wadah utama body',
            'Menambahkan judul utama halaman',
            'Menyisipkan konten utama',
            'Menyusun daftar item pendukung',
            'Menambahkan style hiasan CSS'
          ]));
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

        // Persist CT step to database if authenticated
        const token = localStorage.getItem('webcraft_token');
        if (token) {
          try {
            const saveRes = await api.post('/ct-journey/session', {
              session_id: sessionId,
              task_id: 'easy-1',
              step: stepName,
              answer: answerText
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
      const firstStep = stepsList[0].toLowerCase();
      const lastStep = stepsList[stepsList.length - 1].toLowerCase();
      const hasBodyFirst = firstStep.includes("body") || firstStep.includes("wadah") || firstStep.includes("utama");
      const hasStyleLast = lastStep.includes("style") || lastStep.includes("css") || lastStep.includes("hiasan") || lastStep.includes("menghias");

      if (!hasBodyFirst) return 70;
      if (!hasStyleLast && stepsList.slice(0, -1).some(s => s.toLowerCase().includes("style") || s.toLowerCase().includes("css"))) return 75;
      return 95;
    }

    return 85;
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

    // Before revealing the final scores (step 4 -> 5), warn that answers are locked.
    if (currentStep === 4) {
      const ok = window.confirm(
        "Jika kamu lanjut, jawaban CT Journey akan dikunci dan kamu TIDAK bisa kembali mengubahnya. Lanjutkan?"
      );
      if (!ok) return;
    }

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

      // Background database sync
      const token = localStorage.getItem('webcraft_token');
      if (token) {
        api.post('/ct-journey/session', {
          session_id: sessionId,
          task_id: activeLevelConfig?.id || 'easy-1',
          step: stepName,
          answer: answerText
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

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setAiFeedback('');
    }
  };

  const isNextDisabled = () => {
    if (viewOnly) return false;
    if (currentStep === 1 && (!decompChips || decompChips.length === 0)) return true;
    if (currentStep === 2 && (!selectedAbstract || selectedAbstract.length === 0)) return true;
    return false;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-[#FFFDF9] border-4 border-[#0F172A] rounded-[24px] shadow-[8px_8px_0px_#0F172A] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#4F46E5] text-white px-6 py-4.5 flex justify-between items-center rounded-t-[18px] border-b-4 border-[#0F172A]">
          <div className="flex items-center gap-2">
            <i className="ti ti-brain text-2xl font-bold animate-pulse text-[#FACC15]" />
            <h3 className="font-fredoka text-xl md:text-2xl font-bold tracking-wide">CT Journey - Fase Investigasi</h3>
          </div>
          <div className="font-nunito font-bold text-xs bg-black/20 px-3 py-1.5 rounded-xl border border-[#0F172A]/20">
            LEVEL: {challengeContext.title}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#F1F5F9] border-b-4 border-[#0F172A] p-4 flex justify-between items-center text-xs md:text-sm font-nunito font-black overflow-x-auto gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 transition-all ${currentStep === 1 ? 'bg-[#FACC15] text-[#0F172A] border-[#0F172A] shadow-[2.5px_2.5px_0px_#0F172A]' : 'border-slate-300 bg-white text-slate-500'}`}>
            <span>1. Dekomposisi</span>
          </div>
          <i className="ti ti-chevron-right text-slate-400 font-bold" />
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 transition-all ${currentStep === 2 ? 'bg-[#3B82F6] text-white border-[#0F172A] shadow-[2.5px_2.5px_0px_#0F172A]' : 'border-slate-300 bg-white text-slate-500'}`}>
            <span>2. Abstraksi</span>
          </div>
          <i className="ti ti-chevron-right text-slate-400 font-bold" />
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 transition-all ${currentStep === 3 ? 'bg-[#EC4899] text-white border-[#0F172A] shadow-[2.5px_2.5px_0px_#0F172A]' : 'border-slate-300 bg-white text-slate-500'}`}>
            <span>3. Pola</span>
          </div>
          <i className="ti ti-chevron-right text-slate-400 font-bold" />
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 transition-all ${currentStep === 4 ? 'bg-[#F97316] text-white border-[#0F172A] shadow-[2.5px_2.5px_0px_#0F172A]' : 'border-slate-300 bg-white text-slate-500'}`}>
            <span>4. Algoritma</span>
          </div>
          <i className="ti ti-chevron-right text-slate-400 font-bold" />
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 transition-all ${currentStep === 5 ? 'bg-[#10B981] text-white border-[#0F172A] shadow-[2.5px_2.5px_0px_#0F172A]' : 'border-slate-300 bg-white text-slate-500'}`}>
            <span>5. Ringkasan</span>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 md:p-8 flex-1 overflow-y-auto flex flex-col gap-5 text-left bg-[#FFFDF9]">
          {currentStep === 1 && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <h4 className="font-fredoka text-xl md:text-2xl font-bold text-[#0F172A] flex items-center gap-2.5">
                <span className="bg-[#FACC15] w-10 h-10 rounded-xl border-2 border-[#0F172A] flex items-center justify-center shadow-[2px_2px_0px_#0F172A]">
                  <i className="ti ti-bulb text-[#0F172A] text-xl" />
                </span>
                Fase 1: Dekomposisi (Decomposition)
              </h4>
              
              <div className="bg-[#FEF08A] border-4 border-[#0F172A] p-4.5 rounded-2xl shadow-[4px_4px_0px_#0F172A] flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div>
                  <p className="font-nunito text-sm md:text-base text-slate-800 font-black leading-relaxed">
                    <strong>Dekomposisi</strong> adalah memecah masalah besar menjadi bagian-bagian kecil yang lebih mudah dikelola.
                  </p>
                  <p className="font-nunito text-xs md:text-sm text-[#1D4ED8] font-black mt-1">
                    Menurutmu, bagian atau elemen apa saja yang harus ada di halaman web "{challengeContext.title}" ini?
                  </p>
                </div>
              </div>

              {!viewOnly && (
                <form onSubmit={handleAddChip} className="flex gap-2 mt-1">
                  <input
                    type="text"
                    placeholder="Contoh: Wadah body, Judul profil, Paragraf perkenalan..."
                    value={decompInput}
                    onChange={(e) => setDecompInput(e.target.value)}
                    className="flex-1 px-4 py-3 bg-white border-4 border-[#0F172A] rounded-xl font-nunito font-bold text-sm focus:outline-none focus:translate-x-0.5 focus:shadow-[2.5px_2.5px_0px_#0F172A] transition-all placeholder:text-slate-400"
                  />
                  <button type="submit" className="px-6 py-3 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-nunito font-bold rounded-xl border-4 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] hover:-translate-y-0.5 active:translate-y-[0.5px] transition-all cursor-pointer text-sm">
                    Tambah
                  </button>
                </form>
              )}

              <div className="flex flex-wrap gap-3 py-2">
                {decompChips.map((chip, idx) => (
                  <span
                    key={idx}
                    className={`flex items-center gap-2 border-2 border-[#0F172A] px-4 py-2 rounded-xl font-nunito text-sm font-black shadow-[3px_3px_0px_#0F172A] transition-all transform hover:-translate-y-0.5 ${getChipColorClass(idx)}`}
                  >
                    {chip}
                    {!viewOnly && (
                      <button type="button" onClick={() => handleRemoveChip(idx)} className="hover:text-red-400 cursor-pointer transition-colors flex items-center">
                        <i className="ti ti-x text-sm font-bold" />
                      </button>
                    )}
                  </span>
                ))}
                {decompChips.length === 0 && (
                  <p className="text-slate-500 font-nunito font-bold text-sm italic">Belum ada bagian yang ditambahkan.</p>
                )}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <h4 className="font-fredoka text-xl md:text-2xl font-bold text-[#0F172A] flex items-center gap-2.5">
                <span className="bg-[#3B82F6] w-10 h-10 rounded-xl border-2 border-[#0F172A] flex items-center justify-center shadow-[2px_2px_0px_#0F172A]">
                  <i className="ti ti-search text-white text-xl" />
                </span>
                Fase 2: Abstraksi (Abstraction)
              </h4>
              
              <div className="bg-[#BAE6FD] border-4 border-[#0F172A] p-4.5 rounded-2xl shadow-[4px_4px_0px_#0F172A] flex items-start gap-3">
                <span className="text-2xl">🔍</span>
                <div>
                  <p className="font-nunito text-sm md:text-base text-slate-800 font-black leading-relaxed">
                    <strong>Abstraksi</strong> adalah menyaring informasi yang tidak penting dan memfokuskan diri pada hal-hal yang krusial.
                  </p>
                  <p className="font-nunito text-xs md:text-sm text-[#4338CA] font-black mt-1">
                    Pilih tepat 3 bagian yang PALING penting untuk dibuat terlebih dahulu agar halaman web berfungsi dasar:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 py-2">
                {decompChips.map((chip, idx) => {
                  const isSelected = selectedAbstract.includes(chip);
                  return (
                    <div
                      key={idx}
                      onClick={() => !viewOnly && handleToggleAbstract(chip)}
                      className={`flex items-center gap-3 p-4 border-4 border-[#0F172A] rounded-2xl transition-all ${
                        viewOnly ? 'cursor-default' : 'cursor-pointer hover:bg-slate-100 hover:-translate-y-0.5'
                      } ${isSelected
                          ? 'bg-[#FACC15] text-[#0F172A] shadow-[5px_5px_0px_#0F172A] scale-[1.02]'
                          : 'bg-white text-slate-800 shadow-[2.5px_2.5px_0px_#0F172A]'
                        }`}
                    >
                      <div className={`w-6 h-6 border-2 border-[#0F172A] rounded-lg flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white'}`}>
                        {isSelected && <i className="ti ti-check text-white text-sm font-bold" />}
                      </div>
                      <span className="font-nunito text-sm md:text-base font-black">{chip}</span>
                    </div>
                  );
                })}
              </div>
              <p className="font-nunito text-sm text-slate-550 font-bold">Terpilih: {selectedAbstract.length}/3 bagian utama.</p>
            </div>
          )}

          {currentStep === 3 && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <h4 className="font-fredoka text-xl md:text-2xl font-bold text-[#0F172A] flex items-center gap-2.5">
                <span className="bg-[#EC4899] w-10 h-10 rounded-xl border-2 border-[#0F172A] flex items-center justify-center shadow-[2px_2px_0px_#0F172A]">
                  <i className="ti ti-palette text-white text-xl" />
                </span>
                Fase 3: Pengenalan Pola (Pattern Recognition)
              </h4>
              
              <div className="bg-[#FBCFE8] border-4 border-[#0F172A] p-4.5 rounded-2xl shadow-[4px_4px_0px_#0F172A] flex items-start gap-3">
                <span className="text-2xl">🎨</span>
                <div>
                  <p className="font-nunito text-sm md:text-base text-slate-800 font-black leading-relaxed">
                    <strong>Pengenalan Pola</strong> adalah mencari kesamaan di antara bagian-bagian web untuk memecahkannya secara kolektif.
                  </p>
                  <p className="font-nunito text-xs md:text-sm text-[#BE185D] font-black mt-1">
                    {viewOnly ? 'Kategori elemen web yang telah Anda kelompokkan:' : 'Kelompokkan setiap elemen web yang Anda dekomposisikan ke dalam kategori yang tepat di bawah ini:'}
                  </p>
                </div>
              </div>

              {/* Categorization controls */}
              {!viewOnly && (
                <div className="flex flex-col gap-3 max-h-60 overflow-y-auto p-3 border-4 border-[#0F172A] rounded-2xl bg-white shadow-[3px_3px_0px_#0F172A]">
                  {decompChips.map(chip => (
                    <div key={chip} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#F8FAFC] border-2 border-[#0F172A] p-3 rounded-xl gap-2.5 shadow-sm">
                      <span className="font-nunito text-sm font-black text-[#0F172A]">{chip}</span>
                      <div className="flex gap-2">
                        {['Teks', 'Visual', 'Style'].map(cat => {
                          const isCurrent = chipCategories[chip] === cat;
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setChipCategories(prev => ({ ...prev, [chip]: cat }))}
                              className={`px-4 py-1.5 border-2 border-[#0F172A] text-xs font-nunito font-black rounded-xl cursor-pointer transition-all ${isCurrent
                                  ? cat === 'Teks' ? 'bg-[#10B981] text-white shadow-[1.5px_1.5px_0px_#0F172A]' : cat === 'Visual' ? 'bg-[#EC4899] text-white shadow-[1.5px_1.5px_0px_#0F172A]' : 'bg-[#FACC15] text-[#0F172A] shadow-[1.5px_1.5px_0px_#0F172A]'
                                  : 'bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-[#0F172A]'
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
                    <div key={cat} className={`border-4 border-[#0F172A] rounded-2xl p-4.5 shadow-[4px_4px_0px_#0F172A] ${
                      cat === 'Teks' ? 'bg-[#A7F3D0]' : cat === 'Visual' ? 'bg-[#FBCFE8]' : 'bg-[#FDE68A]'
                    }`}>
                      <h5 className="font-fredoka font-black text-sm md:text-base mb-3 uppercase tracking-wide flex items-center gap-2 text-[#0F172A]">
                        <i className={`ti ${cat === 'Teks' ? 'ti-text-size' : cat === 'Visual' ? 'ti-photo' : 'ti-palette'} text-lg`} />
                        {cat}
                      </h5>
                      <div className="flex flex-col gap-2 min-h-[70px] bg-white/70 border-2 border-dashed border-[#0F172A] rounded-xl p-2.5">
                        {itemsInCat.map(item => (
                          <span key={item} className="bg-white border-2 border-[#0F172A] px-3 py-1.5 rounded-lg font-nunito text-xs md:text-sm font-black text-[#0F172A] text-center block leading-tight shadow-[1.5px_1.5px_0px_#0F172A] transition-all hover:scale-102">
                            {item}
                          </span>
                        ))}
                        {itemsInCat.length === 0 && (
                          <span className="text-xs text-slate-500 font-nunito font-black italic text-center py-4">Kosong</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <h4 className="font-fredoka text-xl md:text-2xl font-bold text-[#0F172A] flex items-center gap-2.5">
                <span className="bg-[#F97316] w-10 h-10 rounded-xl border-2 border-[#0F172A] flex items-center justify-center shadow-[2px_2px_0px_#0F172A]">
                  <i className="ti ti-rocket text-white text-xl animate-bounce" />
                </span>
                Fase 4: Desain Algoritma (Algorithmic Thinking)
              </h4>
              
              <div className="bg-[#FED7AA] border-4 border-[#0F172A] p-4.5 rounded-2xl shadow-[4px_4px_0px_#0F172A] flex items-start gap-3">
                <span className="text-2xl">🚀</span>
                <div>
                  <p className="font-nunito text-sm md:text-base text-slate-800 font-black leading-relaxed">
                    <strong>Desain Algoritma</strong> adalah merancang langkah-langkah logis berurutan untuk menyelesaikan masalah.
                  </p>
                  <p className="font-nunito text-xs md:text-sm text-[#C2410C] font-black mt-1">
                    {viewOnly ? 'Urutan langkah pembuatan kode halaman web yang telah Anda rancang:' : 'Urutan langkah pembuatan kode halaman web ini dari langkah pertama (atas) sampai langkah terakhir (bawah):'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 py-2">
                {steps.map((step, idx) => (
                  <div key={idx} className={`flex items-center gap-4.5 rounded-2xl shadow-[4px_4px_0px_#0F172A] transition-all hover:-translate-y-0.5 ${getStepColorClass(idx)}`}>
                    <span className="font-fredoka text-sm font-bold text-[#0F172A] bg-white border-2 border-[#0F172A] w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_#0F172A]">
                      {idx + 1}
                    </span>
                    <span className="font-nunito text-sm md:text-base font-black text-[#0F172A] flex-1">{step}</span>
                    {!viewOnly && (
                      <div className="flex gap-1.5 bg-white border-2 border-[#0F172A] p-1 rounded-xl shadow-[1px_1px_0px_#0F172A]">
                        <button
                          onClick={() => moveStep(idx, -1)}
                          disabled={idx === 0}
                          className={`p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors ${idx === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
                        >
                          <i className="ti ti-arrow-up text-base font-bold" />
                        </button>
                        <button
                          onClick={() => moveStep(idx, 1)}
                          disabled={idx === steps.length - 1}
                          className={`p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors ${idx === steps.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
                        >
                          <i className="ti ti-arrow-down text-base font-bold" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <h4 className="font-fredoka text-xl md:text-2xl font-bold text-[#0F172A] flex items-center gap-2.5">
                <span className="bg-[#10B981] w-10 h-10 rounded-xl border-2 border-[#0F172A] flex items-center justify-center shadow-[2px_2px_0px_#0F172A]">
                  <i className="ti ti-certificate text-white text-xl animate-spin-slow" />
                </span>
                Fase 5: Ringkasan Analisis & Rencana Kerja
              </h4>
              
              <div className="bg-[#A7F3D0] border-4 border-[#0F172A] p-4.5 rounded-2xl shadow-[4px_4px_0px_#0F172A] flex items-start gap-3">
                <span className="text-2xl">🏆</span>
                <div>
                  <p className="font-nunito text-sm md:text-base text-slate-800 font-black leading-relaxed">
                    <strong>Fase 5: Ringkasan Analisis & Rencana Kerja</strong>
                  </p>
                  <p className="font-nunito text-xs md:text-sm text-[#047857] font-black mt-1">
                    Rencana investigasi berpikir komputasional Anda yang berhasil dirumuskan:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2 text-center">
                <div className="bg-[#3B82F6] border-4 border-[#0F172A] rounded-2xl p-4 shadow-[4px_4px_0px_#0F172A] transform transition-transform hover:scale-103 text-white">
                  <p className="font-fredoka text-sm font-black uppercase tracking-wider text-blue-100">Dekomposisi</p>
                  <p className="font-fredoka text-3xl md:text-4xl font-bold mt-2.5">{accumulatedScores.decomposition || 85}</p>
                </div>
                <div className="bg-[#EC4899] border-4 border-[#0F172A] rounded-2xl p-4 shadow-[4px_4px_0px_#0F172A] transform transition-transform hover:scale-103 text-white">
                  <p className="font-fredoka text-sm font-black uppercase tracking-wider text-pink-100">Abstraksi</p>
                  <p className="font-fredoka text-3xl md:text-4xl font-bold mt-2.5">{accumulatedScores.abstraction || 88}</p>
                </div>
                <div className="bg-[#FACC15] border-4 border-[#0F172A] rounded-2xl p-4 shadow-[4px_4px_0px_#0F172A] transform transition-transform hover:scale-103 text-[#0F172A]">
                  <p className="font-fredoka text-sm font-black uppercase tracking-wider text-amber-900">Pola</p>
                  <p className="font-fredoka text-3xl md:text-4xl font-bold mt-2.5">{accumulatedScores.pattern || 80}</p>
                </div>
                <div className="bg-[#10B981] border-4 border-[#0F172A] rounded-2xl p-4 shadow-[4px_4px_0px_#0F172A] transform transition-transform hover:scale-103 text-white">
                  <p className="font-fredoka text-sm font-black uppercase tracking-wider text-emerald-100">Algoritma</p>
                  <p className="font-fredoka text-3xl md:text-4xl font-bold mt-2.5">{accumulatedScores.algorithm || 85}</p>
                </div>
              </div>

              <div className="border-4 border-[#0F172A] bg-[#E6F4EA] p-5 rounded-[20px] text-left mt-3 flex items-start gap-4 shadow-[4px_4px_0px_#0f172a]">
                <div className="bg-[#34D399] border-2 border-[#0F172A] text-[#0F172A] w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#0F172A]">
                  <i className="ti ti-circle-check text-xl font-bold" />
                </div>
                <div>
                  <h5 className="font-fredoka font-bold text-emerald-900 text-base mb-1">
                    {viewOnly ? 'Hasil analisis CT tersimpan!' : 'Rencana berpikirmu sudah siap!'}
                  </h5>
                  <p className="font-nunito text-sm text-slate-800 font-bold leading-relaxed">
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
            <div className="mt-4 border-4 border-[#0F172A] bg-[#8B5CF6] text-white p-5 rounded-[20px] flex items-start gap-4 shadow-[5px_5px_0px_#0f172a] animate-fade-in">
              <div className="bg-white border-2 border-[#0F172A] text-[#8B5CF6] w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#0F172A]">
                <i className="ti ti-robot text-xl animate-bounce" />
              </div>
              <div className="text-left">
                <p className="font-fredoka text-sm md:text-base font-black flex items-center gap-1.5 text-[#FACC15]">
                  Analisis AI
                </p>
                <p className="font-nunito text-xs md:text-sm font-black leading-relaxed mt-2.5 text-white">{aiFeedback}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t-4 border-[#0F172A] px-6 py-5 flex justify-between items-center bg-[#FFFDF9] rounded-b-[18px]">
          {currentStep < 5 ? (
            <button
              onClick={onClose}
              className="px-5 py-2.5 border-4 border-[#0F172A] bg-[#F1F5F9] hover:bg-[#E2E8F0] text-slate-700 font-nunito font-bold rounded-xl text-xs md:text-sm transition-all cursor-pointer shadow-[2.5px_2.5px_0px_#0F172A] active:translate-y-0.5 active:shadow-[1px_1px_0px_#0F172A]"
            >
              Tutup
            </button>
          ) : (
            <div /> /* Empty div to keep flex space-between */
          )}

          <div className="flex gap-3 items-center">
            {currentStep > 1 && currentStep < 5 && (
              <button
                type="button"
                onClick={handleBack}
                className="px-5 py-2.5 bg-white border-4 border-[#0F172A] text-slate-700 font-nunito font-bold rounded-xl text-xs md:text-sm shadow-[2.5px_2.5px_0px_#0F172A] hover:bg-[#F8FAFC] cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-[0.5px]"
              >
                Kembali
              </button>
            )}

            {currentStep < 5 && (
              <button
                onClick={handleAnalyzeStep}
                disabled={isLoadingFeedback || isNextDisabled()}
                title="Minta tanggapan AI atas jawabanmu"
                className={`px-5 h-11 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-fredoka font-bold rounded-xl text-xs md:text-sm border-4 border-[#0F172A] shadow-[3px_3px_0px_#0f172a] hover:-translate-y-0.5 active:translate-y-[0.5px] cursor-pointer transition-all flex items-center gap-1.5 ${(isLoadingFeedback || isNextDisabled()) ? 'opacity-50 cursor-not-allowed shadow-none transform-none' : ''}`}
              >
                {isLoadingFeedback ? (
                  <i className="ti ti-loader animate-spin text-sm" />
                ) : (
                  <>
                    <i className="ti ti-sparkles text-sm text-[#FACC15] animate-pulse" />
                    <span>Analisis AI</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleNext}
              disabled={isNextDisabled()}
              className={`px-6 py-2.5 bg-[#3B82F6] hover:bg-[#2563EB] text-white border-4 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] font-nunito font-black rounded-xl text-xs md:text-sm hover:-translate-y-0.5 active:translate-y-[0.5px] cursor-pointer transition-all ${isNextDisabled() ? 'opacity-50 cursor-not-allowed shadow-none transform-none' : ''
                }`}
            >
              {currentStep === 5 ? 'Selesai' : 'Lanjutkan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
