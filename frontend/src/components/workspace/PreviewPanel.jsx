import React, { useMemo, useState } from 'react';
import { useStore } from '../../store/useStore';
import { toHTML } from '../../services/astUtils';

export default function PreviewPanel() {
  const { ast } = useStore();
  const [viewport, setViewport] = useState('desktop'); // 'desktop' | 'mobile'

  const renderedHTML = useMemo(() => {
    // Generate inner body content
    const innerHTML = toHTML(ast);
    
    // Wrap inside a complete HTML page with basic styles to look nice
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: 'Nunito', sans-serif;
              margin: 0;
              padding: 1.5rem;
              background-color: #F8FAFC;
              color: #0F172A;
              transition: all 0.3s ease;
            }
            h1 {
              font-family: 'Fredoka', sans-serif;
              font-weight: 700;
              margin-top: 0;
            }
            ul {
              padding-left: 1.5rem;
            }
            li {
              margin-bottom: 0.5rem;
            }
          </style>
        </head>
        <body>
          ${innerHTML}
        </body>
      </html>
    `;
  }, [ast]);

  return (
    <div className="bg-white h-full flex flex-col gap-2 transition-all duration-300">
      {/* Mock Browser Header */}
      <div className="flex justify-between items-center pb-2 border-b-2 border-slate-200">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-red-400 border border-[#0F172A] rounded-full"></span>
          <span className="w-3 h-3 bg-yellow-400 border border-[#0F172A] rounded-full"></span>
          <span className="w-3 h-3 bg-green-400 border border-[#0F172A] rounded-full"></span>
          <span className="font-fredoka text-xs font-bold text-slate-500 ml-2">Pratinjau Hasil</span>
        </div>

        {/* Viewport controls */}
        <div className="flex items-center bg-slate-100 border-2 border-[#0F172A] rounded-lg p-0.5 shadow-[1.5px_1.5px_0px_#0F172A]">
          <button
            onClick={() => setViewport('desktop')}
            className={`p-1 rounded flex items-center justify-center cursor-pointer transition-all ${
              viewport === 'desktop' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-[#0F172A]'
            }`}
            title="Tampilan Desktop"
          >
            <i className="ti ti-device-desktop text-sm" />
          </button>
          <button
            onClick={() => setViewport('mobile')}
            className={`p-1 rounded flex items-center justify-center cursor-pointer transition-all ${
              viewport === 'mobile' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-[#0F172A]'
            }`}
            title="Tampilan Seluler"
          >
            <i className="ti ti-device-mobile text-sm" />
          </button>
        </div>

        <div className="hidden sm:block bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded text-[9px] font-fredoka font-bold text-slate-400">
          preview.webcraft.edu
        </div>
      </div>

      {/* Sandboxed iframe container */}
      <div className="flex-1 rounded-lg border-2 border-slate-200 bg-slate-100 overflow-hidden p-3 flex justify-center items-stretch">
        <div 
          className={`h-full bg-white border-2 border-[#0F172A] rounded-xl overflow-hidden transition-all duration-300 ${
            viewport === 'mobile' 
              ? 'w-[320px] shadow-[4px_4px_0px_#0F172A]' 
              : 'w-full'
          }`}
        >
          <iframe
            srcDoc={renderedHTML}
            sandbox="allow-scripts"
            title="WebCraft Sandbox Preview"
            className="w-full h-full border-0 bg-transparent"
          />
        </div>
      </div>
    </div>
  );
}
