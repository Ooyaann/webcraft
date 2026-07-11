"use client";
// Ruang coba fitur Workspace untuk pengunjung umum (tanpa login):
// bebas merakit blok, tanpa tugas, tanpa penilaian, tanpa kirim karya.
import dynamic from 'next/dynamic';
import { WorkspaceSkeleton } from "@/components/common/Skeletons";

const Workspace = dynamic(() => import("@/views/Workspace"), {
  ssr: false,
  loading: () => <WorkspaceSkeleton />
});

export default function Page() {
  return <Workspace isSandbox />;
}
