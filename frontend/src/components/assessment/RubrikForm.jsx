import React, { useState } from 'react';

export default function RubrikForm({ project, onSubmit, onCancel }) {
  const [scores, setScores] = useState({
    uiux: 0,
    kreativitas: 0,
    kesesuaian: 0
  });
  const [feedback, setFeedback] = useState('');

  const handleChange = (e) => {
    setScores({ ...scores, [e.target.name]: parseInt(e.target.value) || 0 });
  };

  const totalProductScore = Math.round((scores.uiux + scores.kreativitas + scores.kesesuaian) / 3);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      product_score: totalProductScore,
      rubric_details: scores,
      feedback: feedback
    });
  };

  return (
    <div className="neo-card bg-white p-6 max-w-lg mx-auto w-full">
      <h3 className="font-fredoka text-xl font-bold text-[#0F172A] mb-4">Penilaian Produk: {project.title}</h3>
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 font-nunito">
        <div className="bg-[#E0F2FE] p-4 rounded border-2 border-[#0F172A]">
          <div className="flex justify-between items-center mb-2">
            <label className="font-bold">UI/UX & Desain (0-100)</label>
            <input type="number" name="uiux" value={scores.uiux} onChange={handleChange} min="0" max="100" className="neo-input w-20 text-center py-1" />
          </div>
          
          <div className="flex justify-between items-center mb-2">
            <label className="font-bold">Kreativitas (0-100)</label>
            <input type="number" name="kreativitas" value={scores.kreativitas} onChange={handleChange} min="0" max="100" className="neo-input w-20 text-center py-1" />
          </div>
          
          <div className="flex justify-between items-center">
            <label className="font-bold">Kesesuaian Tema (0-100)</label>
            <input type="number" name="kesesuaian" value={scores.kesesuaian} onChange={handleChange} min="0" max="100" className="neo-input w-20 text-center py-1" />
          </div>
        </div>

        <div className="bg-yellow-100 p-4 rounded border-2 border-[#0F172A] flex justify-between items-center">
          <span className="font-fredoka font-bold text-lg">Skor Produk Akhir:</span>
          <span className="font-fredoka font-bold text-2xl text-[#3B82F6]">{totalProductScore}</span>
        </div>

        <div>
          <label className="block font-bold mb-1">Feedback Tambahan untuk Siswa</label>
          <textarea 
            value={feedback} 
            onChange={(e) => setFeedback(e.target.value)} 
            rows="3" 
            className="neo-input w-full"
            placeholder="Karyamu sangat bagus, perhatikan kontras warna ya..."
          ></textarea>
        </div>

        <div className="flex gap-3 justify-end mt-2">
          <button type="button" onClick={onCancel} className="neo-btn bg-gray-200 text-[#0F172A] px-4 py-2 rounded">Batal</button>
          <button type="submit" className="neo-btn bg-[#10B981] text-white px-6 py-2 rounded">Simpan Nilai</button>
        </div>
      </form>
    </div>
  );
}
