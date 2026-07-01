import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useStore } from './store/useStore';
import Sidebar from './components/layout/Sidebar';
import Footer from './components/layout/Footer';
import Beranda from './pages/Beranda';
import RuangBelajar from './pages/RuangBelajar';
import RoomDetail from './pages/RoomDetail';
import TugasDetail from './pages/TugasDetail';
import Rekap from './pages/Rekap';
import Workspace from './pages/Workspace';
import GaleriKarya from './pages/GaleriKarya';
import Tugasku from './pages/Tugasku';
import PenilaianAnalitik from './pages/PenilaianAnalitik';
import Login from './pages/Login';
import Register from './pages/Register';
import api from './services/api';
import MouseTrail from './components/common/MouseTrail';
import BackgroundCodingShapes from './components/common/BackgroundCodingShapes';
import WebCraftLogo from './components/common/WebCraftLogo';


// Authentication Guard Components
function RequireAuth({ children }) {
  const { user } = useStore();
  const token = localStorage.getItem('webcraft_token');
  if (!user && !token) {
    return <Navigate to="/login" replace />;
  }
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E0F2FE]">
        <div className="flex flex-col items-center gap-3">
          <div className="neo-spinner" />
          <p className="font-fredoka font-bold text-slate-700 text-sm">Memulihkan Sesi...</p>
        </div>
      </div>
    );
  }
  return children;
}

function RequireRole({ role, children }) {
  const { user } = useStore();
  const token = localStorage.getItem('webcraft_token');
  if (!user && !token) {
    return <Navigate to="/login" replace />;
  }
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E0F2FE]">
        <div className="flex flex-col items-center gap-3">
          <div className="neo-spinner" />
          <p className="font-fredoka font-bold text-slate-700 text-sm">Memulihkan Sesi...</p>
        </div>
      </div>
    );
  }
  if (user.role !== role) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  const { user, setUser, setActiveRoom } = useStore();
  const location = useLocation();
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [showLoader, setShowLoader] = useState(false);

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
  }, [location.pathname]);

  useEffect(() => {
    // Restore session on refresh
    const token = localStorage.getItem('webcraft_token');
    if (token) {
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
                if (list.length > 0) {
                  setActiveRoom(list[0]);
                } else {
                  setActiveRoom(null);
                }
              })
              .catch(() => setActiveRoom(null));
          } else {
            setActiveRoom(null);
          }
        })
        .catch(err => {
          console.error("Token invalid, removing...", err);
          localStorage.removeItem('webcraft_token');
          setUser(null);
          setActiveRoom(null);
        });
    }
  }, [setUser, setActiveRoom]);

  // Workspace pages should be full screen with no sidebar, header, or footer
  const isWorkspace = location.pathname.startsWith('/workspace/');

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
        className={`flex-1 flex flex-col min-w-0 relative transition-all duration-300 ${isWorkspace ? 'md:pl-0' : 'md:pl-32'
          }`}
      >
        <main className={`flex-grow w-full relative ${isWorkspace ? '' : 'min-h-screen'}`}>
          <div key={location.pathname} className="neo-page-enter w-full h-full">
            <Routes>
              {/* Public Gates */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* General Pages */}
              <Route path="/" element={<Beranda />} />
              <Route path="/ruang-belajar" element={<RuangBelajar />} />

              {/* Student Pages */}
              <Route path="/ruang-belajar/:roomId" element={
                <RequireAuth>
                  <RoomDetail />
                </RequireAuth>
              } />
              <Route path="/ruang-belajar/:roomId/tugas/:tugasId" element={
                <RequireAuth>
                  <TugasDetail />
                </RequireAuth>
              } />
              <Route path="/ruang-belajar/:roomId/rekap/:tugasId" element={
                <RequireAuth>
                  <Rekap />
                </RequireAuth>
              } />
              <Route path="/workspace/:tugasId" element={
                <RequireAuth>
                  <Workspace />
                </RequireAuth>
              } />
              <Route path="/galeri" element={<GaleriKarya />} />
              <Route path="/tugasku" element={
                <RequireRole role="siswa">
                  <Tugasku />
                </RequireRole>
              } />

              {/* Teacher Pages */}
              <Route path="/penilaian" element={
                <RequireRole role="guru">
                  <PenilaianAnalitik />
                </RequireRole>
              } />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>

        {/* Footer (Hidden in workspace) */}
        {!isWorkspace && <Footer />}
      </div>
    </div>
  );
}
