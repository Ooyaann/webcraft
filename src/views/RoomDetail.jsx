import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from '@/lib/router-compat';
import { useStore } from '../store/useStore';
import api from '../services/api';
import { KKM } from '../lib/scoring';

export default function RoomDetail() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { activeRoom, setActiveRoom, user } = useStore();
  const [pertemuanList, setPertemuanList] = useState([]);
  const [completedTaskIds, setCompletedTaskIds] = useState(new Set());
  const [remedialIds, setRemedialIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Modal control states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  // Validator-rule editor (teacher)
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [rulesTaskId, setRulesTaskId] = useState(null);
  const [rulesPertJudul, setRulesPertJudul] = useState('');
  const [rulesList, setRulesList] = useState([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesSaving, setRulesSaving] = useState(false);
  const [rulesTab, setRulesTab] = useState('rules'); // 'rules' | 'ct'
  const [ctDecomp, setCtDecomp] = useState([]);
  const [ctSteps, setCtSteps] = useState([]);

  // Form states
  const [announcementText, setAnnouncementText] = useState('');
  
  // Meeting form fields
  const [editingPert, setEditingPert] = useState(null);
  const [judul, setJudul] = useState('');
  const [urutan, setUrutan] = useState(1);
  const [isPublished, setIsPublished] = useState(true);
  
  // CBL Engage fields
  const [bigIdea, setBigIdea] = useState('Coding & Web');
  const [essentialQuestion, setEssentialQuestion] = useState('');
  const [challenge, setChallenge] = useState('');
  
  // Guiding & Reflection Lists
  const [guidingQuestions, setGuidingQuestions] = useState([]);
  const [newGuiding, setNewGuiding] = useState('');
  const [reflectionQuestions, setReflectionQuestions] = useState([]);
  const [newReflection, setNewReflection] = useState('');

  // Materials List
  const [materiList, setMateriList] = useState([]);
  const [materiTitle, setMateriTitle] = useState('');
  const [materiUrl, setMateriUrl] = useState('');

  const isTeacher = user?.role === 'guru';

  // --- Validator rule editor (teacher) ---
  const handleOpenRulesModal = async (pert) => {
    setShowRulesModal(true);
    setRulesPertJudul(pert.judul);
    setRulesTaskId(null);
    setRulesList([]);
    setRulesTab('rules');
    setCtDecomp([]);
    setCtSteps([]);
    setRulesLoading(true);
    try {
      const res = await api.get(`/pertemuan/${pert.id}/learning-task`);
      setRulesTaskId(res.data.id);
      setRulesList(res.data.validator_rules_json || []);
      const ct = res.data.ct_journey_json || {};
      setCtDecomp(Array.isArray(ct.decomposition_options) ? ct.decomposition_options : []);
      setCtSteps(Array.isArray(ct.algorithm_steps) ? ct.algorithm_steps : []);
    } catch (err) {
      console.error('Gagal memuat aturan validasi:', err);
      alert('Gagal memuat aturan validasi tugas ini.');
      setShowRulesModal(false);
    } finally {
      setRulesLoading(false);
    }
  };

  const updateRule = (index, field, value) => {
    setRulesList(prev => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const addRule = () => {
    setRulesList(prev => [...prev, { type: 'exists', selector: '', error_message: '' }]);
  };

  const removeRule = (index) => {
    setRulesList(prev => prev.filter((_, i) => i !== index));
  };

  // CT Journey content editors (decomposition options + algorithm steps)
  const addCtDecomp = () => setCtDecomp(prev => [...prev, '']);
  const removeCtDecomp = (i) => setCtDecomp(prev => prev.filter((_, idx) => idx !== i));
  const updateCtDecomp = (i, v) => setCtDecomp(prev => prev.map((x, idx) => (idx === i ? v : x)));
  const addCtStep = () => setCtSteps(prev => [...prev, '']);
  const removeCtStep = (i) => setCtSteps(prev => prev.filter((_, idx) => idx !== i));
  const updateCtStep = (i, v) => setCtSteps(prev => prev.map((x, idx) => (idx === i ? v : x)));
  const moveCtStep = (i, dir) => setCtSteps(prev => {
    const j = i + dir;
    if (j < 0 || j >= prev.length) return prev;
    const next = [...prev];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  const handleSaveRules = async () => {
    // Keep only the fields relevant to each rule type.
    const cleaned = rulesList.map(r => {
      const base = { type: r.type, error_message: (r.error_message || '').trim() };
      if (r.type === 'child_of') {
        return { ...base, parent: (r.parent || '').trim(), child: (r.child || '').trim() };
      }
      return { ...base, selector: (r.selector || '').trim() };
    });
    if (cleaned.some(r => !r.error_message)) {
      alert('Setiap aturan harus memiliki pesan kesalahan.');
      return;
    }
    setRulesSaving(true);
    try {
      await api.put(`/pertemuan/learning-tasks/${rulesTaskId}/rules`, { rules: cleaned });
      await api.put(`/pertemuan/learning-tasks/${rulesTaskId}/ct-journey`, {
        decomposition_options: ctDecomp.map(s => (s || '').trim()).filter(Boolean),
        algorithm_steps: ctSteps.map(s => (s || '').trim()).filter(Boolean),
      });
      setShowRulesModal(false);
    } catch (err) {
      console.error('Gagal menyimpan aturan:', err);
      alert('Gagal menyimpan aturan validasi.');
    } finally {
      setRulesSaving(false);
    }
  };

  const loadData = () => {
    setIsLoading(true);
    // Fetch meetings and completed tasks in parallel
    Promise.all([
      api.get(`/rooms/${roomId}/pertemuan`),
      api.get('/submissions/learning/me').catch(() => ({ data: [] })),
      api.get('/submissions/project/me').catch(() => ({ data: [] })),
      api.get(`/rooms/${roomId}`).then(res => res.data)
    ])
      .then(([pertRes, subsRes, projRes, roomInfo]) => {
        setPertemuanList(pertRes.data || []);
        if (roomInfo) {
          setActiveRoom(roomInfo);
          setAnnouncementText(roomInfo.announcement || '');
        }

        // Completion is tracked by pertemuan_id (robust, unlike title matching)
        const completed = new Set([
          ...(subsRes.data?.map(s => s.pertemuan_id).filter(Boolean) || []),
          ...(projRes.data?.map(p => p.pertemuan_id).filter(Boolean) || [])
        ]);
        setCompletedTaskIds(completed);

        // Remidi: misi belajar tercatat tapi nilainya di bawah KKM → wajib diulang
        const remedial = new Set(
          (subsRes.data || [])
            .filter(s => s.tuntas === false && s.pertemuan_id)
            .map(s => s.pertemuan_id)
        );
        setRemedialIds(remedial);
      })
      .catch(err => console.error("Error loading room details:", err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [roomId, setActiveRoom]);

  // Modal Open Handlers
  const handleOpenAddModal = () => {
    setEditingPert(null);
    setJudul('');
    setUrutan(pertemuanList.length + 1);
    setIsPublished(true);
    setBigIdea('Coding & Desain Web');
    setEssentialQuestion('');
    setChallenge('');
    setGuidingQuestions([]);
    setReflectionQuestions([]);
    setMateriList([]);
    setShowAddModal(true);
  };

  const handleOpenEditModal = (pert) => {
    setEditingPert(pert);
    setJudul(pert.judul);
    setUrutan(pert.urutan);
    setIsPublished(pert.is_published);
    
    const cbl = pert.cbl_engage_json || {};
    setBigIdea(cbl.big_idea || 'Coding & Desain Web');
    setEssentialQuestion(cbl.essential_question || '');
    setChallenge(cbl.challenge || '');
    
    setGuidingQuestions(pert.guiding_questions_json || []);
    setReflectionQuestions(pert.reflection_questions_json || []);
    setMateriList(pert.materi_list_json || []);
    setShowEditModal(true);
  };

  // List Management Functions
  const addGuiding = () => {
    if (newGuiding.trim()) {
      setGuidingQuestions([...guidingQuestions, newGuiding.trim()]);
      setNewGuiding('');
    }
  };

  const removeGuiding = (idx) => {
    setGuidingQuestions(guidingQuestions.filter((_, i) => i !== idx));
  };

  const addReflection = () => {
    if (newReflection.trim()) {
      setReflectionQuestions([...reflectionQuestions, newReflection.trim()]);
      setNewReflection('');
    }
  };

  const removeReflection = (idx) => {
    setReflectionQuestions(reflectionQuestions.filter((_, i) => i !== idx));
  };

  const addMateri = () => {
    if (materiTitle.trim() && materiUrl.trim()) {
      setMateriList([...materiList, {
        title: materiTitle.trim(),
        url: materiUrl.trim(),
        type: 'link'
      }]);
      setMateriTitle('');
      setMateriUrl('');
    }
  };

  const removeMateri = (idx) => {
    setMateriList(materiList.filter((_, i) => i !== idx));
  };

  // Submit handlers
  const handleSaveAnnouncement = async (e) => {
    e.preventDefault();
    setIsActionLoading(true);
    try {
      const res = await api.put(`/rooms/${roomId}`, {
        announcement: announcementText.trim() || null
      });
      setActiveRoom(res.data);
      setShowAnnouncementModal(false);
    } catch (err) {
      console.error("Gagal menyimpan pengumuman:", err);
      alert("Terjadi kesalahan saat memperbarui pengumuman.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCreatePertemuan = async (e) => {
    e.preventDefault();
    if (!judul.trim()) return;
    setIsActionLoading(true);

    const payload = {
      urutan: parseInt(urutan),
      judul: judul.trim(),
      cbl_engage_json: {
        big_idea: bigIdea,
        essential_question: essentialQuestion.trim(),
        challenge: challenge.trim()
      },
      guiding_questions_json: guidingQuestions,
      reflection_questions_json: reflectionQuestions,
      materi_list_json: materiList
    };

    try {
      await api.post(`/rooms/${roomId}/pertemuan`, payload);
      setShowAddModal(false);
      loadData();
    } catch (err) {
      console.error("Gagal membuat pertemuan:", err);
      alert("Terjadi kesalahan saat menambahkan pertemuan.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleEditPertemuan = async (e) => {
    e.preventDefault();
    if (!judul.trim() || !editingPert) return;
    setIsActionLoading(true);

    const payload = {
      judul: judul.trim(),
      urutan: parseInt(urutan),
      is_published: isPublished,
      cbl_engage_json: {
        big_idea: bigIdea,
        essential_question: essentialQuestion.trim(),
        challenge: challenge.trim()
      },
      guiding_questions_json: guidingQuestions,
      reflection_questions_json: reflectionQuestions,
      materi_list_json: materiList
    };

    try {
      await api.put(`/pertemuan/${editingPert.id}`, payload);
      setShowEditModal(false);
      loadData();
    } catch (err) {
      console.error("Gagal mengupdate pertemuan:", err);
      alert("Terjadi kesalahan saat menyimpan perubahan.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeletePertemuan = async (id) => {
    if (!confirm("Apakah Anda yakin ingin menghapus pertemuan ini? Semua tugas dan submission siswa terkait akan ikut terhapus secara permanen.")) return;
    try {
      await api.delete(`/pertemuan/${id}`);
      loadData();
    } catch (err) {
      console.error("Gagal menghapus pertemuan:", err);
      alert("Gagal menghapus pertemuan. Silakan coba lagi.");
    }
  };

  const handleTogglePublish = async (pert) => {
    try {
      await api.put(`/pertemuan/${pert.id}`, {
        is_published: !pert.is_published
      });
      loadData();
    } catch (err) {
      console.error("Gagal mengubah status publish:", err);
    }
  };

  const roomName = activeRoom?.name || 'Ruang Kelas';
  const roomCode = activeRoom?.code || 'WC-000000';

  return (
    <div className="w-full px-4 md:px-6 py-8 text-left max-w-[1400px] mx-auto flex flex-col gap-6 relative z-10 neo-page-enter">
      {/* Room Header Banner (Solid Blue Background) */}
      <section className="bg-[#3B82F6] text-white border-4 border-[#0F172A] p-6 rounded-[24px] shadow-[6px_6px_0px_#0F172A] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="font-nunito text-[9px] font-black text-blue-100 uppercase tracking-widest block mb-1">Ruang Kelas</span>
          <h2 className="font-fredoka text-2xl md:text-3xl font-bold text-white">
            {roomName}
          </h2>
          <p className="font-nunito text-xs text-blue-100 font-bold mt-1">
            {isTeacher 
              ? 'Aturlah alur pembelajaran modul coding web, kelola berkas bahan ajar, serta terbitkan pengumuman.'
              : 'Selesaikan modul pembelajaran coding web dan pemrograman secara berurutan.'}
          </p>
        </div>
        
        <div className="flex gap-3 items-center shrink-0">
          {isTeacher && (
            <button
              onClick={() => setShowAnnouncementModal(true)}
              className="px-4 py-2.5 bg-[#FACC15] text-[#0F172A] border-2 border-[#0F172A] shadow-[2.5px_2.5px_0px_#0F172A] font-fredoka text-xs font-bold rounded-xl hover:-translate-y-0.5 active:translate-y-[0.5px] cursor-pointer transition-all flex items-center gap-1.5"
            >
              <i className="ti ti-speakerphone" />
              Kelola Pengumuman
            </button>
          )}
          
          <div className="bg-white border-2 border-[#0F172A] px-4 py-2 rounded-xl text-center shadow-[3px_3px_0px_#0F172A] shrink-0">
            <span className="font-nunito text-[9px] font-black text-slate-400 uppercase tracking-widest block">Kode Kelas</span>
            <span className="font-fredoka text-base font-bold text-blue-600 tracking-wider uppercase">{roomCode}</span>
          </div>
        </div>
      </section>

      {/* Classroom Announcement Board (Solid Yellow/Amber Background) */}
      {activeRoom?.announcement && (
        <section className="bg-[#FACC15] border-4 border-[#0F172A] p-5 rounded-[24px] shadow-[6px_6px_0px_#0F172A] text-left flex flex-col gap-2 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-white/20 rounded-full blur-xl -mr-6 -mt-6 pointer-events-none" />
          <h3 className="font-fredoka text-sm font-bold text-[#0F172A] flex items-center gap-1.5 z-10">
            <i className="ti ti-bell-ringing text-lg animate-wiggle" />
            Pengumuman Kelas Baru
          </h3>
          <p className="font-nunito text-xs text-[#0F172A] font-extrabold leading-relaxed z-10 whitespace-pre-line">
            {activeRoom.announcement}
          </p>
        </section>
      )}

      {/* Classroom Progress Timeline */}
      <section className="neo-card p-6 md:p-8 border-4 border-[#0F172A] shadow-[6px_6px_0px_#0F172A] rounded-[24px] bg-white flex flex-col gap-4 text-left">
        <div className="border-b-2 border-dashed border-slate-350 pb-2 flex justify-between items-center gap-4">
          <h3 className="font-fredoka text-lg font-bold text-[#0F172A] flex items-center gap-1.5">
            <i className="ti ti-clipboard-list text-blue-600 animate-pulse" />
            Alur Pembelajaran Kelas
          </h3>
          
          {isTeacher && (
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-blue-600 text-white border-2 border-[#0F172A] shadow-[2.5px_2.5px_0px_#0F172A] font-fredoka text-xs font-bold rounded-xl hover:-translate-y-0.5 active:translate-y-[0.5px] cursor-pointer transition-all flex items-center gap-1 shrink-0"
            >
              <i className="ti ti-plus" />
              Tambah Pertemuan
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="neo-card p-12 text-center border-2 border-slate-200 bg-slate-50">
            <i className="ti ti-loader animate-spin text-3xl text-blue-600 mb-2" />
            <p className="font-nunito text-xs text-slate-500 font-bold">Memuat rencana materi kelas...</p>
          </div>
        ) : pertemuanList.length === 0 ? (
          <div className="neo-card p-12 text-center border-4 border-[#0F172A] shadow-[6px_6px_0px_#0F172A] bg-slate-50">
            <i className="ti ti-calendar-event text-4xl text-slate-400 mb-2" />
            <h4 className="font-fredoka text-base font-bold text-slate-800">Materi Belum Tersedia</h4>
            <p className="font-nunito text-xs text-slate-500 font-bold">
              {isTeacher 
                ? 'Belum ada pertemuan terdaftar. Klik "Tambah Pertemuan" di atas untuk mulai membuat kurikulum kelas!'
                : 'Guru belum menerbitkan materi atau tugas untuk kelas ini. Silakan hubungi Guru Anda!'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5 relative pl-5 border-l-4 border-[#0F172A] ml-[14px] py-2">
            {pertemuanList.map((pert, index) => {
              const isCompleted = completedTaskIds.has(pert.id);
              const isRemedial = remedialIds.has(pert.id);
              const isFirst = index === 0;
              const prevPert = index > 0 ? pertemuanList[index - 1] : null;
              const isPrevCompleted = prevPert ? completedTaskIds.has(prevPert.id) : false;
              
              // Teachers see everything unlocked, students follow chronological unlock
              const isUnlocked = isTeacher || isFirst || isPrevCompleted || isCompleted;

              // Colors & styles based on status
              let cardBg = "bg-white";
              let cardText = "text-[#0F172A]";
              let subText = "text-slate-500";
              let descText = "text-slate-655";
              let borderClass = "border-[#0F172A] border-l-8";
              let statusBadgeClass = "";
              let bulletBgClass = "";

              if (isCompleted && isRemedial) {
                borderClass += " border-l-amber-500";
                statusBadgeClass = "bg-amber-50 text-amber-700 border-amber-300";
                bulletBgClass = "bg-amber-500 text-white";
                subText = "text-amber-700";
                descText = "text-slate-600";
              } else if (isCompleted) {
                borderClass += " border-l-emerald-500";
                statusBadgeClass = "bg-emerald-50 text-emerald-700 border-emerald-250";
                bulletBgClass = "bg-emerald-500 text-white";
                subText = "text-emerald-700";
                descText = "text-slate-600";
              } else if (!pert.is_published) {
                borderClass += " border-l-purple-500";
                statusBadgeClass = "bg-purple-50 text-purple-700 border-purple-250";
                bulletBgClass = "bg-purple-500 text-white";
                subText = "text-purple-700";
                descText = "text-slate-500";
              } else if (isUnlocked) {
                borderClass += " border-l-blue-500";
                statusBadgeClass = "bg-blue-50 text-blue-700 border-blue-250";
                bulletBgClass = "bg-blue-500 text-white";
                subText = "text-blue-700";
                descText = "text-slate-650";
              } else {
                cardBg = "bg-slate-50/80";
                borderClass = "border-slate-300 border-l-8 border-l-slate-400";
                statusBadgeClass = "bg-slate-200 text-slate-500 border-slate-300";
                bulletBgClass = "bg-slate-300 text-slate-500";
                cardText = "text-slate-400";
                subText = "text-slate-400";
                descText = "text-slate-400";
              }

              return (
                <div key={pert.id} className="relative">
                  {/* Bullet timeline circle */}
                  <span className={`absolute -left-[30px] top-4.5 w-6 h-6 rounded-full border-2 border-[#0F172A] flex items-center justify-center text-[10px] font-black z-10 shadow-sm ${bulletBgClass}`}>
                    {isCompleted && isRemedial ? (
                      <i className="ti ti-refresh text-[10px] font-bold" />
                    ) : isCompleted ? (
                      <i className="ti ti-check text-[10px] font-bold" />
                    ) : (
                      pert.urutan
                    )}
                  </span>

                  <div 
                    className={`neo-card p-4.5 ${cardBg} ${borderClass} shadow-[4px_4px_0px_#0F172A] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all ${
                      isUnlocked 
                        ? 'hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#0F172A] cursor-pointer' 
                        : 'opacity-65 cursor-not-allowed shadow-[2px_2px_0px_#0F172A]'
                    }`}
                    onClick={() => {
                      if (isTeacher) {
                        navigate(`/ruang-belajar/${roomId}/tugas/${pert.id}`);
                      } else if (isCompleted && !isRemedial) {
                        navigate(`/ruang-belajar/${roomId}/rekap/${pert.id}`);
                      } else if (isUnlocked) {
                        // Termasuk remidi: kembali ke alur pengerjaan, bukan rekap
                        navigate(`/ruang-belajar/${roomId}/tugas/${pert.id}`);
                      }
                    }}
                  >
                    <div className="text-left flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-fredoka font-bold border ${statusBadgeClass}`}>
                          {isCompleted && isRemedial
                            ? `Belum Tuntas (KKM ${KKM}) · Remidi`
                            : isCompleted
                            ? 'Selesai'
                            : !pert.is_published
                            ? 'Draft (Disembunyikan)'
                            : isUnlocked
                            ? 'Siap Dikerjakan'
                            : 'Terkunci'}
                        </span>
                        
                        <span className={`text-[10px] font-nunito font-extrabold uppercase tracking-wide ${subText}`}>
                          {pert.cbl_engage_json?.big_idea || 'Coding'}
                        </span>

                        {pert.materi_list_json && pert.materi_list_json.length > 0 && (
                          <span className={`border px-2 py-0.5 rounded-lg text-[9px] font-bold flex items-center gap-1 ${
                            isCompleted
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-250'
                              : isUnlocked
                              ? 'bg-blue-50 text-blue-800 border-blue-250'
                              : 'bg-slate-150 text-slate-500 border-slate-200'
                          }`}>
                            <i className="ti ti-file-text" />
                            {pert.materi_list_json.length} Materi
                          </span>
                        )}
                      </div>
                      
                      <h4 className={`font-fredoka text-sm md:text-base font-bold ${cardText}`}>
                        {pert.judul}
                      </h4>
                      <p className={`font-nunito text-[11px] font-bold mt-1 line-clamp-1 ${descText}`}>
                        {pert.cbl_engage_json?.essential_question || 'Menggunakan konsep Computational Thinking.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      {isTeacher ? (
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleTogglePublish(pert)}
                            className={`px-3 py-1.5 border-2 border-[#0F172A] font-fredoka text-[10px] font-bold rounded-lg hover:-translate-y-0.5 shadow-[1.5px_1.5px_0px_#0F172A] active:translate-y-0 transition-all flex items-center gap-1 cursor-pointer ${
                              pert.is_published ? 'bg-indigo-50 text-indigo-750' : 'bg-slate-50 text-slate-500'
                            }`}
                          >
                            <i className={pert.is_published ? "ti ti-eye" : "ti ti-eye-off"} />
                            {pert.is_published ? 'Sembunyikan' : 'Terbitkan'}
                          </button>
                          
                          <button
                            onClick={() => handleOpenEditModal(pert)}
                            className="px-3 py-1.5 bg-yellow-400 text-[#0F172A] border-2 border-[#0F172A] font-fredoka text-[10px] font-bold rounded-lg hover:-translate-y-0.5 shadow-[1.5px_1.5px_0px_#0F172A] active:translate-y-0 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <i className="ti ti-edit" />
                            Kelola
                          </button>

                          <button
                            onClick={() => handleOpenRulesModal(pert)}
                            className="px-3 py-1.5 bg-sky-50 text-sky-700 border-2 border-[#0F172A] font-fredoka text-[10px] font-bold rounded-lg hover:-translate-y-0.5 shadow-[1.5px_1.5px_0px_#0F172A] active:translate-y-0 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <i className="ti ti-list-check" />
                            Aturan
                          </button>

                          <button
                            onClick={() => handleDeletePertemuan(pert.id)}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border-2 border-red-200 font-fredoka text-[10px] font-bold rounded-lg hover:-translate-y-0.5 shadow-[1.5px_1.5px_0px_rgba(239,68,68,0.15)] active:translate-y-0 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <i className="ti ti-trash" />
                            Hapus
                          </button>
                        </div>
                      ) : isCompleted && isRemedial ? (
                        <span className="px-3 py-1.5 bg-amber-400 text-[#0F172A] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] font-fredoka text-[10px] font-bold rounded-lg flex items-center gap-1 shrink-0 hover:bg-amber-300">
                          <i className="ti ti-refresh" />
                          Kerjakan Remidi
                        </span>
                      ) : isCompleted ? (
                        <span className="px-3 py-1.5 bg-white text-[#10B981] border-2 border-[#10B981] shadow-[2px_2px_0px_#0F172A] font-fredoka text-[10px] font-bold rounded-lg flex items-center gap-1 shrink-0 hover:bg-emerald-50">
                          <i className="ti ti-player-play text-[#10B981]" />
                          Lihat Rekap
                        </span>
                      ) : isUnlocked ? (
                        <span className="px-3 py-1.5 bg-[#0F172A] text-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] font-fredoka text-[10px] font-bold rounded-lg flex items-center gap-1 shrink-0">
                          <i className="ti ti-edit text-[#FACC15]" />
                          Mulai Kerja
                        </span>
                      ) : (
                        <i className="ti ti-lock text-sm text-slate-400" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Classroom Announcement Modal */}
      {showAnnouncementModal && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex justify-center items-start overflow-y-auto p-4 pt-10 md:pt-16 pb-12">
          <div className="w-full max-w-md bg-white border-4 border-[#0F172A] rounded-[24px] shadow-[8px_8px_0px_#0F172A] flex flex-col my-auto relative">
            <div className="bg-[#FACC15] text-[#0F172A] px-6 py-4 flex justify-between items-center border-b-4 border-[#0F172A] rounded-t-[20px]">
              <h3 className="font-fredoka text-base font-bold flex items-center gap-1.5">
                <i className="ti ti-speakerphone text-lg" />
                Kelola Pengumuman Kelas
              </h3>
              <button 
                onClick={() => setShowAnnouncementModal(false)}
                className="text-[#0F172A] hover:opacity-75 cursor-pointer"
              >
                <i className="ti ti-x text-lg font-bold" />
              </button>
            </div>
            
            <form onSubmit={handleSaveAnnouncement} className="p-6 flex flex-col gap-5 text-left">
              <div>
                <label className="font-fredoka font-bold text-slate-700 text-xs mb-2 block">Teks Pengumuman Kelas:</label>
                <textarea
                  rows={4}
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  placeholder="Tulis pengumuman baru yang akan langsung muncul di halaman timeline kelas siswa... (Kosongkan untuk menghapus pengumuman)"
                  className="w-full border-2 border-[#0F172A] rounded-xl px-3 py-2 text-xs font-nunito font-semibold focus:outline-none focus:bg-amber-50 shadow-[1.5px_1.5px_0px_#0F172A] disabled:opacity-50"
                  disabled={isActionLoading}
                />
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAnnouncementModal(false)}
                  className="px-5 py-2.5 border-4 border-[#0F172A] bg-[#F1F5F9] hover:bg-[#E2E8F0] text-slate-700 font-fredoka font-bold rounded-xl text-xs shadow-[3px_3px_0px_#0F172A] hover:-translate-y-0.5 active:translate-y-[0.5px] active:shadow-[1px_1px_0px_#0F172A] transition-all cursor-pointer"
                  disabled={isActionLoading}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white border-4 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] font-fredoka font-bold rounded-xl text-xs hover:-translate-y-0.5 active:translate-y-[0.5px] active:shadow-[1px_1px_0px_#0F172A] transition-all cursor-pointer"
                >
                  {isActionLoading ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Add / Edit Meeting Modals */}
      {(showAddModal || showEditModal) && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex justify-center items-start overflow-y-auto p-4 md:p-6 pt-10 md:pt-16 pb-12">
          <div className="w-full max-w-2xl bg-white border-4 border-[#0F172A] rounded-[28px] shadow-[8px_8px_0px_#0F172A] flex flex-col my-auto relative overflow-hidden max-h-[85vh]">
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white px-6 py-4.5 flex justify-between items-center border-b-4 border-[#0F172A] shrink-0 rounded-t-[24px]">
              <h3 className="font-fredoka text-base font-bold flex items-center gap-1.5">
                <i className="ti ti-edit-circle text-lg" />
                {showAddModal ? 'Tambah Pertemuan Pembelajaran' : 'Edit Parameter Pertemuan'}
              </h3>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                }}
                className="text-white hover:opacity-75 cursor-pointer"
              >
                <i className="ti ti-x text-lg font-bold" />
              </button>
            </div>
            
            <form onSubmit={showAddModal ? handleCreatePertemuan : handleEditPertemuan} className="p-6 overflow-y-auto flex flex-col gap-5 text-left">
              {showAddModal && (
                <div className="border-2 border-[#0F172A] p-3 rounded-xl bg-indigo-50/50 flex flex-col gap-2">
                  <span className="font-fredoka text-xs font-bold text-indigo-900 flex items-center gap-1">
                    <i className="ti ti-sparkles" /> Pilih Template Pembelajaran Instan:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setJudul('Pertemuan 1: Kartu Profil Pribadi');
                        setBigIdea('Identitas & Web');
                        setEssentialQuestion('Bagaimana merancang kartu profil pribadi yang informatif dan terstruktur?');
                        setChallenge('Buatlah kartu profil pribadi sederhana. Pastikan ada wadah utama <body>, judul utama <h1> yang berisi namamu, dan sebuah paragraf <p> berisi perkenalan singkat diri.');
                        setGuidingQuestions([
                          'Elemen HTML apa yang berfungsi sebagai wadah utama halaman web?',
                          'Bagaimana cara membuat judul teks dengan ukuran terbesar dalam HTML?'
                        ]);
                        setReflectionQuestions([
                          'Apa bagian tersulit saat merangkai susunan elemen HTML?',
                          'Bagaimana Computational Thinking membantumu merancang komponen profil sebelum menulis kode?'
                        ]);
                        setMateriList([
                          { title: 'Pengenalan HTML Dasar PDF', url: 'https://drive.google.com/file/d/html-dasar', type: 'link' }
                        ]);
                      }}
                      className="px-3 py-1.5 bg-blue-50 border-2 border-blue-600 text-blue-700 font-fredoka text-[10px] font-bold rounded-lg cursor-pointer hover:bg-blue-100 transition-all"
                    >
                      Kartu Profil (Lesson)
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setJudul('Pertemuan 2: Galeri Musik Favorit');
                        setBigIdea('Seni & Struktur Web');
                        setEssentialQuestion('Bagaimana cara mengelompokkan elemen web musik agar rapi?');
                        setChallenge('Buatlah halaman web galeri musik favorit. Gunakan tag div sebagai pembungkus utama informasi playlist, dengan judul sedang h2 tentang musik kesukaanmu di dalamnya.');
                        setGuidingQuestions([
                          'Apa fungsi tag <div> dalam pengelompokan elemen HTML?',
                          'Kapan kita harus menggunakan tag judul tingkat kedua <h2> dibanding <h1>?'
                        ]);
                        setReflectionQuestions([
                          'Mengapa pengelompokan elemen di dalam tag div sangat mempermudah penataan layout?',
                          'Bagaimana merancang urutan langkah (algoritma) pengerjaan meminimalkan kesalahan penulisan kode?'
                        ]);
                        setMateriList([
                          { title: 'Panduan Nesting Elemen HTML', url: 'https://drive.google.com/file/d/html-nesting', type: 'link' }
                        ]);
                      }}
                      className="px-3 py-1.5 bg-pink-50 border-2 border-pink-600 text-pink-700 font-fredoka text-[10px] font-bold rounded-lg cursor-pointer hover:bg-pink-100 transition-all"
                    >
                      Galeri Musik (Lesson)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setJudul('Pertemuan 3: Proyek Portofolio Impian');
                        setBigIdea('Portofolio & Kreativitas');
                        setEssentialQuestion('Bagaimana cara menyajikan karya portofoliomu secara online dan menarik?');
                        setChallenge('Buatlah proyek portofolio impian kreatif. Hiasi halaman dengan CSS style yang mendefinisikan warna latar belakang solid kontras dan buat daftar keterampilanmu menggunakan tag <ul> dan <li>.');
                        setGuidingQuestions([
                          'Bagaimana tag <style> dapat memengaruhi warna latar belakang halaman web?',
                          'Bagaimana menyusun daftar tidak berurutan menggunakan tag ul dan li?'
                        ]);
                        setReflectionQuestions([
                          'Bagaimana proses dekomposisi membantumu membagi detail karya portofoliomu?',
                          'Seberapa penting kreativitas pewarnaan CSS dalam memikat pengunjung web?'
                        ]);
                        setMateriList([
                          { title: 'Pengenalan CSS Hiasan Dasar', url: 'https://drive.google.com/file/d/css-hiasan', type: 'link' }
                        ]);
                      }}
                      className="px-3 py-1.5 bg-amber-50 border-2 border-amber-600 text-amber-700 font-fredoka text-[10px] font-bold rounded-lg cursor-pointer hover:bg-amber-100 transition-all"
                    >
                      Proyek Portofolio (Project)
                    </button>
                  </div>
                </div>
              )}

              {/* Judul & Big Idea */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-fredoka font-bold text-slate-700 text-xs mb-1.5 block">Judul Pertemuan:</label>
                  <input
                    type="text"
                    value={judul}
                    onChange={(e) => setJudul(e.target.value)}
                    placeholder="contoh: Pertemuan 1: Pengenalan Tag HTML"
                    className="w-full neo-input text-xs"
                    required
                    disabled={isActionLoading}
                  />
                </div>
                <div>
                  <label className="font-fredoka font-bold text-slate-700 text-xs mb-1.5 block">Big Idea (Topik Utama):</label>
                  <input
                    type="text"
                    value={bigIdea}
                    onChange={(e) => setBigIdea(e.target.value)}
                    placeholder="contoh: Struktur & Semantik Web"
                    className="w-full neo-input text-xs"
                    required
                    disabled={isActionLoading}
                  />
                </div>
              </div>

              {/* Essential Question */}
              <div>
                <label className="font-fredoka font-bold text-slate-700 text-xs mb-1.5 block">Pertanyaan Pemantik (Essential Question):</label>
                <input
                  type="text"
                  value={essentialQuestion}
                  onChange={(e) => setEssentialQuestion(e.target.value)}
                  placeholder="Pertanyaan mendalam untuk memicu rasa ingin tahu siswa..."
                  className="w-full neo-input text-xs"
                  required
                  disabled={isActionLoading}
                />
              </div>

              {/* Deskripsi Tantangan */}
              <div>
                <label className="font-fredoka font-bold text-slate-700 text-xs mb-1.5 block">Misi Tantangan Coding Siswa (Challenge):</label>
                <textarea
                  rows={3}
                  value={challenge}
                  onChange={(e) => setChallenge(e.target.value)}
                  placeholder="Tuliskan misi instruksi tugas coding web yang harus dikerjakan secara visual oleh siswa di workspace..."
                  className="w-full border-2 border-[#0F172A] rounded-xl px-3 py-2 text-xs font-nunito font-semibold focus:outline-none focus:bg-amber-50 shadow-[1.5px_1.5px_0px_#0F172A]"
                  required
                  disabled={isActionLoading}
                />
              </div>

              {/* Pertanyaan Pemandu (Guiding Questions) */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="font-fredoka font-bold text-slate-700 text-xs">Pertanyaan Pemandu AI (Guiding Questions):</label>
                  <button
                    type="button"
                    onClick={addGuidingQuestion}
                    className="px-2 py-1 bg-blue-50 border border-blue-600 text-blue-700 font-fredoka text-[9px] font-bold rounded-lg cursor-pointer"
                  >
                    + Tambah Pertanyaan
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {guidingQuestions.map((q, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <span className="font-fredoka font-bold text-xs text-slate-500 w-5 shrink-0">{idx + 1}.</span>
                      <input
                        type="text"
                        value={q}
                        onChange={(e) => updateGuidingQuestion(idx, e.target.value)}
                        placeholder="Tulis pertanyaan pemandu AI..."
                        className="flex-1 neo-input text-xs"
                        required
                      />
                      {guidingQuestions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeGuidingQuestion(idx)}
                          className="text-red-500 hover:text-red-700 font-bold ml-2 cursor-pointer"
                        >
                          <i className="ti ti-trash text-sm" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Pertanyaan Refleksi (Reflection Questions) */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="font-fredoka font-bold text-slate-700 text-xs">Pertanyaan Refleksi Mandiri (Reflection):</label>
                  <button
                    type="button"
                    onClick={addReflectionQuestion}
                    className="px-2 py-1 bg-[#EC4899]/10 border border-[#EC4899] text-[#EC4899] font-fredoka text-[9px] font-bold rounded-lg cursor-pointer"
                  >
                    + Tambah Refleksi
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {reflectionQuestions.map((q, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <span className="font-fredoka font-bold text-xs text-slate-500 w-5 shrink-0">{idx + 1}.</span>
                      <input
                        type="text"
                        value={q}
                        onChange={(e) => updateReflectionQuestion(idx, e.target.value)}
                        placeholder="Tulis pertanyaan refleksi..."
                        className="flex-1 neo-input text-xs"
                        required
                      />
                      {reflectionQuestions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeReflectionQuestion(idx)}
                          className="text-red-500 hover:text-red-700 font-bold ml-2 cursor-pointer"
                        >
                          <i className="ti ti-trash text-sm" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Materi Pendukung (Materi List) */}
              <div className="border-t border-dashed border-slate-200 pt-4 flex flex-col gap-3">
                <label className="font-fredoka font-bold text-slate-700 text-xs block">Materi Pendukung (Link/Berkas):</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={materiTitle}
                    onChange={(e) => setMateriTitle(e.target.value)}
                    placeholder="Judul Materi"
                    className="flex-1 neo-input text-xs"
                    disabled={isActionLoading}
                  />
                  <input
                    type="url"
                    value={materiUrl}
                    onChange={(e) => setMateriUrl(e.target.value)}
                    placeholder="URL Link"
                    className="flex-1 neo-input text-xs"
                    disabled={isActionLoading}
                  />
                  <button
                    type="button"
                    onClick={addMateri}
                    className="px-3 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-lg cursor-pointer"
                  >
                    Tambah
                  </button>
                </div>
                {materiList.map((m, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-slate-100 p-2 rounded-lg text-[10px]">
                    <span className="font-bold">{m.title}</span>
                    <button type="button" onClick={() => removeMateri(idx)} className="text-red-500">Hapus</button>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center border-t border-dashed border-slate-200 pt-4 mt-2 shrink-0">
                {showEditModal && (
                  <label className="flex items-center gap-2 cursor-pointer font-fredoka font-bold text-slate-700 text-xs">
                    <input
                      type="checkbox"
                      checked={isPublished}
                      onChange={(e) => setIsPublished(e.target.checked)}
                      className="w-4 h-4 accent-indigo-600"
                    />
                    Terbitkan materi ini ke siswa
                  </label>
                )}
                
                <div className="flex gap-3 ml-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setShowEditModal(false);
                    }}
                    className="px-5 py-2.5 border-4 border-[#0F172A] bg-[#F1F5F9] hover:bg-[#E2E8F0] text-slate-700 font-fredoka font-bold rounded-xl text-xs shadow-[3px_3px_0px_#0F172A] hover:-translate-y-0.5 active:translate-y-[0.5px] active:shadow-[1px_1px_0px_#0F172A] transition-all cursor-pointer"
                    disabled={isActionLoading}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isActionLoading}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white border-4 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] font-fredoka font-bold rounded-xl text-xs hover:-translate-y-0.5 active:translate-y-[0.5px] active:shadow-[1px_1px_0px_#0F172A] transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {isActionLoading ? (
                      <>
                        <i className="ti ti-loader animate-spin text-sm" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <i className="ti ti-circle-check" />
                        <span>Simpan Pertemuan</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Validator Rules Editor Modal (Teacher) */}
      {showRulesModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex justify-center items-start overflow-y-auto p-4 md:p-6 pt-10 md:pt-16 pb-12" onClick={() => !rulesSaving && setShowRulesModal(false)}>
          <div className="bg-white border-4 border-[#0F172A] rounded-[28px] shadow-[8px_8px_0px_#0F172A] w-full max-w-2xl max-h-[85vh] flex flex-col my-auto relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4.5 border-b-4 border-[#0F172A] bg-sky-50 rounded-t-[24px]">
              <div className="text-left">
                <h3 className="font-fredoka text-base font-bold text-[#0F172A] flex items-center gap-2"><i className="ti ti-settings text-sky-600 text-lg animate-spin-slow" /> Pengaturan Misi</h3>
                <p className="text-[11px] text-slate-500 font-bold mt-0.5">{rulesPertJudul}</p>
              </div>
              <button onClick={() => setShowRulesModal(false)} className="p-1.5 hover:bg-slate-200 rounded-lg cursor-pointer"><i className="ti ti-x text-lg font-bold" /></button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-5 pt-3">
              {[['rules', 'Aturan Validasi', 'ti-list-check'], ['ct', 'Konten CT Journey', 'ti-brain']].map(([key, label, icon]) => (
                <button
                  key={key}
                  onClick={() => setRulesTab(key)}
                  className={`px-3 py-2 font-fredoka text-[11px] font-bold flex items-center gap-1.5 border-b-2 cursor-pointer transition-colors ${rulesTab === key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  <i className={`ti ${icon}`} /> {label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3 border-t-2 border-slate-100">
              {rulesLoading ? (
                <div className="text-center py-8 text-slate-500 font-bold text-sm">Memuat...</div>
              ) : rulesTab === 'ct' ? (
                <>
                  <div>
                    <p className="font-fredoka text-xs font-bold text-slate-700 mb-0.5 flex items-center gap-1.5"><i className="ti ti-layout-grid-add text-amber-600" /> Pilihan Dekomposisi</p>
                    <p className="font-nunito text-[10px] text-slate-400 font-bold mb-2">Bagian web yang dianalisis siswa. Kosongkan = pakai bawaan otomatis.</p>
                    <div className="space-y-1.5">
                      {ctDecomp.map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input value={item} onChange={(e) => updateCtDecomp(i, e.target.value)} placeholder="mis. Wadah body" className="flex-1 border-2 border-slate-300 rounded-lg px-2 py-1.5 text-xs" />
                          <button onClick={() => removeCtDecomp(i)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer shrink-0"><i className="ti ti-trash text-sm" /></button>
                        </div>
                      ))}
                      <button onClick={addCtDecomp} className="w-full border-2 border-dashed border-slate-300 rounded-xl py-1.5 text-[11px] font-bold text-slate-500 hover:bg-slate-50 cursor-pointer flex items-center justify-center gap-1"><i className="ti ti-plus" /> Tambah Bagian</button>
                    </div>
                  </div>
                  <div className="pt-2">
                    <p className="font-fredoka text-xs font-bold text-slate-700 mb-0.5 flex items-center gap-1.5"><i className="ti ti-list-numbers text-orange-600" /> Langkah Algoritma (urutan benar)</p>
                    <p className="font-nunito text-[10px] text-slate-400 font-bold mb-2">Siswa akan mengacak lalu menyusun ulang. Kosongkan = pakai bawaan.</p>
                    <div className="space-y-1.5">
                      {ctSteps.map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="font-fredoka text-[10px] font-bold text-slate-500 w-5 text-center shrink-0">{i + 1}</span>
                          <input value={item} onChange={(e) => updateCtStep(i, e.target.value)} placeholder="mis. Membuat wadah body" className="flex-1 border-2 border-slate-300 rounded-lg px-2 py-1.5 text-xs" />
                          <div className="flex gap-0.5 shrink-0">
                            <button onClick={() => moveCtStep(i, -1)} disabled={i === 0} className="p-1 text-slate-500 hover:bg-slate-100 rounded disabled:opacity-30 cursor-pointer"><i className="ti ti-arrow-up text-sm" /></button>
                            <button onClick={() => moveCtStep(i, 1)} disabled={i === ctSteps.length - 1} className="p-1 text-slate-500 hover:bg-slate-100 rounded disabled:opacity-30 cursor-pointer"><i className="ti ti-arrow-down text-sm" /></button>
                          </div>
                          <button onClick={() => removeCtStep(i)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer shrink-0"><i className="ti ti-trash text-sm" /></button>
                        </div>
                      ))}
                      <button onClick={addCtStep} className="w-full border-2 border-dashed border-slate-300 rounded-xl py-1.5 text-[11px] font-bold text-slate-500 hover:bg-slate-50 cursor-pointer flex items-center justify-center gap-1"><i className="ti ti-plus" /> Tambah Langkah</button>
                    </div>
                  </div>
                </>
              ) : rulesList.length === 0 ? (
                <div className="text-center py-8 text-slate-400 font-bold text-sm">Belum ada aturan. Tambahkan aturan pertama.</div>
              ) : (
                rulesList.map((rule, i) => (
                  <div key={i} className="border-2 border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <select value={rule.type} onChange={(e) => updateRule(i, 'type', e.target.value)} className="border-2 border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold bg-white cursor-pointer">
                        <option value="exists">Elemen harus ada</option>
                        <option value="child_of">Elemen di dalam elemen lain</option>
                      </select>
                      {rule.type === 'child_of' ? (
                        <>
                          <input value={rule.child || ''} onChange={(e) => updateRule(i, 'child', e.target.value)} placeholder="anak (mis. h1)" className="w-24 border-2 border-slate-300 rounded-lg px-2 py-1.5 text-xs" />
                          <span className="text-xs text-slate-500 font-bold">di dalam</span>
                          <input value={rule.parent || ''} onChange={(e) => updateRule(i, 'parent', e.target.value)} placeholder="induk (mis. body)" className="w-24 border-2 border-slate-300 rounded-lg px-2 py-1.5 text-xs" />
                        </>
                      ) : (
                        <input value={rule.selector || ''} onChange={(e) => updateRule(i, 'selector', e.target.value)} placeholder="elemen (mis. h1)" className="w-32 border-2 border-slate-300 rounded-lg px-2 py-1.5 text-xs" />
                      )}
                      <button onClick={() => removeRule(i)} className="ml-auto p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"><i className="ti ti-trash text-sm" /></button>
                    </div>
                    <input value={rule.error_message || ''} onChange={(e) => updateRule(i, 'error_message', e.target.value)} placeholder="Pesan kesalahan untuk siswa" className="w-full border-2 border-slate-300 rounded-lg px-2 py-1.5 text-xs" />
                  </div>
                ))
              )}
              {!rulesLoading && rulesTab === 'rules' && (
                <button onClick={addRule} className="w-full border-2 border-dashed border-slate-300 rounded-xl py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 cursor-pointer flex items-center justify-center gap-1"><i className="ti ti-plus" /> Tambah Aturan</button>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4.5 border-t-4 border-[#0F172A] bg-white rounded-b-[24px]">
              <button
                onClick={() => setShowRulesModal(false)}
                disabled={rulesSaving}
                className="px-5 py-2.5 border-4 border-[#0F172A] bg-[#F1F5F9] hover:bg-[#E2E8F0] text-slate-700 font-fredoka font-bold rounded-xl text-xs md:text-sm shadow-[3px_3px_0px_#0F172A] hover:-translate-y-0.5 active:translate-y-[0.5px] active:shadow-[1px_1px_0px_#0F172A] transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSaveRules}
                disabled={rulesSaving || rulesLoading}
                className={`px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white border-4 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] font-fredoka font-bold rounded-xl text-xs md:text-sm hover:-translate-y-0.5 active:translate-y-[0.5px] active:shadow-[1px_1px_0px_#0F172A] transition-all cursor-pointer flex items-center gap-1.5 ${
                  (rulesSaving || rulesLoading) ? 'opacity-50 cursor-not-allowed shadow-none transform-none active:translate-y-0' : ''
                }`}
              >
                {rulesSaving ? (
                  <>
                    <i className="ti ti-loader animate-spin text-sm" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <i className="ti ti-circle-check" />
                    <span>Simpan Pengaturan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
