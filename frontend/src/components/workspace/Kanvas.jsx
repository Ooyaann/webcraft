import React from 'react';
import { useStore } from '../../store/useStore';
import KanvasItem from './KanvasItem';

export default function Kanvas() {
  const { ast, resetWorkspace } = useStore();

  const handleReset = () => {
    if (window.confirm("Apakah Anda yakin ingin mengosongkan area kerja? Semua pekerjaan Anda saat ini akan hilang.")) {
      resetWorkspace();
    }
  };

  return (
    <div className="bg-white p-4 h-full flex flex-col gap-4 overflow-y-auto text-left">
      {/* Canvas Header */}
      <div className="flex justify-between items-center pb-2 border-b-2 border-slate-200">
        <div>
          <h3 className="font-fredoka text-base font-bold text-[#0F172A] flex items-center gap-1.5">
            <i className="ti ti-stack-2 text-[#10B981] font-bold" />
            Struktur Kanvas
          </h3>
          <p className="font-nunito text-[10px] text-slate-500 font-bold leading-none mt-1">
            Susun elemen web Anda dengan susunan bersarang (nesting) di bawah ini.
          </p>
        </div>
        
        <button
          onClick={handleReset}
          className="px-2.5 py-1 bg-red-50 hover:bg-red-100 border-2 border-[#0F172A] text-red-750 font-fredoka font-bold text-[10px] rounded shadow-[1.5px_1.5px_0px_#0F172A] hover:-translate-y-0.5 active:translate-y-[1px] cursor-pointer transition-all flex items-center gap-1"
          title="Reset Kanvas"
        >
          <i className="ti ti-rotate-clockwise text-xs" />
          Reset
        </button>
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
