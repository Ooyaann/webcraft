import React from 'react';
import { useStore } from '../../store/useStore';
import KanvasItem from './KanvasItem';

export default function Kanvas({ isCompact = false }) {
  const { ast, resetWorkspace } = useStore();

  const handleReset = () => {
    if (window.confirm("Apakah Anda yakin ingin mengosongkan area kerja? Semua pekerjaan Anda saat ini akan hilang.")) {
      resetWorkspace();
    }
  };

  return (
    <div className={`bg-white h-full flex flex-col overflow-y-auto text-left ${isCompact ? 'p-2 gap-2' : 'p-4 gap-4'}`}>
      {/* Canvas Header */}
      <div className={`flex justify-between items-center border-b-2 border-slate-200 ${isCompact ? 'pb-1' : 'pb-2'}`}>
        <div>
          <h3 className={`font-fredoka font-bold text-[#0F172A] flex items-center gap-1.5 ${isCompact ? 'text-[10px]' : 'text-base'}`}>
            <i className={`ti ti-stack-2 text-[#10B981] font-bold ${isCompact ? 'text-xs' : ''}`} />
            Struktur Kanvas
          </h3>
          {!isCompact && <p className="font-nunito text-[10px] text-slate-500 font-bold leading-none mt-1">
            Susun elemen web Anda dengan susunan bersarang (nesting) di bawah ini.
          </p>}
        </div>
      </div>

      {/* AST Render Area */}
      <div className="flex-1 overflow-y-auto pr-1">
        {ast && ast.length > 0 ? (
          ast.map(rootNode => (
            <KanvasItem key={rootNode.id} node={rootNode} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <i className="ti ti-alert-triangle text-4xl mb-2" />
            <p className="font-fredoka text-sm">Kanvas kosong. Silakan muat ulang atau klik reset!</p>
          </div>
        )}
      </div>
    </div>
  );
}
