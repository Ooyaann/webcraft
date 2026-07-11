"use client";
import dynamic from 'next/dynamic';
import { RequireAuth } from "@/components/guards";
import { WorkspaceSkeleton } from "@/components/common/Skeletons";

const Workspace = dynamic(() => import("@/views/Workspace"), {
  ssr: false,
  loading: () => <WorkspaceSkeleton />
});

export default function Page() {
  return (
    <RequireAuth>
      <Workspace />
    </RequireAuth>
  );
}
