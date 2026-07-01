import React from 'react';

export default function InsightCard({ type = 'info', title, description, recommendation }) {
  // Types: info, warning, success
  const configs = {
    info: {
      bg: 'bg-blue-50',
      border: 'border-[#3B82F6]',
      icon: 'lightbulb',
      iconColor: 'text-[#3B82F6]'
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-[#FACC15]',
      icon: 'warning',
      iconColor: 'text-yellow-600'
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-[#10B981]',
      icon: 'check_circle',
      iconColor: 'text-[#10B981]'
    }
  };

  const config = configs[type] || configs.info;

  return (
    <div className={`neo-card ${config.bg} p-4 border-l-8 ${config.border} flex flex-col sm:flex-row gap-4 items-start`}>
      <div className={`p-2 bg-white rounded border-2 border-[#0F172A] shadow-sm ${config.iconColor}`}>
        <span className="material-symbols-rounded text-2xl">{config.icon}</span>
      </div>
      <div className="flex-1">
        <h4 className="font-fredoka text-lg font-bold text-[#0F172A] mb-1">{title}</h4>
        <p className="font-nunito text-sm text-gray-700 font-semibold mb-3">{description}</p>
        
        {recommendation && (
          <div className="bg-white p-3 rounded border-2 border-dashed border-[#0F172A]">
            <span className="text-xs font-bold text-[#3B82F6] uppercase tracking-wider mb-1 block">Rekomendasi Tindakan</span>
            <p className="font-nunito text-sm text-[#0F172A]">{recommendation}</p>
          </div>
        )}
      </div>
    </div>
  );
}
