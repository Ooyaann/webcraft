import React from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../store/useStore';

const BLOCK_GROUPS = [
  {
    id: 'containers',
    title: 'Wadah (Containers)',
    icon: 'ti-layout',
    color: 'bg-blue-600 text-white',
    blocks: [
      { type: 'body', name: '<body>', icon: 'ti-layout', desc: 'Wadah utama dokumen web.' },
      { type: 'div', name: '<div>', icon: 'ti-square', desc: 'Pembungkus generik elemen.' },
      { type: 'header', name: '<header>', icon: 'ti-layout-navbar', desc: 'Wadah navigasi atas (header).' },
      { type: 'footer', name: '<footer>', icon: 'ti-layout-bottombar', desc: 'Wadah catatan kaki (footer).' },
      { type: 'main', name: '<main>', icon: 'ti-layout-distribute-vertical', desc: 'Wadah konten utama.' },
      { type: 'section', name: '<section>', icon: 'ti-layout-board-split', desc: 'Bagian terpisah dari halaman web.' },
      { type: 'article', name: '<article>', icon: 'ti-news', desc: 'Konten artikel mandiri.' },
      { type: 'aside', name: '<aside>', icon: 'ti-layout-sidebar-right', desc: 'Wadah panel samping (sidebar).' },
      { type: 'nav', name: '<nav>', icon: 'ti-compass', desc: 'Wadah menu navigasi web.' }
    ]
  },
  {
    id: 'text',
    title: 'Konten Teks',
    icon: 'ti-typography',
    color: 'bg-emerald-600 text-white',
    blocks: [
      { type: 'h1', name: '<h1>', icon: 'ti-heading', desc: 'Judul terbesar (Heading 1).' },
      { type: 'h2', name: '<h2>', icon: 'ti-heading', desc: 'Sub-judul (Heading 2).' },
      { type: 'h3', name: '<h3>', icon: 'ti-heading', desc: 'Sub-judul kecil (Heading 3).' },
      { type: 'p', name: '<p>', icon: 'ti-align-left', desc: 'Paragraf teks biasa.' },
      { type: 'span', name: '<span>', icon: 'ti-text-size', desc: 'Pembungkus teks sejajar (inline).' },
      { type: 'strong', name: '<strong>', icon: 'ti-bold', desc: 'Teks tebal (Penting).' },
      { type: 'em', name: '<em>', icon: 'ti-italic', desc: 'Teks miring (Penekanan).' },
      { type: 'a', name: '<a>', icon: 'ti-link', desc: 'Tautan (Hyperlink) antar halaman.' }
    ]
  },
  {
    id: 'lists',
    title: 'Daftar (Lists)',
    icon: 'ti-list',
    color: 'bg-indigo-600 text-white',
    blocks: [
      { type: 'ul', name: '<ul>', icon: 'ti-list', desc: 'Daftar tak berurut (titik/bulat).' },
      { type: 'ol', name: '<ol>', icon: 'ti-list-numbers', desc: 'Daftar berurut (angka).' },
      { type: 'li', name: '<li>', icon: 'ti-list-details', desc: 'Item di dalam daftar ul/ol.' }
    ]
  },
  {
    id: 'forms',
    title: 'Formulir (Forms)',
    icon: 'ti-forms',
    color: 'bg-amber-500 text-white',
    blocks: [
      { type: 'form', name: '<form>', icon: 'ti-forms', desc: 'Wadah untuk form input user.' },
      { type: 'input', name: '<input>', icon: 'ti-cursor-text', desc: 'Kotak isian teks tunggal.' },
      { type: 'textarea', name: '<textarea>', icon: 'ti-notes', desc: 'Kotak isian teks panjang.' },
      { type: 'button', name: '<button>', icon: 'ti-pointer', desc: 'Tombol yang dapat diklik.' },
      { type: 'label', name: '<label>', icon: 'ti-tag', desc: 'Label teks untuk input.' }
    ]
  },
  {
    id: 'media',
    title: 'Media & Tabel',
    icon: 'ti-photo',
    color: 'bg-pink-600 text-white',
    blocks: [
      { type: 'img', name: '<img>', icon: 'ti-photo', desc: 'Menampilkan berkas gambar.' },
      { type: 'table', name: '<table>', icon: 'ti-table', desc: 'Wadah utama tabel data.' },
      { type: 'tr', name: '<tr>', icon: 'ti-layout-bottombar', desc: 'Baris di dalam tabel.' },
      { type: 'td', name: '<td>', icon: 'ti-layout-distribute-horizontal', desc: 'Sel data (kolom) di dalam baris.' },
      { type: 'th', name: '<th>', icon: 'ti-layout-navbar', desc: 'Sel judul kolom tabel.' },
      { type: 'style', name: '<style>', icon: 'ti-brush', desc: 'Mengatur warna & gaya CSS.' }
    ]
  }
];

