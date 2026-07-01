import React from 'react';
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
      { type: 'header', name: '<header>', icon: 'ti-layout-topbar', desc: 'Wadah navigasi atas (header).' },
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

export default function PaletBlok() {
  const { addBlock, selectedContainerId, ast } = useStore();
  const [openGroups, setOpenGroups] = React.useState({
    'containers': true, // Open by default
    'text': true
  });

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

  return (
    <div className="bg-white p-4 flex flex-col gap-4 overflow-y-auto h-full text-left">
      <div>
        <h3 className="font-fredoka text-base font-bold text-[#0F172A] flex items-center gap-1.5 border-b-2 border-dashed border-slate-200 pb-2">
          <i className="ti ti-square-plus text-blue-600 text-lg" />
          Palet Blok HTML
        </h3>
        <p className="font-nunito text-[10px] text-slate-500 font-bold leading-normal mt-1">
          Klik elemen di bawah untuk memasukkannya ke dalam wadah terpilih.
        </p>
      </div>

      <div className="flex flex-col gap-3 flex-1 overflow-y-auto pb-8 pr-1 custom-scrollbar">
        {BLOCK_GROUPS.map((group) => (
          <div key={group.id} className="border-2 border-[#0F172A] rounded-xl overflow-hidden shadow-[2px_2px_0px_#0F172A] bg-white">
            <button
              onClick={() => toggleGroup(group.id)}
              className="w-full bg-slate-100 hover:bg-slate-200 px-3 py-2.5 flex items-center justify-between border-b-2 border-transparent transition-colors"
            >
              <div className="flex items-center gap-2">
                <i className={`ti ${group.icon} text-[#0F172A] text-sm`} />
                <span className="font-fredoka text-xs font-bold text-[#0F172A]">{group.title}</span>
              </div>
              <i className={`ti ${openGroups[group.id] ? 'ti-chevron-up' : 'ti-chevron-down'} text-slate-500 text-sm transition-transform duration-200`} />
            </button>
            
            {openGroups[group.id] && (
              <div className="p-2 flex flex-col gap-2 border-t-2 border-[#0F172A]">
                {group.blocks.map(block => (
                  <button
                    key={block.type}
                    onClick={() => handleAdd(block.type)}
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'copy';
                      e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'new', blockType: block.type }));
                    }}
                    className="group relative w-full text-left p-2 bg-white border-2 border-slate-200 hover:border-[#0F172A] hover:-translate-y-0.5 active:translate-y-[1px] rounded-xl flex items-center gap-2.5 transition-all cursor-grab active:cursor-grabbing hover:shadow-[2px_2px_0px_#0F172A] active:shadow-none"
                  >
                    <div className={`w-7 h-7 rounded-lg ${group.color} flex items-center justify-center border-2 border-transparent group-hover:border-[#0F172A] shrink-0 transition-colors`}>
                      <i className={`ti ${block.icon} text-sm`} />
                    </div>
                    <div>
                      <p className="font-mono text-xs font-bold text-slate-700 group-hover:text-[#0F172A] transition-colors">{block.name}</p>
                      <p className="font-nunito text-[9px] text-slate-400 group-hover:text-slate-600 font-bold leading-none mt-0.5 transition-colors line-clamp-1">{block.desc}</p>
                    </div>

                    {/* Hover tooltip for description if truncated */}
                    <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 w-48 bg-[#0F172A] text-white p-2 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none shadow-lg text-xs font-nunito border-2 border-white/20">
                      <div className="font-bold mb-1 font-mono text-[10px] text-blue-300">{block.name}</div>
                      {block.desc}
                      <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-[#0F172A] rotate-45 border-l-2 border-b-2 border-white/20" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
