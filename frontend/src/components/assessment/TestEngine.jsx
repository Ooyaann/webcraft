import React, { useState } from 'react';

export default function TestEngine({ questions, onComplete }) {
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState({});

  const currentQuestion = questions[currentQuestionIdx];
  const isLastQuestion = currentQuestionIdx === questions.length - 1;

  const handleSelectOption = (optionId) => {
    setAnswers({ ...answers, [currentQuestion.id]: optionId });
  };

  const handleNext = () => {
    if (!answers[currentQuestion.id]) {
      alert("Pilih jawaban terlebih dahulu!");
      return;
    }
    
    if (isLastQuestion) {
      // Calculate score and complete
      let score = 0;
      questions.forEach(q => {
        if (answers[q.id] === q.correctOptionId) {
          score += (100 / questions.length);
        }
      });
      onComplete(Math.round(score), answers);
    } else {
      setCurrentQuestionIdx(prev => prev + 1);
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full neo-card bg-white p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-fredoka text-xl font-bold text-[#0F172A]">Soal {currentQuestionIdx + 1} dari {questions.length}</h3>
        <div className="text-sm font-nunito font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full border-2 border-[#0F172A]">
          Sisa: {questions.length - currentQuestionIdx - 1}
        </div>
      </div>

      <div className="bg-[#E0F2FE] p-4 border-2 border-[#0F172A] rounded-xl shadow-[2px_2px_0px_#0F172A] mb-6">
        <p className="font-nunito font-bold text-lg text-[#0F172A]">{currentQuestion.text}</p>
        {currentQuestion.imageUrl && (
          <img src={currentQuestion.imageUrl} alt="Ilustrasi Soal" className="mt-4 max-w-full h-auto border-2 border-[#0F172A] rounded" />
        )}
      </div>

      <div className="flex flex-col gap-3 mb-6">
        {currentQuestion.options.map(option => {
          const isSelected = answers[currentQuestion.id] === option.id;
          return (
            <button
              key={option.id}
              onClick={() => handleSelectOption(option.id)}
              className={`text-left p-3 border-2 border-[#0F172A] rounded-lg font-nunito font-bold transition-transform hover:-translate-y-0.5 active:translate-y-0 relative overflow-hidden ${
                isSelected 
                  ? 'bg-[#FACC15] shadow-[2px_2px_0px_#0F172A]' 
                  : 'bg-white hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 border-[#0F172A] flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-white' : 'bg-transparent'}`}>
                  {isSelected && <div className="w-2.5 h-2.5 bg-[#0F172A] rounded-full"></div>}
                </div>
                <span>{option.text}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button 
          onClick={handleNext}
          className="neo-btn bg-[#3B82F6] text-white px-8 py-3 rounded-xl font-fredoka font-bold text-lg flex items-center gap-2"
        >
          {isLastQuestion ? 'Selesai & Kumpulkan' : 'Selanjutnya'}
          {!isLastQuestion && <span className="material-symbols-rounded">arrow_forward</span>}
          {isLastQuestion && <span className="material-symbols-rounded">done_all</span>}
        </button>
      </div>
    </div>
  );
}
