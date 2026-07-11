import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from '@/lib/router-compat';
import { useStore } from '../../store/useStore';
import api from '../../services/api';
import WebCraftLogo from '../common/WebCraftLogo';

const menuConfig = {
  guest: [
    { to: '/', icon: 'ti-home', label: 'Beranda' },
    { to: '/sandbox', icon: 'ti-flask', label: 'Buat Karya' },
  ],
  siswa: [
    { to: '/', icon: 'ti-home', label: 'Beranda' },
    { to: '/ruang-belajar', icon: 'ti-school', label: 'Ruang Belajar' },
    { to: '/galeri', icon: 'ti-photo-heart', label: 'Galeri Karya' },
    { to: '/tugasku', icon: 'ti-checklist', label: 'Tugasku' },
  ],
  guru: [
    { to: '/', icon: 'ti-home', label: 'Beranda' },
    { to: '/ruang-belajar', icon: 'ti-school', label: 'Ruang Belajar' },
    { to: '/galeri', icon: 'ti-photo-share', label: 'Galeri Karya' },
    { to: '/penilaian', icon: 'ti-chart-bar', label: 'Penilaian' },
  ],
};

// High-saturation vibrant background gradients for the sidebar itself
const sidebarGradients = {
  guest: 'linear-gradient(180deg, #FACC15 0%, #F59E0B 100%)', // Solid Vibrant Yellow-Orange
  siswa: 'linear-gradient(180deg, #3B82F6 0%, #6366F1 100%)', // Solid Vibrant Blue-Indigo
  guru: 'linear-gradient(180deg, #EC4899 0%, #F43F5E 100%)',  // Solid Vibrant Pink-Rose
};

// High-contrast active block styling configuration
const activeStyles = {
  guest: {
    bg: '#3B82F6', // Blue active block on yellow background
    text: 'text-white',
  },
  siswa: {
    bg: '#FACC15', // Bright Yellow active block on blue background
    text: 'text-[#0F172A]',
  },
  guru: {
    bg: '#FACC15', // Bright Yellow active block on pink background
    text: 'text-[#0F172A]',
  },
};

