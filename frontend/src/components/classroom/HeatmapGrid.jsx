import React from 'react';

export default function HeatmapGrid({ data }) {
  // data is expected to be an array of objects: { studentName, errors: { decomposition, abstraction, pattern, algorithm } }
  
  const getHeatmapColor = (errorCount) => {
    if (errorCount === 0) return 'bg-[#10B981]'; // Green (No errors)
    if (errorCount <= 2) return 'bg-[#FACC15]'; // Yellow (Minor errors)
    return 'bg-[#EC4899]'; // Pink/Red (High errors)
  };

  if (!data || data.length === 0) {
    return <div className="text-sm font-nunito p-4 border-2 border-dashed border-gray-400 rounded">Tidak ada data untuk heatmap.</div>;
  }

  return (
    <div className="overflow-x-auto border-2 border-[#0F172A] rounded-xl shadow-[4px_4px_0px_#0F172A] bg-white">
      <table className="w-full text-left font-nunito border-collapse">
        <thead className="bg-[#E0F2FE] border-b-2 border-[#0F172A]">
          <tr>
            <th className="p-3 font-bold text-[#0F172A] border-r-2 border-[#0F172A]">Nama Siswa</th>
            <th className="p-3 font-bold text-center border-r-2 border-[#0F172A]">Dekomposisi</th>
            <th className="p-3 font-bold text-center border-r-2 border-[#0F172A]">Abstraksi</th>
            <th className="p-3 font-bold text-center border-r-2 border-[#0F172A]">Pola</th>
            <th className="p-3 font-bold text-center">Algoritma</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} className="border-b-2 border-[#0F172A] last:border-b-0 hover:bg-gray-50">
              <td className="p-3 font-bold border-r-2 border-[#0F172A]">{row.studentName}</td>
              <td className={`p-3 border-r-2 border-[#0F172A] ${getHeatmapColor(row.errors?.decomposition)} transition-colors`}>
                <div className="text-center font-bold text-white text-shadow-sm">{row.errors?.decomposition || 0}</div>
              </td>
              <td className={`p-3 border-r-2 border-[#0F172A] ${getHeatmapColor(row.errors?.abstraction)} transition-colors`}>
                <div className="text-center font-bold text-white text-shadow-sm">{row.errors?.abstraction || 0}</div>
              </td>
              <td className={`p-3 border-r-2 border-[#0F172A] ${getHeatmapColor(row.errors?.pattern)} transition-colors`}>
                <div className="text-center font-bold text-white text-shadow-sm">{row.errors?.pattern || 0}</div>
              </td>
              <td className={`p-3 ${getHeatmapColor(row.errors?.algorithm)} transition-colors`}>
                <div className="text-center font-bold text-white text-shadow-sm">{row.errors?.algorithm || 0}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
