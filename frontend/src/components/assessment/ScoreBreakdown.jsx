import React from 'react';

export default function ScoreBreakdown({ scoreData }) {
  if (!scoreData) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* CT Score Card */}
      <div className="neo-card bg-white p-4 border-t-8 border-t-[#3B82F6]">
        <h4 className="font-fredoka text-lg font-bold text-[#0F172A] mb-1">CT Score</h4>
        <p className="text-xs font-nunito font-semibold text-gray-500 mb-2 border-b-2 border-dashed border-gray-200 pb-2">Dari CT Journey & Analisis Proses</p>
        <div className="text-4xl font-fredoka font-bold text-[#3B82F6]">{scoreData.ct_score?.total || 0}</div>
        <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] font-bold">
          <div className="bg-gray-100 p-1 rounded">Dec: {scoreData.ct_score?.decomposition || 0}</div>
          <div className="bg-gray-100 p-1 rounded">Abs: {scoreData.ct_score?.abstraction || 0}</div>
          <div className="bg-gray-100 p-1 rounded">Pat: {scoreData.ct_score?.pattern_recognition || 0}</div>
          <div className="bg-gray-100 p-1 rounded">Alg: {scoreData.ct_score?.algorithm_design || 0}</div>
        </div>
      </div>

      {/* Process Score Card */}
      <div className="neo-card bg-white p-4 border-t-8 border-t-[#FACC15]">
        <h4 className="font-fredoka text-lg font-bold text-[#0F172A] mb-1">Process Score</h4>
        <p className="text-xs font-nunito font-semibold text-gray-500 mb-2 border-b-2 border-dashed border-gray-200 pb-2">Akurasi & Efisiensi Pengerjaan</p>
        <div className="text-4xl font-fredoka font-bold text-[#FACC15]">{scoreData.process_score?.total || 0}</div>
        <div className="mt-2 flex justify-between text-xs font-bold text-gray-600">
          <span>Akurasi: {scoreData.process_score?.accuracy || 0}%</span>
          <span>Attempts: {scoreData.process_score?.attempts || 0}</span>
        </div>
      </div>

      {/* Product Score Card */}
      <div className="neo-card bg-white p-4 border-t-8 border-t-[#10B981]">
        <h4 className="font-fredoka text-lg font-bold text-[#0F172A] mb-1">Product Score</h4>
        <p className="text-xs font-nunito font-semibold text-gray-500 mb-2 border-b-2 border-dashed border-gray-200 pb-2">Kualitas Hasil (Penilaian Guru)</p>
        <div className="text-4xl font-fredoka font-bold text-[#10B981]">{scoreData.product_score || 'N/A'}</div>
        <div className="mt-2 text-[11px] font-bold text-gray-600">
          Status: {scoreData.product_score ? 'Dinilai' : 'Menunggu Penilaian'}
        </div>
      </div>
    </div>
  );
}
