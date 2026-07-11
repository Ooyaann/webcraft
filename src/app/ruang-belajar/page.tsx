"use client";
import dynamic from 'next/dynamic';
import { RuangBelajarSkeleton } from "@/components/common/Skeletons";

const RuangBelajar = dynamic(() => import("@/views/RuangBelajar"), {
  ssr: false,
  loading: () => <RuangBelajarSkeleton />
});

export default function Page() {
  return <RuangBelajar />;
}