export default function PaletBlok({ isCompact = false }) {
  const { addBlock, selectedContainerId, ast } = useStore();
  const [openGroups, setOpenGroups] = React.useState({
    'containers': true, // Open by default
    'text': true
  });
  // Tooltip rendered via a portal so it is never clipped by the palette's
  // overflow containers. Holds the hovered block's text + viewport position.
  const [tooltip, setTooltip] = React.useState(null);

  const showTooltip = (e, block) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTooltip({ name: block.name, desc: block.desc, x: r.right + 10, y: r.top + r.height / 2 });
  };
  const hideTooltip = () => setTooltip(null);

  const toggleGroup = (id) => {
    setOpenGroups(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleAdd = (type) => {
    // Prevent adding multiple body-roots
    if (type === 'body' && ast.some(n => n.type === 'body')) {
      alert("Tag <body> utama sudah ada di workspace!");
      return;
    }

    addBlock(type, selectedContainerId);
  };

  const getGroupHeaderClass = (id) => {
    const classes = {
      containers: 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white',
      text: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white',
      lists: 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white',
      forms: 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900',
      media: 'bg-gradient-to-r from-pink-500 to-rose-600 text-white'
    };
    return classes[id] || 'bg-slate-100 text-[#0F172A]';
  };

  return (
    <div className={`bg-white flex flex-col h-full text-left overflow-hidden ${isCompact ? 'p-2 gap-1.5' : 'p-4 gap-4'}`}>
      {!isCompact && <div>
        <h3 className="font-fredoka text-sm font-bold text-[#0F172A] flex items-center gap-1.5 border-b-2 border-dashed border-slate-200 pb-2">
          <i className="ti ti-square-plus text-blue-600 text-base animate-pulse" />
          Palet Blok HTML
        </h3>
        <p className="font-nunito text-[10px] text-slate-500 font-bold leading-normal mt-1">
          Klik atau drag elemen ke kanvas struktur untuk merakit halaman web.
        </p>
      </div>}
      {isCompact && <h3 className="font-fredoka text-[10px] font-bold text-[#0F172A] flex items-center gap-1 shrink-0">
        <i className="ti ti-square-plus text-blue-600 text-xs" />
        Palet Blok
      </h3>}

      <div className={`flex flex-col flex-1 overflow-y-auto pb-4 pr-1 custom-scrollbar ${isCompact ? 'gap-1.5' : 'gap-3.5'}`}>
        {BLOCK_GROUPS.map((group) => (
          <div key={group.id} className="border-4 border-[#0F172A] rounded-[20px] overflow-hidden shadow-[3px_3px_0px_#0F172A] bg-white shrink-0">
            <button
              onClick={() => toggleGroup(group.id)}
              className={`w-full ${getGroupHeaderClass(group.id)} flex items-center justify-between border-b-4 border-[#0F172A] transition-colors font-fredoka font-bold ${isCompact ? 'px-2.5 py-1.5 text-[10px]' : 'px-4 py-3 text-xs'}`}
            >
              <div className="flex items-center gap-2">
                <i className={`ti ${group.icon} text-sm`} />
                <span>{group.title}</span>
              </div>
              <i className={`ti ${openGroups[group.id] ? 'ti-chevron-up' : 'ti-chevron-down'} text-sm transition-transform duration-200`} />
            </button>
            
            {openGroups[group.id] && (
              <div className={`flex flex-col bg-[#FAFBFB] overflow-y-auto border-t-2 border-[#0F172A] custom-scrollbar ${isCompact ? 'p-1.5 gap-1 max-h-40' : 'p-3 gap-2.5 max-h-64'}`}>
                {group.blocks.map(block => (
                  <button
                    key={block.type}
                    onClick={() => handleAdd(block.type)}
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'copy';
                      e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'new', blockType: block.type }));
                    }}
                    onMouseEnter={(e) => showTooltip(e, block)}
                    onMouseLeave={hideTooltip}
                    className={`group relative w-full text-left bg-white border-2 border-slate-200 hover:border-[#0F172A] hover:-translate-y-0.5 active:translate-y-[1px] rounded-lg flex items-center transition-all cursor-grab active:cursor-grabbing hover:shadow-[2px_2px_0px_#0F172A] active:shadow-none ${isCompact ? 'p-1.5 gap-2' : 'p-2.5 gap-3'}`}
                  >
                    <div className={`rounded-md ${group.color} flex items-center justify-center border-2 border-transparent group-hover:border-[#0F172A] shrink-0 transition-colors shadow-sm ${isCompact ? 'w-5 h-5' : 'w-8 h-8'}`}>
                      <i className={`ti ${block.icon} ${isCompact ? 'text-[10px]' : 'text-sm'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-mono font-bold text-slate-700 group-hover:text-[#0F172A] transition-colors ${isCompact ? 'text-[10px]' : 'text-xs'}`}>{block.name}</p>
                      {!isCompact && <p className="font-nunito text-[9.5px] text-slate-400 group-hover:text-slate-600 font-bold leading-normal mt-0.5 transition-colors whitespace-normal break-words">
                        {block.desc}
                      </p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {tooltip && createPortal(
        <div
          style={{ position: 'fixed', left: tooltip.x, top: tooltip.y, transform: 'translateY(-50%)' }}
          className="z-[9999] w-52 bg-[#0F172A] text-white p-2.5 rounded-lg shadow-xl text-xs font-nunito border-2 border-white/20 pointer-events-none"
        >
          <div className="font-bold mb-1 font-mono text-[11px] text-blue-300">{tooltip.name}</div>
          <div className="leading-snug text-white/90">{tooltip.desc}</div>
        </div>,
        document.body
      )}
    </div>
  );
}
