import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import api from '../services/api';
import { toHTML, toFormattedCode } from '../services/astUtils';

// Read-only mini preview of a finished karya (no interaction, replay-only)
function RekapPreview({ ast }) {
  let parsed = [];
  try {
    parsed = typeof ast === 'string' ? JSON.parse(ast) : (ast || []);
  } catch (e) {
    parsed = [];
  }
  const html = toHTML(parsed);
  const fullHTML = `<!DOCTYPE html><html><head><style>
    body { font-family:'Nunito',sans-serif; margin:0; padding:16px; background:#ffffff; color:#0f172a; }
  </style></head><body>${html}</body></html>`;
  return (
    <div className="w-full h-64 border-2 border-[#0F172A] rounded-xl overflow-hidden bg-white relative shadow-[3px_3px_0px_#0F172A]">
      <iframe srcDoc={fullHTML} sandbox="" title="Rekap Preview" className="w-full h-full border-none" />
      <div className="absolute inset-0 pointer-events-none" />
    </div>
  );
}

// Read-only tree view of the AST block structure (no drag/select/edit).
function BlockTree({ nodes, depth = 0 }) {
  if (!nodes || nodes.length === 0) {
    return depth === 0
      ? <p className="text-slate-400 font-nunito text-xs font-bold italic p-2">Tidak ada blok.</p>
      : null;
  }
  return (
    <div className={depth > 0 ? 'pl-4 border-l-2 border-dashed border-slate-200 flex flex-col gap-1.5' : 'flex flex-col gap-1.5'}>
      {nodes.map((node, i) => (
        <div key={node.id || i} className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 bg-slate-50 border-2 border-slate-200 rounded-lg px-2.5 py-1.5">
            <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded shrink-0">{`<${node.type}>`}</span>
            {node.type === 'style'
              ? <span className="font-nunito text-[10px] text-slate-400 font-bold italic">gaya CSS</span>
              : node.content
                ? <span className="font-nunito text-[11px] text-slate-600 font-semibold truncate">{node.content}</span>
                : null}
          </div>
          {Array.isArray(node.children) && node.children.length > 0 && (
            <BlockTree nodes={node.children} depth={depth + 1} />
          )}
        </div>
      ))}
    </div>
  );
}

