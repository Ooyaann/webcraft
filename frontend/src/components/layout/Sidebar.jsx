import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import WebCraftLogo from '../common/WebCraftLogo';

const menuConfig = {
  guest: [
    { to: '/', icon: 'ti-home', label: 'Beranda' },
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
  const [expanded, setExpanded] = useState(false);
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  const role = user?.role ?? 'guest';
  const items = menuConfig[role] || menuConfig.guest;
  const activeGradient = sidebarGradients[role] || sidebarGradients.guest;
  const activeStyle = activeStyles[role] || activeStyles.guest;
  const profileBg = profileCardBackgrounds[role] || profileCardBackgrounds.guest;

  // Check if sidebar text/icons should be light or dark based on background
  const isLightText = role === 'siswa' || role === 'guru';

  const handleLogout = () => {
    localStorage.removeItem('webcraft_token');
    logout();
    navigate('/');
    setIsOpenMobile(false);
  };

  const handleNavigate = (path) => {
    navigate(path);
    setIsOpenMobile(false);
  };

  // Hide sidebar on workspace page for full immersion
  const isWorkspacePage = location.pathname.startsWith('/workspace/');
  if (isWorkspacePage) return null;

  const desktopSidebar = (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className="fixed left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center overflow-hidden"
      style={{
        width: expanded ? '260px' : '88px',
        height: '90vh',
        background: activeGradient,
        border: '4px solid #0F172A',
        borderRadius: '24px',
        padding: '20px 16px',
        gap: '8px',
        boxShadow: expanded
          ? '8px 8px 0px #0F172A, 0 10px 30px rgba(15, 23, 42, 0.08)'
          : '4px 4px 0px #0F172A',
        transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Brand Logo */}
      <div
        className={`flex items-center cursor-pointer select-none pb-4 border-b-4 border-dashed w-full transition-all duration-300 ${expanded ? 'justify-start pl-2 gap-3' : 'justify-center pl-0 gap-0'
          } ${isLightText ? 'border-white/20' : 'border-[#0F172A]/20'}`}
        onClick={() => handleNavigate('/')}
      >
        <WebCraftLogo
          className="w-10 h-10 hover:rotate-6 transition-transform duration-200"
        />
        {expanded && (
          <div className="flex flex-col items-start leading-none transition-all duration-200">
            <h1 className={`font-fredoka text-[16px] font-bold tracking-tight leading-none whitespace-nowrap ${isLightText ? 'text-white' : 'text-[#0F172A]'}`}>
              WebCraft
            </h1>
          </div>
        )}
      </div>

      {/* Navigation list */}
      <nav className="flex-grow flex flex-col gap-2.5 w-full pt-4 overflow-y-auto overflow-x-hidden">
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
              className={`group relative flex items-center rounded-xl font-nunito font-black text-[11px] transition-all duration-200 ${expanded
                ? 'w-[calc(100%-4px)] mx-[2px] justify-start py-2.5 px-3.5 gap-3'
                : 'w-11 h-11 justify-center p-0 gap-0 mx-auto'
                } ${isActive
                  ? `${activeStyle.text} border-2 border-[#0F172A] shadow-[2.5px_2.5px_0px_#0F172A] -translate-y-[1px]`
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
              <div className="relative shrink-0 flex items-center justify-center w-6">
                <i
                  className={`ti ${item.icon} text-[18px]`}
                  aria-hidden
                />
                {/* Active dot indicator when collapsed */}
                {isActive && !expanded && (
                  <span
                    className="absolute -right-1.5 -top-1 w-2.5 h-2.5 rounded-full border border-white"
                    style={{
                      background: role === 'guest' ? '#3B82F6' : '#FACC15',
                      boxShadow: '0 0 6px rgba(250, 204, 21, 0.8)',
                    }}
                  />
                )}
              </div>

              {expanded && (
                <span className="font-nunito font-black text-[11.5px] text-left uppercase tracking-wider">
                  {item.label}
                </span>
              )}

              {/* Tooltip when collapsed */}
              {!expanded && (
                <div className="absolute left-full ml-4 px-2.5 py-1.5 bg-white text-[#0F172A] text-[10px] font-fredoka font-bold rounded-xl border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 whitespace-nowrap z-[999] translate-x-2 group-hover:translate-x-0">
                  {item.label}
                  <div className="absolute left-0 top-1/2 -translate-x-1.5 -translate-y-1/2 w-2 h-2 bg-white border-l-2 border-b-2 border-[#0F172A] rotate-45" />
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User profile / Logout */}
      <div className={`border-t-4 border-dashed pt-4 w-full flex flex-col gap-2 ${isLightText ? 'border-white/20' : 'border-[#0F172A]/20'}`}>
        {user ? (
          <div
            className={`flex flex-col gap-2 rounded-xl overflow-hidden border-2 border-[#0F172A] shadow-[2.5px_2.5px_0px_#0F172A] transition-all duration-300 ${expanded ? 'w-[calc(100%-4px)] mx-[2px] p-2' : 'w-12 h-12 justify-center p-0 mx-auto'
              } ${profileBg}`}
          >
            <div className={`flex items-center w-full transition-all duration-300 ${expanded ? 'justify-start gap-2' : 'justify-center gap-0'
              }`}>
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full font-fredoka font-bold text-sm shrink-0 border-2 border-[#0F172A] text-white shadow-[1.5px_1.5px_0px_#0F172A] ${
                  role === 'siswa' ? 'bg-[#6366F1]' : 'bg-[#EC4899]'
                }`}
              >
                {user.name?.charAt(0).toUpperCase()}
              </div>
              {expanded && (
                <div className="text-left flex-1 min-w-0 transition-all duration-200">
                  <p className="font-nunito text-[11px] font-black leading-none text-[#0F172A] truncate">
                    {user.name}
                  </p>
                </div>
              )}
            </div>
            {expanded && (
              <button
                onClick={handleLogout}
                className="w-full py-1.5 border-2 border-[#0F172A] bg-[#F43F5E] hover:bg-[#E11D48] text-white font-nunito text-[10px] font-black cursor-pointer shadow-[1.5px_1.5px_0px_#0F172A] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-1"
              >
                <i className="ti ti-logout text-xs" />
                Keluar
              </button>
            )}
          </div>
        ) : (
          <div className="w-full flex justify-center">
            {expanded ? (
              <button
                onClick={() => handleNavigate('/login')}
                className="w-[calc(100%-4px)] mx-[2px] py-2.5 text-[#0F172A] border-2 border-[#0F172A] font-fredoka font-bold text-xs rounded-xl hover:-translate-y-0.5 active:translate-y-[0.5px] cursor-pointer flex justify-center items-center gap-1.5 transition-all"
                style={{
                  background: 'linear-gradient(135deg, #FACC15, #FDE68A)',
                  boxShadow: '2px 2px 0px #0F172A',
                }}
              >
                <i className="ti ti-login text-sm" />
                Login
              </button>
            ) : (
              <button
                onClick={() => handleNavigate('/login')}
                className="w-12 h-12 text-[#0F172A] border-2 border-[#0F172A] rounded-xl hover:-translate-y-0.5 active:translate-y-[0.5px] cursor-pointer flex justify-center items-center transition-all shadow-[2px_2px_0px_#0F172A] mx-auto"
                style={{
                  background: 'linear-gradient(135deg, #FACC15, #FDE68A)',
                }}
              >
                <i className="ti ti-login text-base" />
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );

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
