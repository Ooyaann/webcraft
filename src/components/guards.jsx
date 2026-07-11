'use client';
// Guard autentikasi. Token ada di cookie httpOnly (tak terbaca JS), jadi
// status login ditentukan oleh store.user + authChecked (diisi AppShell
// setelah probe /auth/me). Sebelum probe selesai → tampilkan spinner.
import { useStore } from '../store/useStore';
import { Navigate } from '../lib/router-compat';

function SessionSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#E0F2FE]">
      <div className="flex flex-col items-center gap-3">
        <div className="neo-spinner" />
        <p className="font-fredoka font-bold text-slate-700 text-sm">Memulihkan Sesi...</p>
      </div>
    </div>
  );
}

export function RequireAuth({ children }) {
  const { user, authChecked } = useStore();
  if (user) return children;
  if (!authChecked) return <SessionSpinner />;
  return <Navigate to="/login" replace />;
}

export function RequireRole({ role, children }) {
  const { user, authChecked } = useStore();
  if (user) {
    return user.role === role ? children : <Navigate to="/" replace />;
  }
  if (!authChecked) return <SessionSpinner />;
  return <Navigate to="/login" replace />;
}
