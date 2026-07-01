import React, { useMemo, useState } from 'react';
import { useStore } from '../../store/useStore';
import { toFormattedCode } from '../../services/astUtils';

export default function CodePanel() {
  const { ast } = useStore();
  const [copied, setCopied] = useState(false);

  const formattedCode = useMemo(() => {
    return toFormattedCode(ast);
  }, [ast]);

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#1E293B] text-slate-100 h-full flex flex-col gap-3 p-4 rounded-xl border-2 border-slate-700">
      {/* Code Header */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-700">
        <div className="flex items-center gap-1.5 text-slate-350">
          <i className="ti ti-code text-sm font-bold" />
          <span className="font-fredoka text-xs font-bold">Kode HTML / CSS Terkini</span>
        </div>
        
        <button
          onClick={handleCopy}
          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 font-fredoka font-bold text-[10px] rounded cursor-pointer transition-all flex items-center gap-1.5"
        >
          <i className={`ti ${copied ? 'ti-check' : 'ti-copy'} text-xs`} />
          {copied ? 'Disalin!' : 'Salin Kode'}
        </button>
      </div>

      {/* Code Display Area */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-4 overflow-auto text-left shadow-inner font-mono text-xs md:text-sm leading-relaxed text-emerald-450">
        <pre className="whitespace-pre-wrap font-mono">
          {formattedCode || '<!-- Kanvas kosong. Seret elemen dari palet untuk mulai. -->'}
        </pre>
      </div>
    </div>
  );
}
