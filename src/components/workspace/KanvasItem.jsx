import React, { useState } from 'react';
import { useStore } from '../../store/useStore';

export default function KanvasItem({ node, isCompact = false }) {
  const {
    selectedContainerId,
    setSelectedContainerId,
    removeBlock,
    updateContent,
    moveOrAddBlock,
    moveBlockUpDown
  } = useStore();

  const [dropPreview, setDropPreview] = useState(null); // 'before' | 'after' | null
  const [isDragOverChildren, setIsDragOverChildren] = useState(false);

  const isContainer = ['body', 'div', 'ul'].includes(node.type);

  // Sibling drag and drop handlers (prevent nesting loop and drag body-root)
  const handleDragOverCard = (e) => {
    if (node.id === 'body-root') return;
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const isUpperHalf = relativeY < rect.height / 2;

    setDropPreview(isUpperHalf ? 'before' : 'after');
  };

  const handleDragLeaveCard = () => {
    setDropPreview(null);
  };

  const handleDropCard = (e) => {
    if (node.id === 'body-root') return;
    e.preventDefault();
    e.stopPropagation();

    const dragDataStr = e.dataTransfer.getData('text/plain');
    if (!dragDataStr) return;

    try {
      const source = JSON.parse(dragDataStr);
      const relation = dropPreview || 'after';
      moveOrAddBlock(source, node.id, relation);
    } catch (err) {
      console.error("Failed to parse drag data:", err);
    } finally {
      setDropPreview(null);
    }
  };

  // Container drop handlers (appending to container)
  const handleDragOverChildren = (e) => {
    if (!isContainer) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverChildren(true);
  };

  const handleDragLeaveChildren = () => {
    setIsDragOverChildren(false);
  };

  const handleDropChildren = (e) => {
    if (!isContainer) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverChildren(false);

    const dragDataStr = e.dataTransfer.getData('text/plain');
    if (!dragDataStr) return;

    try {
      const source = JSON.parse(dragDataStr);
      moveOrAddBlock(source, node.id, 'append');
    } catch (err) {
      console.error("Failed to parse drag data:", err);
    }
  };
  const isSelected = selectedContainerId === node.id;

  const handleContainerClick = (e) => {
    e.stopPropagation();
    if (isContainer) {
      setSelectedContainerId(node.id);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    removeBlock(node.id);
  };

  const handleContentChange = (e) => {
    updateContent(node.id, e.target.value);
  };

  // Node Color Scheme matching categories
  const getHeaderStyle = () => {
    if (node.type === 'body') return 'bg-blue-600 text-white';
    if (['div', 'ul'].includes(node.type)) return 'bg-sky-100 text-[#0F172A] border-b-2';
    if (['h1', 'p', 'li'].includes(node.type)) return 'bg-emerald-600 text-white';
    if (['button', 'img'].includes(node.type)) return 'bg-pink-600 text-white';
    if (node.type === 'style') return 'bg-yellow-500 text-[#0F172A]';
    return 'bg-gray-100 text-gray-700';
  };

  const getIconClass = () => {
    switch (node.type) {
      case 'body': return 'ti ti-layout';
      case 'div': return 'ti ti-square';
      case 'ul': return 'ti ti-list';
      case 'h1': return 'ti ti-heading';
      case 'p': return 'ti ti-align-left';
      case 'li': return 'ti ti-list-details';
      case 'button': return 'ti ti-pointer';
      case 'img': return 'ti ti-photo';
      case 'style': return 'ti ti-brush';
      default: return 'ti ti-code';
    }
  };

  return (
    <div
      onClick={handleContainerClick}
      onDragOver={node.id !== 'body-root' ? handleDragOverCard : undefined}
      onDragLeave={node.id !== 'body-root' ? handleDragLeaveCard : undefined}
      onDrop={node.id !== 'body-root' ? handleDropCard : undefined}
      className={`relative border-2 border-[#0F172A] overflow-hidden bg-white text-left transition-all ${
        isCompact ? 'rounded-lg' : 'rounded-xl'
      } ${
        isContainer
          ? `${isCompact ? 'my-1.5 shadow-[1.5px_1.5px_0px_#0F172A]' : 'my-3 shadow-[2px_2px_0px_#0F172A]'}`
          : `${isCompact ? 'my-1' : 'my-2'}`
      } ${isSelected && isContainer ? 'ring-4 ring-blue-500/50 -translate-y-[1px]' : ''}`}
    >
      {/* Sibling insertion markers */}
      {dropPreview === 'before' && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500 z-50 animate-pulse" />
      )}
      {dropPreview === 'after' && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 z-50 animate-pulse" />
      )}
      {/* Node Header Label */}
      <div
        draggable={node.id !== 'body-root'}
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'existing', id: node.id }));
        }}
        className={`flex justify-between items-center font-fredoka font-bold border-[#0F172A] ${getHeaderStyle()} ${
          node.id !== 'body-root' ? 'cursor-grab active:cursor-grabbing select-none' : ''
        } ${isCompact ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1.5 text-xs'}`}
      >
        <div className="flex items-center gap-1">
          <i className={`${getIconClass()} ${isCompact ? 'text-xs' : 'text-sm'}`} aria-hidden />
          <span>&lt;{node.type}&gt;</span>
          {isSelected && isContainer && (
            <span className={`bg-white text-blue-600 rounded border border-blue-600 font-extrabold ${isCompact ? 'text-[7.5px] px-1 py-0' : 'text-[9px] px-1.5 py-0.5'}`}>
              Wadah Aktif
            </span>
          )}
        </div>

        {node.id !== 'body-root' && (
          <div className={`flex items-center ${isCompact ? 'gap-1' : 'gap-1.5'}`}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                moveBlockUpDown(node.id, 'up');
              }}
              title="Pindahkan ke atas"
              className="text-[#0F172A] hover:bg-[#0F172A]/10 p-0.5 rounded transition-colors cursor-pointer flex items-center"
            >
              <i className={`ti ti-chevron-up font-bold ${isCompact ? 'text-xs' : 'text-sm'}`} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                moveBlockUpDown(node.id, 'down');
              }}
              title="Pindahkan ke bawah"
              className="text-[#0F172A] hover:bg-[#0F172A]/10 p-0.5 rounded transition-colors cursor-pointer flex items-center"
            >
              <i className={`ti ti-chevron-down font-bold ${isCompact ? 'text-xs' : 'text-sm'}`} />
            </button>
            <button
              onClick={handleDelete}
              className="text-[#0F172A] hover:text-red-500 font-bold p-0.5 rounded transition-colors cursor-pointer flex items-center"
            >
              <i className={`ti ti-trash ${isCompact ? 'text-xs' : 'text-sm'}`} />
            </button>
          </div>
        )}
      </div>

      {/* Node Body Content */}
      <div className={`${isCompact ? 'p-1.5' : 'p-3'}`}>
        {isContainer ? (
          <div
            onDragOver={handleDragOverChildren}
            onDragLeave={handleDragLeaveChildren}
            onDrop={handleDropChildren}
            className={`flex flex-col rounded-lg transition-all ${
              isDragOverChildren
                ? 'border-solid border-blue-500 bg-blue-50/20 border-4'
                : isSelected
                  ? 'border-blue-500 bg-blue-50/10 border-dashed border-4'
                  : 'bg-slate-50/50 border-2 border-dashed border-slate-300'
            } ${isCompact ? 'p-1.5 gap-1.5 min-h-[30px]' : 'p-2 gap-2 min-h-[50px]'}`}
          >
            {node.children && node.children.length > 0 ? (
              node.children.map(child => (
                <KanvasItem key={child.id} node={child} isCompact={isCompact} />
              ))
            ) : (
              <p className={`text-slate-400 font-nunito font-bold text-center ${isCompact ? 'text-[8.5px] py-1.5' : 'text-[10px] py-4'}`}>
                Wadah kosong. Tambahkan blok di sini!
              </p>
            )}
          </div>
        ) : (
          <div className={`flex flex-col ${isCompact ? 'gap-1' : 'gap-1.5'}`}>
            {node.type === 'style' ? (
              <textarea
                value={node.content}
                onChange={handleContentChange}
                rows={isCompact ? 2 : 3}
                placeholder="/* Tulis kode CSS di sini */&#10;body { background-color: #E0F2FE; }&#10;h1 { color: #EC4899; }"
                className={`w-full bg-white border-2 border-[#0F172A] rounded-lg font-mono focus:outline-none leading-normal font-bold ${
                  isCompact ? 'px-1.5 py-1 text-[10px]' : 'px-2.5 py-1.5 text-xs'
                }`}
              />
            ) : node.type === 'img' ? (
              <input
                type="text"
                value={node.content}
                onChange={handleContentChange}
                placeholder="Masukkan tautan/URL gambar di sini..."
                className={`w-full border-2 border-[#0F172A] rounded-lg bg-white font-bold font-nunito focus:outline-none ${
                  isCompact ? 'px-1.5 py-1 text-[10px]' : 'px-2.5 py-1.5 text-xs'
                }`}
              />
            ) : (
              <input
                type="text"
                value={node.content}
                onChange={handleContentChange}
                placeholder="Tulis konten teks di sini..."
                className={`w-full border-2 border-[#0F172A] rounded-lg bg-white font-bold font-nunito focus:outline-none ${
                  isCompact ? 'px-1.5 py-1 text-[10px]' : 'px-2.5 py-1.5 text-xs'
                }`}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
