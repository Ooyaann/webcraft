import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { useStore } from '../store/useStore';
import { toHTML, toFormattedCode } from '../services/astUtils';
import { KKM, weightedRubricScore, criterionName } from '../lib/scoring';
import { toast } from '../components/common/toast';
import { CT_PILLARS, isCtPillar, scoreToLevel, levelToScore, pillarLevelDesc } from '../lib/ctRubric';

function KaryaPreviewMini({ ast }) {
  let parsedAst = [];
  try {
    parsedAst = typeof ast === 'string' ? JSON.parse(ast) : ast;
  } catch (e) {
    console.error("Failed to parse AST", e);
  }
  const html = toHTML(parsedAst || []);
  const fullHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            font-family: 'Nunito', sans-serif;
            margin: 0;
            padding: 8px;
            box-sizing: border-box;
            background-color: #f8fafc;
            color: #0f172a;
          }
        </style>
      </head>
      <body style="transform: scale(0.45); transform-origin: top left; width: 220%; pointer-events: none;">
        ${html}
      </body>
    </html>
  `;
  return (
    <div className="w-full h-36 border-2 border-[#0F172A] rounded-xl overflow-hidden bg-slate-50 relative">
      <iframe
        srcDoc={fullHTML}
        sandbox=""
        title="Mini Preview"
        className="w-full h-[300px] border-none"
      />
    </div>
  );
}

export default function GaleriKarya() {
  const { user } = useStore();
  const isTeacher = user?.role === 'guru';
  const isStudent = user?.role === 'siswa';

  // State for gallery items (student/public view)
  const [galleryItems, setGalleryItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState('latest'); // 'latest' | 'popular'

  // State for student's own submissions
  const [myLearning, setMyLearning] = useState([]);
  const [myProjects, setMyProjects] = useState([]);
  const [studentTab, setStudentTab] = useState('karya_saya'); // 'karya_saya' | 'galeri_publik'

  // State for teacher moderation panel
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [activeTab, setActiveTab] = useState('perlu_dinilai'); // 'perlu_dinilai' | 'sudah_dinilai' | 'publik' | 'belajar'
  const [selectedSub, setSelectedSub] = useState(null);
  const [kelasFilter, setKelasFilter] = useState('semua'); // filter kelas utk panel guru

  // Grading Modal Form State
  const [scores, setScores] = useState({
    'Kelengkapan elemen': 80,
    'Kebenaran semantik': 80,
    'Kreativitas desain': 80,
    'Kesesuaian challenge': 80
  });
  const [teacherComment, setTeacherComment] = useState('');
  const [isPublished, setIsPublished] = useState(false);


  // Fetch Public Gallery
  const fetchGalleryItems = () => {
    setLoadingItems(true);
    api.get('/gallery')
      .then(res => {
        setGalleryItems(res.data || []);
      })
      .catch(err => {
        console.error("Error fetching gallery items", err);
      })
      .finally(() => setLoadingItems(false));
  };

  // Fetch Submissions for Teachers
  const fetchTeacherSubmissions = () => {
    setLoadingSubmissions(true);
    api.get('/submissions/project')
      .then(res => {
        setSubmissions(res.data || []);
      })
      .catch(err => {
        console.error("Error fetching project submissions", err);
      })
      .finally(() => setLoadingSubmissions(false));
  };

  // Fetch student's own submissions
  const fetchMySubmissions = () => {
    api.get('/submissions/learning/me')
      .then(res => setMyLearning(res.data || []))
      .catch(() => { });
    api.get('/submissions/project/me')
      .then(res => setMyProjects(res.data || []))
      .catch(() => { });
  };

  useEffect(() => {
    fetchGalleryItems();
    if (isTeacher) {
      fetchTeacherSubmissions();
    }
    if (isStudent) {
      fetchMySubmissions();
    }
  }, [isTeacher, isStudent]);

  // Handle Appreciation/Like Click
  const handleAppreciate = (itemId) => {
    api.post(`/gallery/${itemId}/appreciate`)
      .then(res => {
        setGalleryItems(prev => prev.map(item => {
          if (item.id === itemId) {
            return { ...item, appreciations: res.data.appreciations };
          }
          return item;
        }));
      })
      .catch(err => {
        if (err.response?.status === 400) {
          toast.info("Kamu sudah memberikan apresiasi untuk karya ini!");
        } else {
          console.error("Error appreciating gallery item", err);
        }
      });
  };

  // Open Grading Modal — kriteria diambil dari rubrik task (nama + bobot),
  // bukan daftar hardcode, supaya bobot penilaian transparan & sesuai tugas.
  const openGradingModal = (sub) => {
    setSelectedSub(sub);
    const names = sub.rubrik?.length
      ? sub.rubrik.map(criterionName)
      : ['Kelengkapan elemen', 'Kebenaran semantik', 'Kreativitas desain'];
    const initial = {};
    names.forEach((n) => { initial[n] = sub.rubrik_scores?.[n] ?? 80; });
    setScores(initial);
    setTeacherComment(sub.teacher_comment || '');
    setIsPublished(sub.is_published_to_gallery || false);
  };

  // Close Grading Modal
  const closeGradingModal = () => {
    setSelectedSub(null);
  };



  // Submit Grade — nilai akhir = rata-rata TERBOBOT sesuai rubrik task
  const handleSaveGrade = () => {
    if (!selectedSub) return;

    const avgScore = weightedRubricScore(selectedSub.rubrik || [], scores);

    api.put(`/submissions/project/${selectedSub.id}/grade`, {
      teacher_score: avgScore,
      teacher_comment: teacherComment,
      rubrik_scores: scores,
      is_published_to_gallery: isPublished
    })
      .then(() => {
        fetchTeacherSubmissions();
        fetchGalleryItems();
        closeGradingModal();
      })
      .catch(err => {
        console.error("Error grading project", err);
        toast.error("Gagal menyimpan penilaian. Coba lagi.");
      });
  };

  // Filter public items based on query
  const filteredGalleryItems = galleryItems
    .filter(item => {
      const matchSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.student_name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    })
    .sort((a, b) => {
      if (sortKey === 'popular') {
        return b.appreciations - a.appreciations;
      }
      return new Date(b.published_at) - new Date(a.published_at);
    });

  // Filter teacher view submissions
  const filteredSubmissions = submissions.filter(sub => {
    if (kelasFilter !== 'semua' && sub.room_name !== kelasFilter) return false;
    if (activeTab === 'perlu_dinilai') {
      return sub.teacher_score === null;
    } else if (activeTab === 'sudah_dinilai') {
      return sub.teacher_score !== null && !sub.is_published_to_gallery;
    } else {
      return sub.is_published_to_gallery === true;
    }
  });

  // Karya misi belajar utk panel guru (dari API gallery, type 'learning')
  const learningWorks = galleryItems.filter(item =>
    item.type === 'learning' &&
    (kelasFilter === 'semua' || item.room_name === kelasFilter)
  );

  // Daftar kelas unik utk dropdown filter guru
  const kelasOptions = [...new Set([
    ...submissions.map(s => s.room_name),
    ...galleryItems.map(i => i.room_name),
  ].filter(Boolean))];

  return (
    <div className="w-full px-4 md:px-8 py-8 flex flex-col gap-8 text-left max-w-7xl mx-auto">
      <div>
        <h2 className="font-fredoka text-3xl font-bold text-slate-800 mb-2">Galeri Karya Siswa</h2>
        <p className="font-nunito text-slate-600 font-semibold max-w-2xl">
          Eksplorasi kreasi halaman web yang penuh warna, interaktif, dan informatif hasil karya siswa-siswi kreatif.
        </p>
      </div>

      {isTeacher ? (
        <div className="flex flex-col gap-6">
          {/* Teacher Tab Switch */}
          <div className="flex border-b-4 border-[#0F172A] gap-2 overflow-x-auto overflow-y-visible pt-1 pr-2">
            <button
              onClick={() => setActiveTab('perlu_dinilai')}
              className={`px-5 py-3 shrink-0 whitespace-nowrap font-fredoka font-bold border-2 border-b-0 border-[#0F172A] rounded-t-xl transition-all cursor-pointer ${activeTab === 'perlu_dinilai'
                  ? 'bg-[#3B82F6] text-white translate-y-1 shadow-[2px_0px_0px_#0f172a]'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
                }`}
            >
              <i className="ti ti-clock-hour-4 mr-2" />
              Perlu Dinilai ({submissions.filter(s => s.teacher_score === null).length})
            </button>
            <button
              onClick={() => setActiveTab('sudah_dinilai')}
              className={`px-5 py-3 shrink-0 whitespace-nowrap font-fredoka font-bold border-2 border-b-0 border-[#0F172A] rounded-t-xl transition-all cursor-pointer ${activeTab === 'sudah_dinilai'
                  ? 'bg-[#10B981] text-white translate-y-1 shadow-[2px_0px_0px_#0f172a]'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
                }`}
            >
              <i className="ti ti-checkbox mr-2" />
              Sudah Dinilai ({submissions.filter(s => s.teacher_score !== null && !s.is_published_to_gallery).length})
            </button>
            <button
              onClick={() => setActiveTab('publik')}
              className={`px-5 py-3 shrink-0 whitespace-nowrap font-fredoka font-bold border-2 border-b-0 border-[#0F172A] rounded-t-xl transition-all cursor-pointer ${activeTab === 'publik'
                  ? 'bg-[#EC4899] text-white translate-y-1 shadow-[2px_0px_0px_#0f172a]'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
                }`}
            >
              <i className="ti ti-world mr-2" />
              Publik di Galeri ({submissions.filter(s => s.is_published_to_gallery).length})
            </button>
            <button
              onClick={() => setActiveTab('belajar')}
              className={`px-5 py-3 shrink-0 whitespace-nowrap font-fredoka font-bold border-2 border-b-0 border-[#0F172A] rounded-t-xl transition-all cursor-pointer ${activeTab === 'belajar'
                  ? 'bg-[#6366F1] text-white translate-y-1 shadow-[2px_0px_0px_#0f172a]'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
                }`}
            >
              <i className="ti ti-book mr-2" />
              Misi Belajar ({galleryItems.filter(i => i.type === 'learning').length})
            </button>
          </div>

          {/* Filter Kelas */}
          <div className="flex items-center gap-3 -mt-2">
            <label className="font-fredoka text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <i className="ti ti-school text-base" /> Filter Kelas:
            </label>
            <select
              value={kelasFilter}
              onChange={(e) => setKelasFilter(e.target.value)}
              className="neo-select pl-3 py-1.5 border-2 border-[#0F172A] rounded-xl font-nunito font-bold text-xs bg-white shadow-[2px_2px_0px_#0F172A] focus:outline-none"
            >
              <option value="semua">Semua Kelas</option>
              {kelasOptions.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>

          {/* Panel Misi Belajar (karya pembelajaran siswa + skor otomatis) */}
          {activeTab === 'belajar' ? (
            learningWorks.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center bg-white border-2 border-dashed border-slate-300 rounded-2xl">
                <i className="ti ti-book-off text-5xl text-slate-300" />
                <p className="font-fredoka text-xl font-bold text-slate-600 mt-4">Belum ada karya misi belajar.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {learningWorks.map((item) => (
                  <div key={item.id} className="bg-white border-2 border-[#0F172A] shadow-[4px_4px_0px_#0F172A] p-5 rounded-2xl flex flex-col gap-3 transition-transform hover:-translate-y-1">
                    <div className="flex justify-between items-start gap-2">
                      <span className="bg-[#EEF2FF] text-[#0F172A] border-2 border-[#0F172A] text-xs font-fredoka font-bold px-2 py-0.5 rounded-lg shadow-[2px_2px_0px_#0F172A]">
                        Misi Belajar
                      </span>
                      <span className="text-[11px] font-nunito font-bold text-slate-400">
                        {new Date(item.published_at).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-fredoka text-lg font-bold text-slate-800 leading-tight">{item.title}</h3>
                      <p className="font-nunito text-sm font-semibold text-slate-500">Siswa: {item.student_name}</p>
                      {item.room_name && (
                        <span className="inline-block mt-1 text-[10px] font-nunito font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                          <i className="ti ti-school mr-1" />{item.room_name}
                        </span>
                      )}
                    </div>
                    <KaryaPreviewMini ast={item.ast} />
                    <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                      <div className="flex items-center gap-1">
                        <i className="ti ti-star text-[#FACC15]" />
                        <span className="font-fredoka font-bold text-slate-800 text-sm">Skor: {item.score}/100</span>
                      </div>
                      <span className={`text-[10px] font-fredoka font-bold px-2 py-0.5 rounded-lg border-2 ${
                        item.score >= KKM
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-500'
                          : 'text-amber-700 bg-amber-50 border-amber-500'
                      }`}>
                        {item.score >= KKM ? 'Tuntas' : `Remidi (KKM ${KKM})`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : loadingSubmissions ? (
            <div className="py-12 flex flex-col items-center justify-center bg-white border-2 border-[#0F172A] rounded-2xl shadow-[4px_4px_0px_#0F172A]">
              <i className="ti ti-loader animate-spin text-4xl text-slate-500" />
              <p className="font-nunito font-bold text-slate-600 mt-4">Memuat data submission...</p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center bg-white border-2 border-dashed border-slate-300 rounded-2xl">
              <i className="ti ti-folder-off text-5xl text-slate-300" />
              <p className="font-fredoka text-xl font-bold text-slate-600 mt-4">Tidak ada data submission.</p>
              <p className="font-nunito text-slate-500 font-semibold mt-1">Siswa belum mengumpulkan atau semua sudah dinilai.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="bg-white border-2 border-[#0F172A] shadow-[4px_4px_0px_#0F172A] p-5 rounded-2xl flex flex-col justify-between gap-4 transition-transform hover:-translate-y-1"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-[#E0F2FE] text-[#0F172A] border-2 border-[#0F172A] text-xs font-fredoka font-bold px-2 py-0.5 rounded-lg shadow-[2px_2px_0px_#0F172A]">
                          Proyek
                        </span>
                        {sub.is_remedial ? (
                          <span className="bg-amber-100 text-amber-700 border-2 border-amber-500 text-[10px] font-fredoka font-bold px-2 py-0.5 rounded-lg shadow-[2px_2px_0px_#F59E0B]/20">
                            Setelah Remidi
                          </span>
                        ) : (
                          <span className="bg-indigo-50 text-indigo-700 border-2 border-indigo-300 text-[10px] font-fredoka font-bold px-2 py-0.5 rounded-lg">
                            Sebelum Remidi
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-nunito font-bold text-slate-400">
                        {new Date(sub.submitted_at).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    <h3 className="font-fredoka text-xl font-bold text-slate-800 leading-tight">{sub.task_title}</h3>
                    <p className="font-nunito text-sm font-semibold text-slate-500">Siswa: {sub.student_name}</p>
                    {sub.room_name && (
                      <span className="inline-block w-fit text-[10px] font-nunito font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                        <i className="ti ti-school mr-1" />{sub.room_name}
                      </span>
                    )}
                  </div>

                  <KaryaPreviewMini ast={sub.final_ast} />

                  {sub.teacher_score !== null && sub.rubrik_scores && (
                    <div className="grid grid-cols-2 gap-1.5 bg-slate-50 p-2.5 border-2 border-[#0F172A] rounded-xl text-[10px] my-1">
                      {Object.entries(sub.rubrik_scores).map(([kriteria, skor]) => {
                        const pillar = CT_PILLARS.find(p => p.label === kriteria);
                        const lvlInfo = scoreToLevel(skor);
                        const pillarColor = {
                          blue: 'text-blue-700 bg-blue-50/55 border-blue-200',
                          amber: 'text-amber-700 bg-amber-50/55 border-amber-200',
                          rose: 'text-rose-700 bg-rose-50/55 border-rose-200',
                          emerald: 'text-emerald-700 bg-emerald-50/55 border-emerald-200',
                        }[pillar?.color || 'blue'];
                        return (
                          <div key={kriteria} className={`flex items-center justify-between px-2 py-1 border rounded-lg ${pillarColor}`}>
                            <span className="font-bold truncate flex items-center gap-1">
                              {pillar && <i className={`ti ${pillar.icon}`} />}
                              {kriteria}
                            </span>
                            <span className="font-black">Skor {lvlInfo.level} ({skor})</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                    {sub.teacher_score !== null ? (
                      <div className="flex items-center gap-1">
                        <i className="ti ti-star text-[#FACC15]" />
                        <span className="font-fredoka font-bold text-slate-800 text-sm">Skor: {sub.teacher_score}/100</span>
                      </div>
                    ) : (
                      <span className="text-xs font-nunito font-bold text-[#F59E0B] bg-[#FFFBEB] border-2 border-[#F59E0B] px-2.5 py-0.5 rounded-lg">
                        Belum Dinilai
                      </span>
                    )}

                    <button
                      onClick={() => openGradingModal(sub)}
                      className="px-4 py-1.5 bg-[#FACC15] hover:bg-[#E2B910] border-2 border-[#0F172A] font-fredoka text-xs font-bold rounded-xl shadow-[2px_2px_0px_#0F172A] cursor-pointer transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-[0px_0px_0px_#0F172A]"
                    >
                      <i className="ti ti-edit-circle mr-1" />
                      {sub.teacher_score !== null ? 'Ubah Nilai' : 'Beri Nilai'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Student/Guest Tab Switcher */}
          {isStudent && (
            <div className="flex border-b-4 border-[#0F172A] gap-2 overflow-x-auto overflow-y-visible pt-1 pr-2">
              <button
                onClick={() => setStudentTab('karya_saya')}
                className={`px-5 py-3 shrink-0 whitespace-nowrap font-fredoka font-bold border-2 border-b-0 border-[#0F172A] rounded-t-xl transition-all cursor-pointer ${studentTab === 'karya_saya'
                    ? 'bg-[#3B82F6] text-white translate-y-1 shadow-[2px_0px_0px_#0f172a]'
                    : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
              >
                <i className="ti ti-photo-heart mr-2" />
                Karya Saya ({myLearning.length + myProjects.length})
              </button>
              <button
                onClick={() => setStudentTab('galeri_publik')}
                className={`px-5 py-3 shrink-0 whitespace-nowrap font-fredoka font-bold border-2 border-b-0 border-[#0F172A] rounded-t-xl transition-all cursor-pointer ${studentTab === 'galeri_publik'
                    ? 'bg-[#EC4899] text-white translate-y-1 shadow-[2px_0px_0px_#0f172a]'
                    : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
              >
                <i className="ti ti-users mr-2" />
                Karya Siswa ({filteredGalleryItems.length})
              </button>
            </div>
          )}

          {/* Render 'Karya Saya' for Students */}
          {isStudent && studentTab === 'karya_saya' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-2">
              {/* Column 1: Learning Submissions (Pembelajaran) */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between border-b-2 border-slate-200 pb-2">
                  <h3 className="font-fredoka text-xl font-bold text-slate-800 flex items-center gap-2">
                    <i className="ti ti-school text-[#3B82F6] text-2xl" />
                    Misi Belajar (Penilaian AI & AST)
                  </h3>
                  <span className="bg-blue-100 text-blue-800 border-2 border-blue-200 text-xs font-bold px-2 py-0.5 rounded-lg">
                    {myLearning.length} Selesai
                  </span>
                </div>

                {myLearning.length === 0 ? (
                  <div className="py-12 text-center bg-white border-2 border-dashed border-slate-300 rounded-2xl p-6">
                    <i className="ti ti-school text-4xl text-slate-300 mb-2" />
                    <p className="font-fredoka text-slate-500 font-bold">Belum ada misi belajar selesai.</p>
                    <p className="font-nunito text-slate-400 text-xs font-semibold mt-1">Selesaikan materi coding kamu di kelas!</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {myLearning.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white border-2 border-[#0F172A] shadow-[4px_4px_0px_#0F172A] rounded-2xl p-5 flex flex-col gap-3 transition-transform hover:-translate-y-0.5"
                      >
                        <div className="flex justify-between items-start">
                          <h4 className="font-fredoka text-lg font-bold text-slate-800 leading-tight">{item.levelTitle}</h4>
                          <span className="text-[10px] font-nunito font-bold text-slate-400">
                            {new Date(item.date).toLocaleDateString('id-ID')}
                          </span>
                        </div>

                        {/* Metric details */}
                        <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 border border-slate-200 rounded-xl text-xs font-nunito">
                          <div>
                            <span className="text-slate-400 font-bold block mb-1">Akurasi & Logika</span>
                            <div className="flex items-center gap-2">
                              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                <div
                                  className="bg-emerald-500 h-full rounded-full"
                                  style={{ width: `${item.accuracy}%` }}
                                />
                              </div>
                              <span className="font-extrabold text-slate-700">{item.accuracy}%</span>
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold block mb-1">Percobaan (Attempt)</span>
                            <span className="font-extrabold text-slate-700">{item.attempts} kali cek</span>
                          </div>
                        </div>

                        {/* CT Score and Tags */}
                        <div className="flex justify-between items-center">
                          <div className="flex flex-wrap gap-1.5">
                            {item.feedbackTags?.map(tag => (
                              <span key={tag} className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-fredoka font-bold px-2 py-0.5 rounded-md">
                                {tag}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="neo-badge-ai">
                              <i className="ti ti-sparkles" />
                              Skor AI
                            </span>
                            <span className="font-fredoka font-bold text-[#6366F1]">{item.ctScore}/100</span>
                          </div>
                        </div>

                        {/* AI Feedback Bubble */}
                        <div className="mt-2 bg-[#EEF2FF] border border-[#C7D2FE] p-3 rounded-xl relative text-xs">
                          <div className="flex items-center gap-1.5 text-[#4338CA] font-fredoka font-bold mb-1">
                            <i className="ti ti-sparkles" />
                            Umpan Balik AI:
                          </div>
                          <p className="font-nunito font-semibold text-slate-700 italic">
                            "{item.teacherComment}"
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Column 2: Project Submissions (Proyek) */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between border-b-2 border-slate-200 pb-2">
                  <h3 className="font-fredoka text-xl font-bold text-slate-800 flex items-center gap-2">
                    <i className="ti ti-device-laptop text-[#10B981] text-2xl" />
                    Tantangan Proyek (Penilaian Guru)
                  </h3>
                  <span className="bg-emerald-100 text-emerald-800 border-2 border-emerald-200 text-xs font-bold px-2 py-0.5 rounded-lg">
                    {myProjects.length} Dikirim
                  </span>
                </div>

                {myProjects.length === 0 ? (
                  <div className="py-12 text-center bg-white border-2 border-dashed border-slate-300 rounded-2xl p-6">
                    <i className="ti ti-device-laptop text-4xl text-slate-300 mb-2" />
                    <p className="font-fredoka text-slate-500 font-bold">Belum ada proyek dikumpulkan.</p>
                    <p className="font-nunito text-slate-400 text-xs font-semibold mt-1">Kerjakan tantangan proyek di akhir pertemuan kelasmu!</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {myProjects.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white border-2 border-[#0F172A] shadow-[4px_4px_0px_#0F172A] rounded-2xl p-5 flex flex-col gap-3 transition-transform hover:-translate-y-0.5"
                      >
                        <div className="flex justify-between items-start">
                          <h4 className="font-fredoka text-lg font-bold text-slate-800 leading-tight">{item.task_title}</h4>
                          <span className="text-[10px] font-nunito font-bold text-slate-400">
                            {new Date(item.submitted_at).toLocaleDateString('id-ID')}
                          </span>
                        </div>

                        {/* Project Grading Status */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-b border-slate-100 py-2.5 my-1">
                          {item.teacher_score !== null ? (
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs font-fredoka font-bold px-2.5 py-0.5 rounded-lg border-2 ${
                                item.teacher_score >= KKM
                                  ? 'text-emerald-700 bg-emerald-50 border-emerald-500'
                                  : 'text-amber-700 bg-amber-50 border-amber-500'
                              }`}>
                                {item.teacher_score >= KKM ? 'Tuntas' : `Remidi (KKM ${KKM})`}
                              </span>
                              <span className="font-fredoka font-bold text-slate-800 text-sm">
                                Skor: {item.teacher_score}/100
                              </span>
                            </div>
                          ) : (
                            <span className="bg-[#FFFBEB] text-[#F59E0B] border-2 border-[#F59E0B] text-xs font-fredoka font-bold px-2.5 py-0.5 rounded-lg border-dashed">
                              Menunggu Penilaian Guru
                            </span>
                          )}

                          {item.is_published_to_gallery && (
                            <span className="bg-pink-50 text-pink-700 border border-pink-200 text-[10px] font-fredoka font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                              <i className="ti ti-world" /> Masuk Galeri Publik
                            </span>
                          )}
                        </div>

                        {/* Rincian nilai per kriteria/pilar CT — transparansi */}
                        {item.teacher_score !== null && item.rubrik_scores && Object.keys(item.rubrik_scores).length > 0 && (
                          <div className="bg-white border-2 border-[#0F172A] rounded-xl p-3 shadow-[2px_2px_0px_#0F172A]">
                            <p className="font-fredoka font-bold text-xs text-slate-600 mb-2 flex items-center gap-1">
                              <i className="ti ti-list-check" /> Rincian Nilai per Kriteria
                            </p>
                            <div className="flex flex-col gap-1.5">
                              {Object.entries(item.rubrik_scores).map(([kriteria, skor]) => {
                                const info = scoreToLevel(skor);
                                const pillar = CT_PILLARS.find((p) => p.label === kriteria);
                                const bobot = item.rubrik?.find((c) => criterionName(c) === kriteria)?.bobot;
                                const toneCls = {
                                  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-300',
                                  blue: 'bg-blue-50 text-blue-700 border-blue-300',
                                  amber: 'bg-amber-50 text-amber-700 border-amber-300',
                                  rose: 'bg-rose-50 text-rose-700 border-rose-300',
                                }[info.tone];
                                return (
                                  <div key={kriteria} className="flex items-center justify-between gap-2 text-[11px]">
                                    <span className="font-nunito font-bold text-slate-700 flex items-center gap-1.5 min-w-0">
                                      {pillar && <i className={`ti ${pillar.icon} shrink-0`} />}
                                      <span className="truncate">{kriteria}</span>
                                      {bobot ? <span className="text-[9px] text-slate-400">({bobot}%)</span> : null}
                                    </span>
                                    <span className={`shrink-0 font-fredoka font-bold px-2 py-0.5 rounded-md border ${toneCls}`}>
                                      {skor} · Skor {info.level} {info.label}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* AI Feedback Bubble (dengan fallback jika null seperti Andi) */}
                        <div className="bg-[#EEF2FF] border border-[#C7D2FE] p-3 rounded-xl relative text-xs">
                          <div className="flex items-center gap-1.5 text-[#4338CA] font-fredoka font-bold mb-1">
                            <i className="ti ti-sparkles" />
                            Umpan Balik AI:
                          </div>
                          <p className="font-nunito font-semibold text-slate-700 italic">
                            "{item.ai_suggestion?.analysis || "AI telah menganalisis kode visual Anda dengan sukses. Hasil rakitan blok telah terstruktur secara semantik."}"
                          </p>
                        </div>

                        {/* Teacher's comment */}
                        {item.teacher_comment ? (
                          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs">
                            <div className="font-fredoka font-bold text-slate-600 mb-1 flex items-center gap-1">
                              <i className="ti ti-user-check" /> Catatan Guru:
                            </div>
                            <p className="font-nunito font-semibold text-slate-700">
                              "{item.teacher_comment}"
                            </p>
                          </div>
                        ) : (
                          item.teacher_score !== null && (
                            <p className="text-[11px] font-nunito font-bold text-slate-400 italic">Tidak ada catatan guru.</p>
                          )
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Public Gallery Search & Filter Panel */}
              <div className="bg-white border-2 border-[#0F172A] shadow-[4px_4px_0px_#0F172A] p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="w-full md:w-auto flex-1 relative">
                  <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
                  <input
                    type="text"
                    placeholder="Cari berdasarkan judul atau nama siswa..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border-2 border-[#0F172A] rounded-xl font-nunito font-semibold focus:outline-none focus:bg-[#E0F2FE]"
                  />
                </div>
                <div className="w-full md:w-auto flex gap-3">
                    <select
                      value={sortKey}
                      onChange={(e) => setSortKey(e.target.value)}
                      className="neo-select w-full md:w-auto pl-4 py-2 border-2 border-[#0F172A] rounded-xl font-fredoka font-bold bg-white text-slate-700 shadow-[2.5px_2.5px_0px_#0F172A] hover:-translate-y-0.5 active:translate-y-[0.5px] active:shadow-[1px_1px_0px_#0F172A] transition-all focus:outline-none"
                    >
                      <option value="latest">Terbaru</option>
                      <option value="popular">Terpopuler (Like)</option>
                    </select>
                </div>
              </div>

              {/* Public Gallery Grid */}
              {loadingItems ? (
                <div className="py-12 flex flex-col items-center justify-center bg-white border-2 border-[#0F172A] rounded-2xl shadow-[4px_4px_0px_#0F172A]">
                  <i className="ti ti-loader animate-spin text-4xl text-slate-500" />
                  <p className="font-nunito font-bold text-slate-600 mt-4">Memuat karya siswa...</p>
                </div>
              ) : filteredGalleryItems.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center bg-white border-2 border-[#0F172A] shadow-[4px_4px_0px_#0F172A] rounded-2xl">
                  <i className="ti ti-mood-empty text-5xl text-slate-400" />
                  <p className="font-fredoka text-xl font-bold text-slate-600 mt-4">Belum ada karya siswa di kelas ini.</p>
                  <p className="font-nunito text-slate-500 font-semibold mt-1">Selesaikan misi atau proyek agar hasil karyamu muncul di sini!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredGalleryItems.map((karya) => (
                    <div
                      key={karya.id}
                      className="bg-white border-2 border-[#0F172A] shadow-[4px_4px_0px_#0F172A] p-5 rounded-2xl flex flex-col justify-between gap-4 transition-transform hover:-translate-y-1"
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <span className={`border-2 border-[#0F172A] text-[9px] font-fredoka font-black px-2.5 py-0.5 rounded-lg shadow-[1.5px_1.5px_0px_#0f172a] ${
                            karya.type === 'learning' 
                              ? 'bg-[#3B82F6] text-white' 
                              : 'bg-[#EC4899] text-white'
                          }`}>
                            {karya.type === 'learning' ? 'Misi Belajar' : 'Proyek Kreatif'}
                          </span>
                          <span className="text-[11px] font-nunito font-bold text-slate-400">
                            {new Date(karya.published_at).toLocaleDateString('id-ID')}
                          </span>
                        </div>
                        <h3 className="font-fredoka text-lg font-bold text-slate-800 leading-tight">{karya.title}</h3>
                        <p className="font-nunito text-xs font-black text-slate-500">Kreator: <span className="text-[#3B82F6]">{karya.student_name}</span></p>
                      </div>

                      <KaryaPreviewMini ast={karya.ast} />

                      {/* Dynamic Socratic/CBL AI feedback block */}
                      {karya.ai_feedback && (
                        <div className="bg-[#EEF2FF] border border-[#C7D2FE] p-3 rounded-xl text-left relative text-[11px] leading-relaxed">
                          <div className="flex items-center gap-1 text-[#4338CA] font-fredoka font-bold mb-1">
                            <i className="ti ti-sparkles" />
                            Umpan Balik AI:
                          </div>
                          <p className="font-nunito font-semibold text-slate-700 italic line-clamp-2 hover:line-clamp-none transition-all cursor-pointer" title="Klik untuk baca lengkap">
                            "{karya.ai_feedback}"
                          </p>
                        </div>
                      )}

                      {/* Dynamic Teacher comment block */}
                      {karya.teacher_comment && (
                        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-left relative text-[11px] leading-relaxed">
                          <div className="flex items-center gap-1 text-slate-600 font-fredoka font-bold mb-1">
                            <i className="ti ti-user-check" />
                            Catatan Guru:
                          </div>
                          <p className="font-nunito font-semibold text-slate-700 italic line-clamp-2 hover:line-clamp-none transition-all cursor-pointer" title="Klik untuk baca lengkap">
                            "{karya.teacher_comment}"
                          </p>
                        </div>
                      )}

                      {karya.type === 'project' && karya.rubrik_scores && (
                        <div className="grid grid-cols-2 gap-1.5 bg-slate-50 p-2.5 border-2 border-[#0F172A] rounded-xl text-[10px] my-0.5">
                          {Object.entries(karya.rubrik_scores).map(([kriteria, skor]) => {
                            const pillar = CT_PILLARS.find(p => p.label === kriteria);
                            const lvlInfo = scoreToLevel(skor);
                            const pillarColor = {
                              blue: 'text-blue-700 bg-blue-50/55 border-blue-200',
                              amber: 'text-amber-700 bg-amber-50/55 border-amber-200',
                              rose: 'text-rose-700 bg-rose-50/55 border-rose-200',
                              emerald: 'text-emerald-700 bg-emerald-50/55 border-emerald-200',
                            }[pillar?.color || 'blue'];
                            return (
                              <div key={kriteria} className={`flex items-center justify-between px-2 py-1.5 border rounded-lg ${pillarColor}`}>
                                <span className="font-bold truncate flex items-center gap-1">
                                  {pillar && <i className={`ti ${pillar.icon}`} />}
                                  {kriteria}
                                </span>
                                <span className="font-black">Skor {lvlInfo.level} ({skor})</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                        {karya.type === 'project' ? (
                          <button
                            onClick={() => handleAppreciate(karya.id)}
                            className="px-3.5 py-1.5 bg-pink-50 hover:bg-pink-100 border border-pink-200 rounded-xl text-pink-600 font-fredoka text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <i className="ti ti-heart text-sm" />
                            Suka ({karya.appreciations})
                          </button>
                        ) : (
                          <span className="text-[10px] font-fredoka font-bold text-slate-400 bg-slate-100 px-2.5 py-1 border border-slate-200 rounded-xl select-none">
                            Tugas Mandiri
                          </span>
                        )}

                        <span className="font-nunito text-xs text-slate-400 font-bold">
                          <i className="ti ti-eye mr-1" />
                          Publik Kelas
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Grading / Review Modal (Teacher only) */}
      {selectedSub && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white border-4 border-[#0F172A] shadow-[8px_8px_0px_#0F172A] max-w-4xl w-full max-h-[90vh] rounded-3xl overflow-hidden flex flex-col text-slate-800">
            {/* Header */}
            <div className="bg-[#3B82F6] text-white border-b-4 border-[#0F172A] p-5 flex justify-between items-center">
              <div>
                <h3 className="font-fredoka text-2xl font-bold">Penilaian & Feedback Guru</h3>
                <p className="font-nunito font-bold text-xs text-blue-100 mt-1">Siswa: {selectedSub.student_name} | Misi: {selectedSub.task_title}</p>
              </div>
              <button
                onClick={closeGradingModal}
                className="text-white hover:text-red-200 cursor-pointer text-2xl"
              >
                <i className="ti ti-x" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Panel: Preview code and AI recommendation */}
              <div className="flex flex-col gap-4">
                <div className="bg-slate-50 p-4 border-2 border-[#0F172A] rounded-2xl flex flex-col gap-2">
                  <h4 className="font-fredoka font-bold text-sm text-slate-700 flex items-center gap-1">
                    <i className="ti ti-code" /> Live Preview Halaman Web
                  </h4>
                  <KaryaPreviewMini ast={selectedSub.final_ast} />
                </div>


                <div className="bg-slate-50 p-4 border-2 border-[#0F172A] rounded-2xl flex flex-col gap-2">
                  <h4 className="font-fredoka font-bold text-sm text-slate-700 flex items-center gap-1">
                    <i className="ti ti-braces" /> Struktur Kode HTML Siswa
                  </h4>
                  <div className="bg-slate-900 text-emerald-400 p-3 rounded-xl border border-slate-800 text-[10px] font-mono overflow-auto max-h-[150px] text-left">
                    <pre className="whitespace-pre-wrap font-mono">
                      {toFormattedCode(selectedSub.final_ast) || '<!-- Kode kosong -->'}
                    </pre>
                  </div>
                </div>
              </div>


              {/* Right Panel: Manual Grading Forms */}
              <div className="flex flex-col gap-4">
                <h4 className="font-fredoka font-bold text-sm text-slate-700">Skor per Rubrik Penilaian (sesuai bobot tugas)</h4>

                <div className="flex flex-col gap-3">
                  {Object.keys(scores).map((kriteria) => {
                    const bobot = selectedSub.rubrik?.find((c) => criterionName(c) === kriteria)?.bobot;
                    const val = scores[kriteria];
                    const pillar = CT_PILLARS.find((p) => p.label === kriteria);
                    const lv = scoreToLevel(val).level;
                    const LV_TONE = { 
                      4: 'bg-emerald-500 hover:bg-emerald-600', 
                      3: 'bg-blue-500 hover:bg-blue-600', 
                      2: 'bg-amber-500 hover:bg-amber-600', 
                      1: 'bg-rose-500 hover:bg-rose-600' 
                    };
                    const PILLAR_CARD_ACCENT = pillar ? {
                      blue: 'border-blue-500 bg-blue-50/20 shadow-blue-500/20',
                      amber: 'border-amber-500 bg-amber-50/20 shadow-amber-500/20',
                      rose: 'border-rose-500 bg-rose-50/20 shadow-rose-500/20',
                      emerald: 'border-emerald-500 bg-emerald-50/20 shadow-emerald-500/20',
                    }[pillar.color] : 'border-[#0F172A] bg-slate-50 shadow-[#0F172A]/20';

                    const levelInfo = scoreToLevel(val);
                    const levelBadgeColor = {
                      emerald: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                      blue: 'bg-blue-100 text-blue-800 border-blue-300',
                      amber: 'bg-amber-100 text-amber-800 border-amber-300',
                      rose: 'bg-rose-100 text-rose-800 border-rose-300',
                    }[levelInfo.tone];

                    return (
                      <div key={kriteria} className={`flex flex-col gap-2 p-3.5 border-2 rounded-2xl shadow-[3px_3px_0px_#0F172A] bg-white transition-all ${PILLAR_CARD_ACCENT}`}>
                        <div className="flex justify-between items-center">
                          <span className="font-fredoka font-black text-xs text-slate-800 flex items-center gap-1.5">
                            {pillar && (
                              <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 border-[#0F172A] text-white shrink-0 ${
                                {
                                  blue: 'bg-blue-500',
                                  amber: 'bg-amber-500',
                                  rose: 'bg-rose-500',
                                  emerald: 'bg-emerald-500',
                                }[pillar.color] || 'bg-slate-500'
                              }`}>
                                <i className={`ti ${pillar.icon} text-xs`} />
                              </div>
                            )}
                            <span>{kriteria}</span>
                            {bobot ? (
                              <span className="text-[9px] font-fredoka font-bold text-white bg-slate-700 px-1.5 py-0.5 rounded-md">
                                Bobot {bobot}%
                              </span>
                            ) : null}
                          </span>
                          <span className={`font-fredoka font-black text-sm px-2 py-0.5 rounded-lg border-2 border-[#0F172A] ${levelBadgeColor}`}>
                            {val} · Skor {lv}
                          </span>
                        </div>

                        {isCtPillar(kriteria) && (
                          <>
                            {/* Tombol level 1-4 (objektif sesuai rubrik) */}
                            <div className="grid grid-cols-4 gap-1.5 my-0.5">
                              {[4, 3, 2, 1].map((l) => (
                                <button
                                  key={l}
                                  type="button"
                                  onClick={() => setScores({ ...scores, [kriteria]: levelToScore(l) })}
                                  className={`py-1.5 border-2 border-[#0F172A] rounded-xl font-fredoka text-xs font-black cursor-pointer transition-all shadow-[1.5px_1.5px_0px_#0F172A] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[0px_0px_0px_#0F172A] ${
                                    lv === l ? `${LV_TONE[l]} text-white` : 'bg-white text-slate-600 hover:bg-slate-50'
                                  }`}
                                >
                                  Skor {l}
                                </button>
                              ))}
                            </div>
                            {/* Deskripsi kriteria level aktif */}
                            <div className="font-nunito text-[10px] font-bold leading-snug rounded-xl p-2.5 border-2 border-[#0F172A] shadow-[1.5px_1.5px_0px_#0F172A] bg-white">
                              <span className="font-fredoka text-slate-800 text-[10px] font-black block mb-0.5 flex items-center gap-1">
                                <i className="ti ti-info-circle text-xs text-blue-650" />
                                Kriteria Capaian Skor {lv} ({levelInfo.label}):
                              </span>
                              <span className="text-slate-600 leading-normal">{pillarLevelDesc(kriteria, lv)}</span>
                            </div>
                          </>
                        )}

                        {/* Fine-tune 0-100 */}
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-fredoka font-bold text-slate-400">0</span>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={val}
                            onChange={(e) => setScores({ ...scores, [kriteria]: parseInt(e.target.value) })}
                            className="flex-1 accent-indigo-600 cursor-pointer h-2 bg-slate-100 rounded-lg appearance-none border border-slate-300"
                          />
                          <span className="text-[10px] font-fredoka font-bold text-slate-400">100</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Transparansi: nilai akhir terbobot dihitung live */}
                {(() => {
                  const total = weightedRubricScore(selectedSub.rubrik || [], scores);
                  const hasBobot = selectedSub.rubrik?.some((c) => Number(c.bobot) > 0);
                  const formula = hasBobot
                    ? selectedSub.rubrik.map((c) => `${scores[criterionName(c)] ?? 0}×${Number(c.bobot) || 0}`).join(' + ')
                    : Object.values(scores).join(' + ');
                  const divisor = hasBobot
                    ? selectedSub.rubrik.reduce((s, c) => s + (Number(c.bobot) || 0), 0)
                    : Object.keys(scores).length;
                  return (
                    <div className={`border-2 border-[#0F172A] rounded-xl p-3 shadow-[3px_3px_0px_#0F172A] ${total >= KKM ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                      <div className="flex justify-between items-center">
                        <span className="font-fredoka font-bold text-sm text-slate-800">Nilai Akhir {hasBobot ? '(terbobot)' : '(rata-rata)'}</span>
                        <span className={`font-fredoka font-black text-2xl ${total >= KKM ? 'text-emerald-600' : 'text-amber-600'}`}>{total}<span className="text-xs text-slate-400">/100</span></span>
                      </div>
                      <p className="font-mono text-[10px] text-slate-500 mt-1">= ({formula}) ÷ {divisor}</p>
                      <p className={`font-fredoka text-[11px] font-bold mt-1 ${total >= KKM ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {total >= KKM ? `✔ Tuntas (≥ KKM ${KKM})` : `⚠ Belum Tuntas (KKM ${KKM})`}
                      </p>
                    </div>
                  );
                })()}

                <div className="flex flex-col gap-1.5">
                  <label className="font-fredoka font-bold text-xs text-slate-600">Catatan/Umpan Balik Guru</label>
                  <textarea
                    placeholder="Tuliskan masukan positif dan saran peningkatan untuk siswa..."
                    rows="3"
                    value={teacherComment}
                    onChange={(e) => setTeacherComment(e.target.value)}
                    className="w-full p-3 border-2 border-[#0F172A] rounded-xl font-nunito font-semibold text-xs focus:outline-none focus:bg-slate-50"
                  />
                </div>

                <div className="flex items-center gap-2 bg-[#E0F2FE] border-2 border-[#0F172A] p-3 rounded-xl">
                  <input
                    type="checkbox"
                    id="publishCheck"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="w-4 h-4 cursor-pointer accent-[#3B82F6]"
                  />
                  <label htmlFor="publishCheck" className="font-fredoka font-bold text-xs text-slate-700 cursor-pointer">
                    <i className="ti ti-world mr-1" /> Publikasikan karya siswa ke galeri publik kelas
                  </label>
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="bg-slate-50 border-t-4 border-[#0F172A] p-4 flex justify-end gap-3">
              <button
                onClick={closeGradingModal}
                className="px-4 py-2 border-2 border-[#0F172A] font-fredoka font-bold rounded-xl text-slate-700 bg-white hover:bg-slate-100 cursor-pointer transition-all shadow-[2px_2px_0px_#0f172a]"
              >
                Batal
              </button>
              <button
                onClick={handleSaveGrade}
                className="px-5 py-2 bg-[#10B981] hover:bg-[#0E9E6E] border-2 border-[#0F172A] text-white font-fredoka font-bold rounded-xl cursor-pointer transition-all shadow-[2px_2px_0px_#0f172a]"
              >
                <i className="ti ti-device-floppy mr-1.5" />
                Simpan Penilaian
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
