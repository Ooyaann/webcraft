import React from 'react';
import { Navigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import BerandaGuest from '../components/beranda/BerandaGuest';
import BerandaSiswa from '../components/beranda/BerandaSiswa';
import BerandaGuru from '../components/beranda/BerandaGuru';

export default function Beranda() {
  const { user } = useStore();

  if (!user) {
    return <BerandaGuest />;
  }

  // ponytail: siswa langsung ke ruang belajar, tapi tetap ada quick dashboard jika diakses lewat sidebar
  if (user.role === 'siswa') {
    return <BerandaSiswa user={user} />;
  }

  if (user.role === 'guru') {
    return <BerandaGuru user={user} />;
  }

  return (
    <div className="w-full min-h-[50vh] flex items-center justify-center">
      <div className="neo-card p-6 text-center">
        <div className="neo-spinner mx-auto mb-3" />
        <h3 className="font-fredoka text-xl font-bold">Memuat Dashboard...</h3>
      </div>
    </div>
  );
}
