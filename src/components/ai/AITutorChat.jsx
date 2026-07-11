import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { aiService } from '../../services/aiService';

export default function AITutorChat() {
  const { ast, activeLevelConfig, attemptHistory, user } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'Halo! Saya adalah Tutor Cerdas WebCraft Anda. Mengalami kesulitan menyusun blok HTML? Ceritakan kendala Anda, mari kita cari solusinya bersama tanpa memberikan bocoran kode secara langsung!'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Proactive Nudge on 4th attempt
  useEffect(() => {
    if (attemptHistory.length === 4) {
      setIsOpen(true);
      const proactiveMsg = "Saya melihat Anda telah mencoba melakukan pengecekan beberapa kali namun susunan kodenya masih belum tepat. Mari kita periksa bersama! Bagian mana yang membuat Anda bingung?";
      if (!messages.some(m => m.text === proactiveMsg)) {
        setMessages(prev => [...prev, { sender: 'ai', text: proactiveMsg }]);
      }
    }
  }, [attemptHistory.length]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Limit questions for anonymous public users to 3
    const isAnonymous = !user;
    const userMsgCount = messages.filter(m => m.sender === 'user').length;
    if (isAnonymous && userMsgCount >= 3) {
      setMessages(prev => [
        ...prev,
        { sender: 'user', text: inputValue.trim() },
        { sender: 'ai', text: 'Batas pertanyaan uji coba gratis telah habis. Silakan daftarkan atau masuk ke akun sekolah Anda untuk melanjutkan belajar bersama AI Tutor!' }
      ]);
      setInputValue('');
      return;
    }

    const userMessage = inputValue.trim();
    setMessages(prev => [...prev, { sender: 'user', text: userMessage }]);
    setInputValue('');
    setIsTyping(true);

    try {
      const hint = await aiService.getTutorHint({
        currentAST: ast,
        targetRules: activeLevelConfig?.validator_rules || [],
        attemptHistory: attemptHistory,
        studentMessage: userMessage,
        lessonContext: activeLevelConfig?.judul || 'HTML & CSS Dasar',
        conversationHistory: messages.map(m => ({ role: m.sender, content: m.text }))
      });

      setMessages(prev => [...prev, { sender: 'ai', text: hint }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { sender: 'ai', text: "Maaf, koneksi saya sedang mengalami gangguan. Pastikan blok wadah body dan tag heading h1 Anda sudah tersusun di kanvas!" }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleGetQuickHint = async () => {
    const isAnonymous = !user;
    const userMsgCount = messages.filter(m => m.sender === 'user').length;
    if (isAnonymous && userMsgCount >= 3) {
      setMessages(prev => [
        ...prev,
        { sender: 'ai', text: 'Batas pertanyaan uji coba gratis telah habis. Silakan daftarkan atau masuk ke akun sekolah Anda untuk melanjutkan belajar bersama AI Tutor!' }
      ]);
      return;
    }

    setIsTyping(true);
    try {
      const hint = await aiService.getTutorHint({
        currentAST: ast,
        targetRules: activeLevelConfig?.validator_rules || [],
        attemptHistory: attemptHistory,
        studentMessage: "Tolong berikan saya petunjuk umum untuk menyelesaikan misi ini.",
        lessonContext: activeLevelConfig?.judul || 'HTML & CSS Dasar',
        conversationHistory: messages.map(m => ({ role: m.sender, content: m.text }))
      });

      setMessages(prev => [...prev, { sender: 'ai', text: hint }]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickQuestion = async (questionText) => {
    const isAnonymous = !user;
    const userMsgCount = messages.filter(m => m.sender === 'user').length;
    if (isAnonymous && userMsgCount >= 3) {
      setMessages(prev => [
        ...prev,
        { sender: 'user', text: questionText },
        { sender: 'ai', text: 'Batas pertanyaan uji coba gratis telah habis. Silakan daftarkan atau masuk ke akun sekolah Anda untuk melanjutkan belajar bersama AI Tutor!' }
      ]);
      return;
    }

    setMessages(prev => [...prev, { sender: 'user', text: questionText }]);
    setIsTyping(true);
    try {
      const hint = await aiService.getTutorHint({
        currentAST: ast,
        targetRules: activeLevelConfig?.validator_rules || [],
        attemptHistory: attemptHistory,
        studentMessage: questionText,
        lessonContext: activeLevelConfig?.judul || 'HTML & CSS Dasar',
        conversationHistory: messages.map(m => ({ role: m.sender, content: m.text }))
      });

      setMessages(prev => [...prev, { sender: 'ai', text: hint }]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
      {/* Chat window */}
      {isOpen && (
        <div className="w-80 md:w-96 h-[75vh] max-h-[min(500px,calc(100vh-110px))] min-h-[240px] bg-white border-4 border-[#0F172A] rounded-2xl shadow-[6px_6px_0px_#0F172A] flex flex-col mb-4 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Chat Header */}
          <div className="bg-[#4F46E5] text-white border-b-4 border-[#0F172A] px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="bg-white border-2 border-[#0F172A] w-7 h-7 rounded-full flex items-center justify-center text-[#4F46E5]">
                <i className="ti ti-robot font-bold text-base" />
              </div>
              <div className="text-left leading-none">
                <h4 className="font-fredoka text-sm font-bold flex items-center gap-1.5">
                  Asisten Tutor WebCraft
                  <span className="bg-indigo-150 text-indigo-700 border border-indigo-300 px-1.5 py-0.5 rounded text-[8px] font-bold">
                    <i className="ti ti-sparkles mr-0.5" />
                    AI
                  </span>
                </h4>
                <p className="font-nunito text-[9px] font-bold text-indigo-200 uppercase tracking-wider mt-1">Pendamping CT Siswa</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-indigo-200 cursor-pointer"
            >
              <i className="ti ti-x text-lg font-bold" />
            </button>
          </div>

          {/* Quick actions bar */}
          <div className="bg-indigo-50/50 border-b-2 border-[#0F172A] p-2 flex justify-start">
            <button
              onClick={handleGetQuickHint}
              disabled={isTyping}
              className="px-3 py-1 bg-white border-2 border-[#0F172A] hover:bg-indigo-100 font-fredoka font-bold text-[10px] rounded-lg shadow-[1.5px_1.5px_0px_#0F172A] hover:-translate-y-0.5 active:translate-y-[0.5px] cursor-pointer flex items-center gap-1 transition-all text-[#0F172A]"
            >
              <i className="ti ti-help-circle text-indigo-650 text-xs" />
              Minta Petunjuk Langkah
            </button>
          </div>

          {/* Messages List */}
          <div className="flex-1 p-4 overflow-y-auto bg-slate-50 flex flex-col gap-3 text-left">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2.5 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                  }`}
              >
                {msg.sender === 'ai' && (
                  <div className="w-6 h-6 rounded-full bg-indigo-50 border border-[#0F172A] flex items-center justify-center shrink-0 text-indigo-600">
                    <i className="ti ti-bulb text-xs" />
                  </div>
                )}
                <div
                  className={`p-2.5 rounded-xl border-2 border-[#0F172A] text-xs font-nunito font-bold leading-normal shadow-[2px_2px_0px_#0F172A] ${msg.sender === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border-indigo-200 text-[#0F172A]'
                    }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2.5 max-w-[85%] mr-auto">
                <div className="w-6 h-6 rounded-full bg-indigo-50 border border-[#0F172A] flex items-center justify-center shrink-0 text-indigo-600 animate-bounce">
                  <i className="ti ti-bulb text-xs" />
                </div>
                <div className="p-2.5 rounded-xl border-2 border-[#0F172A] text-xs font-nunito font-bold leading-normal bg-white text-gray-400 flex items-center gap-1">
                  <span>Asisten sedang mengetik</span>
                  <span className="animate-pulse">...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="px-3 py-2 bg-slate-100 border-t-2 border-slate-200 flex flex-wrap gap-1.5 justify-start">
            <button
              type="button"
              onClick={() => handleQuickQuestion("Kenapa kanvas saya masih kosong?")}
              disabled={isTyping}
              className="px-2 py-1 bg-white border-2 border-[#0F172A] hover:bg-indigo-50 font-fredoka text-[9px] font-bold rounded-lg cursor-pointer transition-all shadow-[1px_1px_0px_#0F172A] active:translate-y-[0.5px] active:shadow-none text-[#0F172A]"
            >
              Kanvas Kosong?
            </button>
            <button
              type="button"
              onClick={() => handleQuickQuestion("Bagaimana cara memasukkan elemen ke dalam body?")}
              disabled={isTyping}
              className="px-2 py-1 bg-white border-2 border-[#0F172A] hover:bg-indigo-50 font-fredoka text-[9px] font-bold rounded-lg cursor-pointer transition-all shadow-[1px_1px_0px_#0F172A] active:translate-y-[0.5px] active:shadow-none text-[#0F172A]"
            >
              Nesting H1?
            </button>
            <button
              type="button"
              onClick={() => handleQuickQuestion("Bagaimana mengubah warna latar belakang dengan blok style?")}
              disabled={isTyping}
              className="px-2 py-1 bg-white border-2 border-[#0F172A] hover:bg-indigo-50 font-fredoka text-[9px] font-bold rounded-lg cursor-pointer transition-all shadow-[1px_1px_0px_#0F172A] active:translate-y-[0.5px] active:shadow-none text-[#0F172A]"
            >
              Style CSS?
            </button>
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} className="border-t-2 border-[#0F172A] p-2 bg-white flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Tanyakan kesulitan pengerjaan Anda..."
              className="flex-1 px-3 py-2 bg-slate-50 border-2 border-[#0F172A] rounded-xl text-xs font-nunito font-bold focus:outline-none"
              disabled={isTyping}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              className="bg-[#FACC15] border-2 border-[#0F172A] p-2 rounded-xl flex items-center justify-center shadow-[1.5px_1.5px_0px_#0F172A] hover:-translate-y-0.5 active:translate-y-[0.5px] cursor-pointer"
            >
              <i className="ti ti-send text-base font-bold" />
            </button>
          </form>
        </div>
      )}

      {/* Launcher Bubble Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-[#4F46E5] text-white border-4 border-[#0F172A] rounded-full flex items-center justify-center shadow-[4px_4px_0px_#0F172A] hover:-translate-y-0.5 active:translate-y-[1px] active:shadow-none transition-all duration-150 cursor-pointer relative"
        title="Tanya AI Tutor"
      >
        <i className={`ti ${isOpen ? 'ti-x' : 'ti-bulb'} text-2xl font-bold`} />
        {!isOpen && (
          <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4.5 w-4.5 bg-blue-600 border border-white text-[8px] font-black text-white items-center justify-center">1</span>
          </span>
        )}
      </button>
    </div>
  );
}