// Read-only artifact viewer with Preview / Blocks / Code tabs.
function RekapArtifact({ ast }) {
  const [tab, setTab] = useState('preview'); // 'preview' | 'blocks' | 'code'
  let parsed = [];
  try {
    parsed = typeof ast === 'string' ? JSON.parse(ast) : (ast || []);
  } catch (e) {
    parsed = [];
  }
  const code = toFormattedCode(parsed);

  const tabs = [
    ['preview', 'Pratinjau', 'ti-eye'],
    ['blocks', 'Blok', 'ti-stack-2'],
    ['code', 'Kode', 'ti-code'],
  ];

  return (
    <div>
      <div className="flex gap-2 mb-2">
        {tabs.map(([key, label, icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-1.5 border-2 border-[#0F172A] rounded-lg font-fredoka text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              tab === key ? 'bg-[#0F172A] text-white shadow-[2px_2px_0px_#94A3B8]' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <i className={`ti ${icon}`} /> {label}
          </button>
        ))}
      </div>

      {tab === 'preview' && <RekapPreview ast={parsed} />}

      {tab === 'blocks' && (
        <div className="w-full h-64 overflow-y-auto border-2 border-[#0F172A] rounded-xl bg-white p-3 shadow-[3px_3px_0px_#0F172A] custom-scrollbar">
          <BlockTree nodes={parsed} />
        </div>
      )}

      {tab === 'code' && (
        <div className="w-full h-64 overflow-auto border-2 border-[#0F172A] rounded-xl bg-[#0F172A] shadow-[3px_3px_0px_#0F172A] custom-scrollbar">
          <pre className="p-3 text-[11px] leading-relaxed font-mono text-emerald-200 whitespace-pre">{code || '<!-- Kode kosong -->'}</pre>
        </div>
      )}
    </div>
  );
}

export default function Rekap() {
  const { roomId, tugasId } = useParams(); // tugasId = pertemuan_id
  const navigate = useNavigate();
  const { user } = useStore();
  const [pertemuan, setPertemuan] = useState(null);
  const [learning, setLearning] = useState(null);
  const [project, setProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      api.get(`/rooms/${roomId}/pertemuan`),
      api.get('/submissions/learning/me').catch(() => ({ data: [] })),
      api.get('/submissions/project/me').catch(() => ({ data: [] }))
    ])
      .then(([pertRes, learnRes, projRes]) => {
        const found = (pertRes.data || []).find(p => p.id === tugasId);
        setPertemuan(found || null);
        setLearning((learnRes.data || []).find(s => s.pertemuan_id === tugasId) || null);
        setProject((projRes.data || []).find(s => s.pertemuan_id === tugasId) || null);
      })
      .catch(err => console.error('Gagal memuat rekap:', err))
      .finally(() => setIsLoading(false));
  }, [roomId, tugasId]);

  if (isLoading) {
    return (
      <div className="w-full px-6 py-12 flex justify-center items-center">
        <div className="neo-card p-12 text-center max-w-sm">
          <i className="ti ti-loader animate-spin text-3xl text-blue-600 mb-2" />
          <p className="font-nunito text-xs text-slate-500 font-bold">Memuat rekap pengerjaan...</p>
        </div>
      </div>
    );
  }

  if (!learning && !project) {
    return (
      <div className="w-full px-6 py-12 flex justify-center items-center">
        <div className="neo-card p-8 text-center max-w-sm border-4 border-[#0F172A] shadow-[6px_6px_0px_#0F172A]">
          <i className="ti ti-file-off text-4xl text-slate-400 mb-2" />
          <h3 className="font-fredoka text-lg font-bold">Belum Ada Rekap</h3>
          <p className="font-nunito text-xs text-slate-500 font-bold mt-1">
            Kamu belum menyelesaikan pertemuan ini.
          </p>
          <button
            onClick={() => navigate(`/ruang-belajar/${roomId}/tugas/${tugasId}`)}
            className="mt-4 px-5 py-2.5 bg-[#EC4899] text-white border-2 border-[#0F172A] font-fredoka text-xs font-bold rounded-xl shadow-[3px_3px_0px_#0F172A] hover:-translate-y-0.5 cursor-pointer transition-all"
          >
            Mulai Kerjakan
          </button>
        </div>
      </div>
    );
  }

  const ctPost = learning?.ct_post_score || {};
  const reflection = learning?.reflection_answers || {};

  return (
    <div className="w-full px-4 md:px-6 py-8 text-left max-w-4xl mx-auto flex flex-col gap-6 neo-page-enter">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-[20px] border-4 border-[#0F172A] shadow-[4px_4px_0px_#0F172A]">
        <button
          onClick={() => navigate(`/ruang-belajar/${roomId}`)}
          className="w-fit py-1.5 px-3 border-2 border-[#0F172A] bg-white text-slate-700 font-fredoka text-xs font-bold rounded-xl shadow-[2px_2px_0px_#0F172A] hover:-translate-y-0.5 active:translate-y-[0.5px] cursor-pointer transition-all flex items-center gap-1.5"
        >
          <i className="ti ti-arrow-left" />
          Kembali
        </button>
        <span className="bg-emerald-100 text-emerald-700 border-2 border-emerald-300 px-3 py-1 rounded-xl font-fredoka text-[10px] font-bold flex items-center gap-1">
          <i className="ti ti-circle-check" /> Tayangan Ulang (Read-only)
        </span>
      </div>

      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-4 border-[#0F172A] rounded-[24px] shadow-[6px_6px_0px_#0F172A] p-6 flex flex-col gap-2">
        <span className="font-nunito text-[9px] font-black text-emerald-600 uppercase tracking-widest">Rekap Pengerjaan</span>
        <h2 className="font-fredoka text-2xl font-bold text-[#0F172A]">{pertemuan?.judul || 'Pertemuan'}</h2>
        <p className="font-nunito text-xs text-slate-600 font-bold">
          Ini adalah riwayat hasil pengerjaanmu. Kamu bisa melihat kembali karyamu, namun tidak dapat mengerjakan ulang.
        </p>
      </div>

      {/* Learning mission recap */}
      {learning && (
        <section className="bg-white border-4 border-[#0F172A] rounded-[24px] shadow-[6px_6px_0px_#0F172A] p-6 flex flex-col gap-5">
          <h3 className="font-fredoka text-lg font-bold text-[#0F172A] flex items-center gap-2">
            <i className="ti ti-school text-blue-600" /> Misi Belajar — {learning.levelTitle}
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-blue-50 border-2 border-[#0F172A] rounded-xl p-3 shadow-[2px_2px_0px_#0F172A]">
              <p className="font-nunito text-[9px] font-bold text-blue-600 uppercase">Skor Akhir</p>
              <p className="font-fredoka text-2xl font-bold text-slate-800">{learning.ctScore}</p>
            </div>
            <div className="bg-emerald-50 border-2 border-[#0F172A] rounded-xl p-3 shadow-[2px_2px_0px_#0F172A]">
              <p className="font-nunito text-[9px] font-bold text-emerald-600 uppercase">Akurasi</p>
              <p className="font-fredoka text-2xl font-bold text-slate-800">{learning.accuracy}%</p>
            </div>
            <div className="bg-amber-50 border-2 border-[#0F172A] rounded-xl p-3 shadow-[2px_2px_0px_#0F172A]">
              <p className="font-nunito text-[9px] font-bold text-amber-600 uppercase">Percobaan</p>
              <p className="font-fredoka text-2xl font-bold text-slate-800">{learning.attempts}x</p>
            </div>
            <div className="bg-pink-50 border-2 border-[#0F172A] rounded-xl p-3 shadow-[2px_2px_0px_#0F172A]">
              <p className="font-nunito text-[9px] font-bold text-pink-600 uppercase">Algoritma CT</p>
              <p className="font-fredoka text-2xl font-bold text-slate-800">{ctPost.algorithm_design || '-'}</p>
            </div>
          </div>

          <div>
            <p className="font-fredoka text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Hasil Karyamu</p>
            <RekapArtifact ast={learning.ast} />
          </div>

          {learning.teacherComment && (
            <div className="bg-[#EEF2FF] border-2 border-[#C7D2FE] p-3 rounded-xl text-xs">
              <div className="flex items-center gap-1.5 text-[#4338CA] font-fredoka font-bold mb-1">
                <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[9px] border border-indigo-200">AI</span>
                Umpan Balik AI:
              </div>
              <p className="font-nunito font-semibold text-slate-700 italic">"{learning.teacherComment}"</p>
            </div>
          )}

          {reflection?.answer && (
            <div className="bg-slate-50 border-2 border-slate-200 p-3 rounded-xl text-xs">
              <div className="font-fredoka font-bold text-slate-600 mb-1 flex items-center gap-1">
                <i className="ti ti-notes" /> Refleksimu:
              </div>
              <p className="font-nunito font-semibold text-slate-700">"{reflection.answer}"</p>
            </div>
          )}
        </section>
      )}

      {/* Project recap */}
      {project && (
        <section className="bg-white border-4 border-[#0F172A] rounded-[24px] shadow-[6px_6px_0px_#0F172A] p-6 flex flex-col gap-5">
          <h3 className="font-fredoka text-lg font-bold text-[#0F172A] flex items-center gap-2">
            <i className="ti ti-device-laptop text-emerald-600" /> Proyek — {project.task_title}
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            {project.teacher_score !== null ? (
              <span className="bg-emerald-50 text-emerald-700 border-2 border-emerald-300 px-3 py-1 rounded-xl font-fredoka text-xs font-bold">
                Skor Guru: {project.teacher_score}/100
              </span>
            ) : (
              <span className="bg-amber-50 text-amber-700 border-2 border-amber-300 px-3 py-1 rounded-xl font-fredoka text-xs font-bold">
                Menunggu Penilaian Guru
              </span>
            )}
            {project.is_published_to_gallery && (
              <span className="bg-pink-50 text-pink-700 border-2 border-pink-300 px-3 py-1 rounded-xl font-fredoka text-xs font-bold flex items-center gap-1">
                <i className="ti ti-world" /> Masuk Galeri
              </span>
            )}
          </div>

          <div>
            <p className="font-fredoka text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Hasil Proyekmu</p>
            <RekapArtifact ast={project.final_ast} />
          </div>

          {project.teacher_comment && (
            <div className="bg-slate-50 border-2 border-slate-200 p-3 rounded-xl text-xs">
              <div className="font-fredoka font-bold text-slate-600 mb-1 flex items-center gap-1">
                <i className="ti ti-user-check" /> Catatan Guru:
              </div>
              <p className="font-nunito font-semibold text-slate-700">"{project.teacher_comment}"</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
