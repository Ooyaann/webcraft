"use client";
import dynamic from 'next/dynamic';
import { RequireAuth } from "@/components/guards";
import { RoomDetailSkeleton } from "@/components/common/Skeletons";

const RoomDetail = dynamic(() => import("@/views/RoomDetail"), {
  ssr: false,
  loading: () => <RoomDetailSkeleton />
});

export default function Page() {
  return (
    <RequireAuth>
      <RoomDetail />
    </RequireAuth>
  );
}
