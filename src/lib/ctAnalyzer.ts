// Port dari backend/app/services/ct_analyzer.py — profil CT heuristik
// dari riwayat percobaan coding.

export type CTAnalysis = {
  decomposition: number;
  pattern_recognition: number;
  abstraction: number;
  algorithm_design: number;
  composite_score?: number;
  narrative: string;
};

export function analyzeAttemptHistory(attempts: unknown[]): CTAnalysis {
  const totalAttempts = attempts?.length ?? 0;
  if (totalAttempts === 0) {
    return {
      decomposition: 80,
      pattern_recognition: 75,
      abstraction: 80,
      algorithm_design: 75,
      narrative: "Belum ada percobaan coding yang terekam.",
    };
  }

  const efficiency = Math.max(60, 100 - totalAttempts * 7);
  const decomp = 85;
  const pattern = 80;
  const abstract = 85;
  const algo = Math.trunc((decomp + pattern + abstract + efficiency) / 4);

  return {
    decomposition: decomp,
    pattern_recognition: pattern,
    abstraction: abstract,
    algorithm_design: algo,
    composite_score: algo,
    narrative:
      `Siswa menyelesaikan tantangan dengan total ${totalAttempts} kali percobaan. ` +
      "Proses pengerjaan menunjukkan alur debug terarah yang melatih logika pengurutan langkah (algoritma).",
  };
}