const profileCardBackgrounds = {
  guest: 'bg-white text-[#0F172A]',
  siswa: 'bg-[#FACC15] text-[#0F172A]', // Vibrant solid yellow for Student profile
  guru: 'bg-[#FACC15] text-[#0F172A]',  // Vibrant solid yellow for Teacher profile
};

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useStore();
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  const role = user?.role ?? 'guest';
  const items = menuConfig[role] || menuConfig.guest;
  const activeGradient = sidebarGradients[role] || sidebarGradients.guest;
  const activeStyle = activeStyles[role] || activeStyles.guest;
  const profileBg = profileCardBackgrounds[role] || profileCardBackgrounds.guest;

  // Check if sidebar text/icons should be light or dark based on background
  const isLightText = role === 'siswa' || role === 'guru';

  const handleLogout = async () => {
    // Cookie refresh dikirim otomatis; server mencabut token & menghapus cookie.
    try {
      await api.post('/auth/logout', {});
    } catch {
      // Abaikan kegagalan agar logout tetap berjalan.
    }
    logout();
    navigate('/');
    setIsOpenMobile(false);
  };

  const handleNavigate = (path) => {
    navigate(path);
    setIsOpenMobile(false);
  };

  // Hide sidebar on workspace page for full immersion
  const isWorkspacePage = location.pathname.startsWith('/workspace/') || location.pathname === '/sandbox';
  if (isWorkspacePage) return null;

  /* ─────────── Desktop: Always-expanded static sidebar (~180px) ─────────── */
  const desktopSidebar = (
    <aside
      className="fixed left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-start overflow-hidden"
      style={{
        width: '240px',
        height: '90vh',
        background: activeGradient,
        border: '4px solid #0F172A',
        borderRadius: '24px',
        padding: '20px 16px',
        gap: '8px',
        boxShadow: '4px 4px 0px #0F172A',
      }}
    >
      {/* Brand Logo — always visible with text */}
      <div
        className={`flex items-center cursor-pointer select-none pb-3 border-b-4 border-dashed w-full justify-start pl-1 gap-2.5 ${isLightText ? 'border-white/20' : 'border-[#0F172A]/20'}`}
        onClick={() => handleNavigate('/')}
      >
        <WebCraftLogo className="w-8 h-8 shrink-0" />
        <h1 className={`font-fredoka text-[14px] font-bold tracking-tight leading-none whitespace-nowrap ${isLightText ? 'text-white' : 'text-[#0F172A]'}`}>
          WebCraft
        </h1>
      </div>

      {/* Navigation list — labels always visible */}
      <nav className="flex-grow flex flex-col gap-2 w-full pt-3 overflow-y-auto overflow-x-hidden">
        {items.map((item) => {
          const isActive =
            item.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={null}
              className={`flex items-center rounded-xl font-nunito font-black text-[11px] w-full justify-start py-2 px-3 gap-2.5 ${isActive
                  ? `${activeStyle.text} border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]`
                  : isLightText
                    ? 'text-white/80 hover:bg-white/10 hover:text-white'
                    : 'text-[#0F172A]/70 hover:bg-black/5 hover:text-[#0F172A]'
                }`}
              style={
                isActive
                  ? { background: activeStyle.bg }
                  : {}
              }
            >
              <div className="shrink-0 flex items-center justify-center w-5">
                <i
                  className={`ti ${item.icon} text-[16px]`}
                  aria-hidden
                />
              </div>
              <span className="font-nunito font-black text-[10.5px] text-left uppercase tracking-wider leading-tight">
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>

      {/* User profile / Logout — always visible */}
      <div className={`border-t-4 border-dashed pt-3 w-full flex flex-col gap-2 ${isLightText ? 'border-white/20' : 'border-[#0F172A]/20'}`}>
        {user ? (
          <div
            className={`flex flex-col gap-2 rounded-xl overflow-hidden border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] w-full p-2 ${profileBg}`}
          >
            <div className="flex items-center w-full justify-start gap-2">
              <div
                className={`flex items-center justify-center w-7 h-7 rounded-full font-fredoka font-bold text-xs shrink-0 border-2 border-[#0F172A] text-white shadow-[1px_1px_0px_#0F172A] ${
                  role === 'siswa' ? 'bg-[#6366F1]' : 'bg-[#EC4899]'
                }`}
              >
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="font-nunito text-[10px] font-black leading-none text-[#0F172A] truncate">
                  {user.name}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full py-1.5 border-2 border-[#0F172A] bg-[#F43F5E] hover:bg-[#E11D48] text-white font-nunito text-[9px] font-black cursor-pointer shadow-[1px_1px_0px_#0F172A] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-1 rounded-lg"
            >
              <i className="ti ti-logout text-[10px]" />
              Keluar
            </button>
          </div>
        ) : (
          <button
            onClick={() => handleNavigate('/login')}
            className="w-full py-2 text-[#0F172A] border-2 border-[#0F172A] font-fredoka font-bold text-[11px] rounded-xl cursor-pointer flex justify-center items-center gap-1.5 active:translate-y-[0.5px] transition-all"
            style={{
              background: 'linear-gradient(135deg, #FACC15, #FDE68A)',
              boxShadow: '2px 2px 0px #0F172A',
            }}
          >
            <i className="ti ti-login text-sm" />
            Login
          </button>
        )}
      </div>
    </aside>
  );

  /* ─────────── Mobile: Header + Drawer (unchanged) ─────────── */
  const mobileHeader = (
    <header 
      className={`md:hidden w-full border-b-4 border-[#0F172A] px-4 py-3 flex justify-between items-center z-45 sticky top-0`}
      style={{ background: activeGradient }}
    >
      <div
        className="flex items-center gap-2 cursor-pointer select-none"
        onClick={() => handleNavigate('/')}
      >
        <WebCraftLogo className="w-8 h-8" />
        <h1 className={`font-fredoka text-base font-bold leading-none ${isLightText ? 'text-white' : 'text-[#0F172A]'}`}>
          WebCraft
        </h1>
      </div>

      <button
        onClick={() => setIsOpenMobile(!isOpenMobile)}
        className="p-1.5 border-2 border-[#0F172A] rounded-lg bg-white text-slate-800 cursor-pointer flex items-center justify-center hover:bg-slate-50 shadow-[2px_2px_0px_#0F172A] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all"
      >
        <i
          className={`ti ${isOpenMobile ? 'ti-x' : 'ti-menu-2'} text-lg`}
        />
      </button>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="fixed inset-0 top-[51px] w-full h-[calc(100vh-51px)] bg-black/40 backdrop-blur-sm z-50 flex">
          <div
            className="w-64 h-full p-5 flex flex-col justify-between border-r-4 border-[#0F172A] animate-slideInLeft"
            style={{
              background: activeGradient,
            }}
          >
            <div className="flex flex-col gap-6">
              {/* Brand in drawer */}
              <div className={`flex items-center gap-2 pb-4 border-b-4 border-dashed ${isLightText ? 'border-white/20' : 'border-[#0F172A]/20'}`}>
                <WebCraftLogo className="w-6 h-6" />
                <span className={`font-fredoka font-bold text-base ${isLightText ? 'text-white' : 'text-[#0F172A]'}`}>
                  WebCraft Menu
                </span>
              </div>
              {/* Menu list */}
              <nav className="flex flex-col gap-2">
                {items.map((item) => {
                  const isActive =
                    item.to === '/'
                      ? location.pathname === '/'
                      : location.pathname.startsWith(item.to);
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setIsOpenMobile(false)}
                      className={`flex items-center gap-3 py-2.5 px-4 rounded-xl font-nunito font-extrabold text-sm transition-all ${isActive
                        ? `${activeStyle.text} border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A]`
                        : isLightText
                          ? 'hover:bg-white/10 text-white/80 hover:text-white'
                          : 'hover:bg-black/5 text-[#0F172A]/70 hover:text-[#0F172A]'
                        }`}
                      style={
                        isActive
                          ? {
                              background: activeStyle.bg,
                            }
                          : {}
                      }
                    >
                      <i className={`ti ${item.icon} text-lg`} />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            {/* Profile / Logout in Drawer */}
            <div className={`border-t-4 border-dashed ${isLightText ? 'border-white/20' : 'border-[#0F172A]/20'} pt-4`}>
              {user ? (
                <div
                  className={`flex flex-col gap-3 p-3 rounded-xl border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] ${profileBg}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex items-center justify-center w-8 h-8 rounded-full font-fredoka font-bold text-sm border border-[#0F172A] bg-white text-[#0F172A]"
                      style={{
                        boxShadow: '1px 1px 0px #0F172A',
                      }}
                    >
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="font-nunito text-xs font-black leading-none text-[#0F172A] truncate">
                        {user.name}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full py-2 border-2 border-[#0F172A] bg-white hover:bg-red-50 hover:text-red-600 rounded-lg font-nunito text-xs font-bold text-slate-700 shadow-[2px_2px_0px_#0F172A] transition-all flex items-center justify-center gap-1.5"
                  >
                    <i className="ti ti-logout text-xs" />
                    Keluar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleNavigate('/login')}
                  className="w-full py-2.5 text-[#0F172A] border-2 border-[#0F172A] font-fredoka font-bold text-sm rounded-xl hover:-translate-y-0.5 active:translate-y-[0.5px] cursor-pointer flex justify-center items-center gap-1.5 transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #FACC15, #FDE68A)',
                    boxShadow: '3px 3px 0px #0F172A',
                  }}
                >
                  <i className="ti ti-login text-sm" />
                  Login
                </button>
              )}
            </div>
          </div>
          <div
            className="flex-1"
            onClick={() => setIsOpenMobile(false)}
          />
        </div>
      )}
    </header>
  );

  return (
    <>
      {/* Desktop Version */}
      <div className="hidden md:block">{desktopSidebar}</div>

      {/* Mobile Version */}
      {mobileHeader}
    </>
  );
}
