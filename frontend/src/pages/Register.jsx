import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import WebCraftLogo from '../components/common/WebCraftLogo';

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('siswa'); // 'siswa' or 'guru'
  const [nisnNip, setNisnNip] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !nisnNip) return;

    if (role === 'siswa' && (!/^\d{10}$/.test(nisnNip))) {
      setErrorMsg("NISN harus tepat 10 digit angka.");
      return;
    }
    if (role === 'guru' && (!/^\d{18}$/.test(nisnNip))) {
      setErrorMsg("NIP harus tepat 18 digit angka.");
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await api.post('/auth/register', {
        name,
        email,
        password,
        role,
        nisn_nip: nisnNip
      });

      setSuccessMsg('Pendaftaran berhasil! Dialihkan ke halaman masuk dalam 2 detik...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err.response?.data?.detail ||
        "Pendaftaran gagal. Pastikan email belum terdaftar dan periksa input Anda."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-[90vh] py-8 px-4 flex items-center justify-center max-w-[1100px] mx-auto relative z-10 neo-section">
      {/* Decorative Grid & Shapes in register background */}
      <div className="absolute inset-0 bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] [background-size:20px_20px] opacity-50 pointer-events-none -z-10" />
      
      {/* Additional floating design items at the back */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-pastel-mint opacity-40 rounded-full blur-2xl pointer-events-none -z-10 animate-pulse" />
      <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-pastel-blue opacity-40 rounded-full blur-2xl pointer-events-none -z-10 animate-pulse" />

      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch relative z-10">

        {/* Left Column: Visual branding and interactive animated mockups */}
        <div className={`lg:col-span-5 flex flex-col justify-between p-6 md:p-8 bg-gradient-to-br ${role === 'siswa' ? 'from-emerald-500 to-teal-700' : 'from-indigo-600 to-purple-700'} text-white rounded-3xl border-4 border-[#0F172A] shadow-[8px_8px_0px_#0F172A] text-left relative overflow-hidden transition-all duration-500`}>
          <div className="absolute right-0 bottom-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -mr-10 -mb-10 pointer-events-none" />

          <div className="relative z-10 h-full flex flex-col justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <WebCraftLogo className="w-10 h-10" />
                <span className="font-fredoka text-xl font-black text-white tracking-wide">WebCraft</span>
              </div>

              <h2 className="font-fredoka text-2xl md:text-3xl font-bold text-white mb-3 leading-tight">
                Bergabung di Kelas Belajar WebCraft
              </h2>
              <p className="font-nunito text-xs text-white/85 font-semibold leading-relaxed">
                {role === 'siswa' 
                  ? 'Akses materi pembelajaran coding web visual berbasis computational thinking secara gratis!'
                  : 'Kelola ruang kelas, buat pertemuan belajar berbasis CBL, dan evaluasi hasil latihan praktis siswa.'}
              </p>
            </div>

            {/* Interactive Animated SVG Mockup based on active role */}
            <div className="flex-1 flex items-center justify-center py-4">
              {role === 'siswa' ? (
                // Student Workspace Preview mockup
                <div className="w-full max-w-[240px] bg-slate-900 border-4 border-[#0F172A] rounded-2xl p-3.5 shadow-[4px_4px_0px_#0F172A] relative flex flex-col gap-2.5">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-400 border border-slate-700" />
                    <span className="w-2 h-2 rounded-full bg-yellow-400 border border-slate-700" />
                    <span className="w-2 h-2 rounded-full bg-green-400 border border-slate-700" />
                  </div>
                  <div className="bg-emerald-500/20 border border-emerald-400 rounded-lg p-1.5 text-[9px] font-mono text-emerald-300 font-bold flex justify-between items-center animate-bounce-slow">
                    <span>📦 {"<body>"}</span>
                    <i className="ti ti-check" />
                  </div>
                  <div className="ml-4 bg-teal-500/20 border border-teal-400 rounded-lg p-1.5 text-[9px] font-mono text-teal-350 font-bold flex justify-between items-center animate-pulse">
                    <span>📝 {"<h1>"}</span>
                    <i className="ti ti-plus" />
                  </div>
                  <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-yellow-300 border-2 border-[#0F172A] rounded-xl flex items-center justify-center text-xl shadow-[2px_2px_0px_#0F172A] animate-float-symbol">
                    🚀
                  </div>
                </div>
              ) : (
                // Teacher classroom / progress bars mockup
                <div className="w-full max-w-[240px] bg-white border-4 border-[#0F172A] rounded-2xl p-4 shadow-[4px_4px_0px_#0F172A] text-slate-800 flex flex-col gap-3 relative">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 border border-[#0F172A] flex items-center justify-center text-indigo-600"><i className="ti ti-school text-lg" /></div>
                    <span className="font-fredoka text-[11px] font-bold text-slate-700">Panel Guru</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="w-full bg-slate-100 border border-[#0F172A] h-2.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full animate-loading-bar" style={{ width: '90%' }} />
                    </div>
                    <div className="w-full bg-slate-100 border border-[#0F172A] h-2.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full" style={{ width: '75%' }} />
                    </div>
                  </div>
                  <div className="absolute -top-3 -right-3 w-10 h-10 bg-yellow-300 border-2 border-[#0F172A] rounded-full flex items-center justify-center text-lg shadow-[2px_2px_0px_#0F172A] animate-bounce-slow">
                    🎓
                  </div>
                </div>
              )}
            </div>

            <div className="text-[10px] font-bold text-white/50 text-center uppercase tracking-wider">
              WebCraft v1.0.0
            </div>
          </div>
        </div>

        {/* Right Column: Register Form */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          <div className="w-full neo-card bg-white flex flex-col p-6 md:p-8 border-4 border-[#0F172A] shadow-[8px_8px_0px_#0F172A]">
            <h3 className="font-fredoka text-2xl font-bold text-[#0F172A] flex items-center justify-center gap-2 mb-6 border-b-2 border-dashed border-[#0F172A] pb-3">
              <i className="ti ti-user-plus text-2xl text-emerald-600 font-bold" />
              Formulir Pendaftaran
            </h3>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border-2 border-red-500 rounded-xl text-xs font-nunito font-bold text-red-700 flex items-center gap-2">
                <i className="ti ti-alert-triangle text-base shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 bg-emerald-50 border-2 border-emerald-500 rounded-xl text-xs font-nunito font-bold text-emerald-700 flex items-center gap-2 animate-pulse">
                <i className="ti ti-circle-check text-base shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleRegister} className="flex flex-col gap-4">
              <div className="text-left">
                <label className="font-fredoka font-bold text-[#0F172A] text-sm mb-1.5 block">Nama Lengkap</label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Masukkan nama lengkap Anda..."
                    className="peer w-full neo-input pl-11 text-sm relative z-0"
                    disabled={isLoading || successMsg}
                    required
                  />
                  <span className={`absolute left-3.5 top-3.5 text-slate-400 z-10 pointer-events-none transition-all peer-focus:translate-x-[-1px] peer-focus:translate-y-[-1px] ${role === 'siswa' ? 'peer-focus:text-emerald-600' : 'peer-focus:text-indigo-600'}`}>
                    <i className="ti ti-user text-lg" />
                  </span>
                </div>
              </div>

              <div className="text-left">
                <label className="font-fredoka font-bold text-[#0F172A] text-sm mb-1.5 block">Alamat Email</label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contoh: budi@siswa.com"
                    className="peer w-full neo-input pl-11 text-sm relative z-0"
                    disabled={isLoading || successMsg}
                    required
                  />
                  <span className={`absolute left-3.5 top-3.5 text-slate-400 z-10 pointer-events-none transition-all peer-focus:translate-x-[-1px] peer-focus:translate-y-[-1px] ${role === 'siswa' ? 'peer-focus:text-emerald-600' : 'peer-focus:text-indigo-600'}`}>
                    <i className="ti ti-mail text-lg" />
                  </span>
                </div>
              </div>

              <div className="text-left">
                <label className="font-fredoka font-bold text-[#0F172A] text-sm mb-1.5 block">Kata Sandi</label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Buat kata sandi Anda..."
                    className="peer w-full neo-input pl-11 text-sm relative z-0"
                    disabled={isLoading || successMsg}
                    required
                  />
                  <span className={`absolute left-3.5 top-3.5 text-slate-400 z-10 pointer-events-none transition-all peer-focus:translate-x-[-1px] peer-focus:translate-y-[-1px] ${role === 'siswa' ? 'peer-focus:text-emerald-600' : 'peer-focus:text-indigo-600'}`}>
                    <i className="ti ti-lock text-lg" />
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-left">
                  <label className="font-fredoka font-bold text-[#0F172A] text-sm mb-1.5 block">Peran Kelas</label>
                  <div className="relative select-none">
                    <div
                      id="role-dropdown-trigger"
                      onClick={() => !(isLoading || successMsg) && setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                      className={`w-full font-nunito font-bold p-2.5 bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] rounded-xl transition-all text-sm cursor-pointer flex justify-between items-center ${isLoading || successMsg ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                    >
                      <span>{role === 'siswa' ? 'Siswa' : 'Guru'}</span>
                      <i className={`ti ti-chevron-down text-base font-bold transition-transform duration-200 ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>
                    {isRoleDropdownOpen && (
                      <>
                        {/* Overlay to close on click outside */}
                        <div className="fixed inset-0 z-40" onClick={() => setIsRoleDropdownOpen(false)} />
                        <div className="absolute left-0 right-0 top-full mt-2 bg-white border-2 border-[#0F172A] shadow-[4px_4px_0px_#0F172A] rounded-xl z-50 overflow-hidden flex flex-col">
                          <button
                            type="button"
                            id="role-siswa-btn"
                            onClick={() => {
                              setRole('siswa');
                              setNisnNip('');
                              setIsRoleDropdownOpen(false);
                            }}
                            className={`px-3.5 py-2.5 text-left font-nunito font-bold text-xs border-b border-dashed border-slate-100 transition-colors cursor-pointer w-full hover:bg-slate-100 ${role === 'siswa' ? 'bg-emerald-50 text-emerald-700' : 'text-[#0F172A]'
                              }`}
                          >
                            Siswa
                          </button>
                          <button
                            type="button"
                            id="role-guru-btn"
                            onClick={() => {
                              setRole('guru');
                              setNisnNip('');
                              setIsRoleDropdownOpen(false);
                            }}
                            className={`px-3.5 py-2.5 text-left font-nunito font-bold text-xs transition-colors cursor-pointer w-full hover:bg-slate-100 ${role === 'guru' ? 'bg-emerald-50 text-emerald-700' : 'text-[#0F172A]'
                              }`}
                          >
                            Guru
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-left">
                  <label className="font-fredoka font-bold text-[#0F172A] text-sm mb-1.5 block">
                    {role === 'siswa' ? 'NISN Siswa' : 'NIP Guru'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={nisnNip}
                      onChange={(e) => setNisnNip(e.target.value.replace(/\D/g, ''))}
                      placeholder={role === 'siswa' ? "10 digit NISN" : "18 digit NIP"}
                      maxLength={role === 'siswa' ? 10 : 18}
                      className="peer w-full neo-input pl-11 text-sm relative z-0"
                      disabled={isLoading || successMsg}
                      required
                    />
                    <span className={`absolute left-3.5 top-3.5 text-slate-400 z-10 pointer-events-none transition-all peer-focus:translate-x-[-1px] peer-focus:translate-y-[-1px] ${role === 'siswa' ? 'peer-focus:text-emerald-600' : 'peer-focus:text-indigo-600'}`}>
                      <i className="ti ti-id text-lg" />
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || successMsg}
                className={`w-full py-3 rounded-xl font-fredoka text-base font-bold flex items-center justify-center gap-2 transition-all border-2 border-[#0F172A] shadow-[4px_4px_0px_#0F172A] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#0F172A] active:translate-y-[2px] active:shadow-[1px_1px_0px_#0F172A] mt-2 ${isLoading || successMsg
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    : 'bg-[#10B981] text-white cursor-pointer'
                  }`}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <i className="ti ti-loader animate-spin text-lg" />
                    Mendaftarkan...
                  </span>
                ) : (
                  <>
                    <i className="ti ti-user-plus text-lg" />
                    Daftar Akun
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 text-center">
              <p className="font-nunito text-xs text-slate-600 font-bold">
                Sudah memiliki akun?{' '}
                <span
                  onClick={() => navigate('/login')}
                  className="text-blue-600 hover:underline cursor-pointer font-bold"
                >
                  Masuk di sini
                </span>
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
