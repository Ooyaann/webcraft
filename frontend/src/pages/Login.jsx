import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import api from '../services/api';
import WebCraftLogo from '../components/common/WebCraftLogo';

export default function Login() {
  const navigate = useNavigate();
  const { setUser, setActiveRoom, resetWorkspace } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [role, setRole] = useState('siswa');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setErrorMsg('');

    try {
      const response = await api.post('/auth/login', {
        email,
        password
      });

      const { access_token, user: userData } = response.data;

      // Prevent role mismatch
      if (userData.role !== role) {
        throw new Error(`Akun Anda terdaftar sebagai ${userData.role === 'guru' ? 'Guru' : 'Siswa'}. Pastikan Anda memilih Peran yang sesuai di atas.`);
      }

      localStorage.setItem('webcraft_token', access_token);

      // Clean workspace to prevent state leakage
      resetWorkspace();

      setUser({
        id: userData.id,
        name: userData.name,
        role: userData.role,
        email: userData.email
      });

      // Fetch actual classrooms joined by the student dynamically
      if (userData.role === 'siswa') {
        try {
          const roomsRes = await api.get('/rooms');
          const list = roomsRes.data || [];
          if (list.length > 0) {
            setActiveRoom(list[0]);
          } else {
            setActiveRoom(null);
          }
        } catch (e) {
          console.error("Gagal memuat kelas siswa:", e);
          setActiveRoom(null);
        }
      } else {
        setActiveRoom(null);
      }

      navigate('/');
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err.message ||
        err.response?.data?.detail ||
        "Gagal masuk. Periksa kembali alamat email dan kata sandi Anda."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-[90vh] py-8 px-4 flex items-center justify-center max-w-[1100px] mx-auto relative z-10 neo-section">
      {/* Decorative Grid & Shapes in login background */}
      <div className="absolute inset-0 bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] [background-size:20px_20px] opacity-50 pointer-events-none -z-10" />
      
      {/* Additional floating design items at the back */}
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-pastel-yellow opacity-40 rounded-full blur-2xl pointer-events-none -z-10 animate-pulse" />
      <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-pastel-peach opacity-40 rounded-full blur-2xl pointer-events-none -z-10 animate-pulse" />

      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch relative z-10">

        {/* Left Column: Visual branding and interactive animated mockups */}
        <div className={`lg:col-span-5 flex flex-col justify-between p-6 md:p-8 bg-gradient-to-br ${role === 'siswa' ? 'from-blue-600 to-indigo-700' : 'from-pink-600 to-rose-700'} text-white rounded-3xl border-4 border-[#0F172A] shadow-[8px_8px_0px_#0F172A] text-left relative overflow-hidden transition-all duration-500`}>
          <div className="absolute right-0 bottom-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -mr-10 -mb-10 pointer-events-none" />

          <div className="relative z-10 h-full flex flex-col justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <WebCraftLogo className="w-10 h-10" />
                <span className="font-fredoka text-xl font-black text-white tracking-wide">WebCraft</span>
              </div>

              <h2 className="font-fredoka text-2xl md:text-3xl font-bold text-white mb-3 leading-tight">
                {role === 'siswa' ? 'Ayo Masuk & Eksplor WebCraft!' : 'Selamat Datang, Bapak/Ibu Guru!'}
              </h2>
              <p className="font-nunito text-xs text-white/80 font-semibold leading-relaxed">
                {role === 'siswa' 
                  ? 'Kembangkan kemampuan coding web visualmu bersama teman kelas dan dipandu Asisten Tutor pintar!'
                  : 'Pantau keaktifan belajar siswa, berikan umpan balik instan, dan tinjau perkembangan berpikir komputasional mereka.'}
              </p>
            </div>

            {/* Interactive Animated SVG Mockup based on active role */}
            <div className="flex-1 flex items-center justify-center py-4">
              {role === 'siswa' ? (
                // Student Coding Workspace Mockup
                <div className="w-full max-w-[240px] bg-slate-900 border-4 border-[#0F172A] rounded-2xl p-3.5 shadow-[4px_4px_0px_#0F172A] relative flex flex-col gap-2.5">
                  {/* Mock browser dots */}
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-400 border border-slate-700" />
                    <span className="w-2 h-2 rounded-full bg-yellow-400 border border-slate-700" />
                    <span className="w-2 h-2 rounded-full bg-green-400 border border-slate-700" />
                  </div>
                  {/* Floating AST blocks inside browser */}
                  <div className="bg-blue-600/20 border border-blue-500 rounded-lg p-1.5 text-[9px] font-mono text-blue-300 font-bold flex justify-between items-center animate-bounce-slow">
                    <span>📦 {"<body>"}</span>
                    <i className="ti ti-check" />
                  </div>
                  <div className="ml-4 bg-emerald-500/20 border border-emerald-400 rounded-lg p-1.5 text-[9px] font-mono text-emerald-350 font-bold flex justify-between items-center animate-pulse">
                    <span>📝 {"<h1>"}</span>
                    <i className="ti ti-sparkles" />
                  </div>
                  {/* Small rocket illustration at bottom corner */}
                  <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-yellow-300 border-2 border-[#0F172A] rounded-xl flex items-center justify-center text-xl shadow-[2px_2px_0px_#0F172A] animate-float-symbol">
                    🚀
                  </div>
                </div>
              ) : (
                // Teacher Gradebook / Star rating Mockup
                <div className="w-full max-w-[240px] bg-white border-4 border-[#0F172A] rounded-2xl p-4 shadow-[4px_4px_0px_#0F172A] text-slate-800 flex flex-col gap-3 relative">
                  {/* Mock Stats bar */}
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-pink-100 border border-[#0F172A] flex items-center justify-center text-pink-600"><i className="ti ti-award text-lg" /></div>
                    <span className="font-fredoka text-[11px] font-bold text-slate-700">Analitik Siswa</span>
                  </div>
                  {/* Rating items */}
                  <div className="flex flex-col gap-1.5">
                    <div className="w-full bg-slate-100 border border-[#0F172A] h-2.5 rounded-full overflow-hidden">
                      <div className="bg-pink-500 h-full animate-loading-bar" style={{ width: '85%' }} />
                    </div>
                    <div className="w-full bg-slate-100 border border-[#0F172A] h-2.5 rounded-full overflow-hidden">
                      <div className="bg-blue-500 h-full" style={{ width: '70%' }} />
                    </div>
                  </div>
                  {/* Star Badge floating */}
                  <div className="absolute -top-3 -right-3 w-10 h-10 bg-yellow-300 border-2 border-[#0F172A] rounded-full flex items-center justify-center text-lg shadow-[2px_2px_0px_#0F172A] animate-bounce-slow">
                    ⭐
                  </div>
                </div>
              )}
            </div>

            <div className="text-[10px] font-bold text-white/50 text-center uppercase tracking-wider">
              WebCraft v1.0.0
            </div>
          </div>
        </div>

        {/* Right Column: Login Form */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          <div className="w-full neo-card bg-white flex flex-col p-6 md:p-8 border-4 border-[#0F172A] shadow-[8px_8px_0px_#0F172A]">
            <h3 className="font-fredoka text-2xl font-bold text-[#0F172A] flex items-center justify-center gap-2 mb-6 border-b-2 border-dashed border-[#0F172A] pb-3">
              <i className="ti ti-login text-2xl text-blue-600 font-bold" />
              Masuk ke Platform
            </h3>

            {/* Visual Role Selector Toggle */}
            <div className="flex border-2 border-[#0F172A] rounded-xl overflow-hidden mb-6 shadow-[2.5px_2.5px_0px_#0F172A]">
              <button
                type="button"
                id="siswa-toggle"
                onClick={() => {
                  setRole('siswa');
                  setEmail('');
                  setPassword('');
                }}
                className={`flex-1 py-2.5 font-fredoka text-xs font-bold transition-all cursor-pointer ${role === 'siswa'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
              >
                <i className="ti ti-user mr-1" />
                Siswa
              </button>
              <button
                type="button"
                id="guru-toggle"
                onClick={() => {
                  setRole('guru');
                  setEmail('');
                  setPassword('');
                }}
                className={`flex-1 py-2.5 font-fredoka text-xs font-bold transition-all cursor-pointer ${role === 'guru'
                    ? 'bg-pink-600 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
              >
                <i className="ti ti-school mr-1" />
                Guru
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border-2 border-red-500 rounded-xl text-xs font-nunito font-bold text-red-700 flex items-center gap-2">
                <i className="ti ti-alert-triangle text-base shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div className="text-left">
                <label className="font-fredoka font-bold text-[#0F172A] text-sm mb-1.5 block">Alamat Email</label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={role === 'siswa' ? "contoh: andi@siswa.com" : "contoh: budi@guru.com"}
                    className="peer w-full neo-input pl-11 text-sm relative z-0"
                    disabled={isLoading}
                    required
                  />
                  <span className={`absolute left-3.5 top-3.5 text-slate-400 z-10 pointer-events-none transition-all peer-focus:translate-x-[-1px] peer-focus:translate-y-[-1px] ${role === 'siswa' ? 'peer-focus:text-blue-650' : 'peer-focus:text-pink-650'}`}>
                    <i className="ti ti-mail text-lg" />
                  </span>
                </div>
              </div>

              <div className="text-left mb-2">
                <label className="font-fredoka font-bold text-[#0F172A] text-sm mb-1.5 block">Kata Sandi</label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi Anda..."
                    className="peer w-full neo-input pl-11 text-sm relative z-0"
                    disabled={isLoading}
                    required
                  />
                  <span className={`absolute left-3.5 top-3.5 text-slate-400 z-10 pointer-events-none transition-all peer-focus:translate-x-[-1px] peer-focus:translate-y-[-1px] ${role === 'siswa' ? 'peer-focus:text-blue-650' : 'peer-focus:text-pink-650'}`}>
                    <i className="ti ti-lock text-lg" />
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={!email || !password || isLoading}
                className={`w-full py-3 rounded-xl font-fredoka text-base font-bold flex items-center justify-center gap-2 transition-all border-2 border-[#0F172A] shadow-[4px_4px_0px_#0F172A] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#0F172A] active:translate-y-[2px] active:shadow-[1px_1px_0px_#0F172A] ${isLoading
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    : 'bg-[#FACC15] text-[#0F172A] cursor-pointer'
                  }`}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <i className="ti ti-loader animate-spin text-lg" />
                    Mengecek Data...
                  </span>
                ) : (
                  <>
                    <i className="ti ti-login text-lg" />
                    Masuk Sekarang
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 text-center">
              <p className="font-nunito text-xs text-slate-600 font-bold">
                Belum punya akun kelas?{' '}
                <span
                  onClick={() => navigate('/register')}
                  className="text-blue-600 hover:underline cursor-pointer font-bold animate-pulse"
                >
                  Daftar di sini
                </span>
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
