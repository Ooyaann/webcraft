'use client';
// Port dari frontend/src/App.jsx — shell aplikasi (loader halaman, latar,
// Sidebar, Footer). <Routes> digantikan {children} dari App Router.
// Trigger Vercel rebuild: Sidebar widened and aligned.
import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useStore } from '../store/useStore';
import Sidebar from './layout/Sidebar';
import Footer from './layout/Footer';
import api from '../services/api';
import MouseTrail from './common/MouseTrail';
import BackgroundCodingShapes from './common/BackgroundCodingShapes';
import WebCraftLogo from './common/WebCraftLogo';

export default function AppShell({ children }) {
  const { setUser, setActiveRoom, setAuthChecked } = useStore();
  const pathname = usePathname();
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  // Render hanya di klien (paritas SPA): hindari mismatch SSR pada
  // localStorage/sessionStorage yang dibaca saat render.
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Trigger brief page loader splash screen on every route change
  useEffect(() => {
    // Auto-scroll to top on navigation
    window.scrollTo({ top: 0, behavior: 'instant' });

    setShowLoader(true);
    setIsPageLoading(true);

    const fadeTimeout = setTimeout(() => {
      setIsPageLoading(false);
    }, 450); // 450ms visible loading bar

    const removeTimeout = setTimeout(() => {
      setShowLoader(false);
    }, 750); // 450ms + 300ms fade transition

    return () => {
      clearTimeout(fadeTimeout);
      clearTimeout(removeTimeout);
    };
  }, [pathname]);

  useEffect(() => {
    // Pulihkan sesi via cookie httpOnly: coba /auth/me (cookie dikirim otomatis).
    // authChecked menandai probe selesai supaya guard tahu ini tamu asli.
    api.get('/auth/me')
      .then(response => {
        const userData = response.data;
        setUser({
          id: userData.id,
          name: userData.name,
          role: userData.role,
          email: userData.email
        });
        // Restore default class for student to prevent empty room list on refresh
        if (userData.role === 'siswa') {
          api.get('/rooms')
            .then(res => {
              const list = res.data || [];
              setActiveRoom(list.length > 0 ? list[0] : null);
            })
            .catch(() => setActiveRoom(null));
        } else {
          setActiveRoom(null);
        }
      })
      .catch(() => {
        // Belum login / cookie kedaluwarsa — tamu.
        setUser(null);
        setActiveRoom(null);
      })
      .finally(() => setAuthChecked(true));
  }, [setUser, setActiveRoom, setAuthChecked]);

  if (!mounted) return null;

  // Workspace pages should be full screen with no sidebar, header, or footer
  const isWorkspace = pathname.startsWith('/workspace/') || pathname === '/sandbox';

  return (
    <div className="min-h-screen bg-transparent text-[#0F172A] flex flex-col md:flex-row font-nunito selection:bg-[#FACC15] neo-cursor-sparkle">
      {/* Dynamic Page Loader Splash Screen */}
      {showLoader && (
        <div
          className={`fixed inset-0 bg-[#F0F7FF] z-[99999] flex flex-col items-center justify-center transition-opacity duration-300 pointer-events-none ${isPageLoading ? 'opacity-100' : 'opacity-0'
            }`}
        >
          {/* Background Grid Pattern inside loader */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.04)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center gap-8 scale-95 md:scale-100">
            {/* Animated Brand Logo */}
            <WebCraftLogo className="w-24 h-24 animate-bounce-slow" />

            {/* Neo-brutalist Loading Progress Bar */}
            <div className="w-56 h-5 bg-white border-4 border-[#0F172A] rounded-full overflow-hidden shadow-[4px_4px_0px_#0F172A] isolate">
              <div className="h-full bg-gradient-to-r from-[#3B82F6] via-[#EC4899] to-[#FACC15] animate-loading-bar rounded-full" />
            </div>
          </div>
        </div>
      )}

      {/* Interactive Cursor Trail */}
      <MouseTrail />

      {/* Floating Coding Symbols Background */}
      <BackgroundCodingShapes />

      {/* Floating Background Shapes */}
      <div className="floating-shapes">
        <div className="shape" />
        <div className="shape" />
        <div className="shape" />
        <div className="shape" />
        <div className="shape" />
      </div>

      {/* Sidebar Navigation (Hidden in workspace) */}
      <Sidebar />

      {/* Main Content Wrapper */}
      <div
        className={`flex-1 flex flex-col min-w-0 relative transition-all duration-300 ${isWorkspace ? 'md:pl-0' : 'md:pl-65'
          }`}
      >
        <main className={`flex-grow w-full relative ${isWorkspace ? '' : 'min-h-screen'}`}>
          <div key={pathname} className="neo-page-enter w-full h-full">
            {children}
          </div>
        </main>

        {/* Footer (Hidden in workspace) */}
        {!isWorkspace && <Footer />}
      </div>
    </div>
  );
}
