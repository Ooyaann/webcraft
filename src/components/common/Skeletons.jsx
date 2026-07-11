import React from 'react';

export function RoomDetailSkeleton() {
  return (
    <div className="w-full px-4 md:px-6 py-8 text-left max-w-[1400px] mx-auto flex flex-col gap-6 relative z-10 animate-pulse">
      {/* Banner Skeleton */}
      <div className="bg-slate-200 border-4 border-[#0F172A] p-6 rounded-[24px] shadow-[6px_6px_0px_#0F172A] h-[140px] flex flex-col justify-center">
        <div className="h-4 bg-slate-350 rounded-full w-24 mb-3" />
        <div className="h-8 bg-slate-350 rounded-full w-48 mb-2" />
        <div className="h-4 bg-slate-300 rounded-full w-96" />
      </div>

      {/* Announcement Skeleton */}
      <div className="bg-slate-100 border-4 border-[#0F172A] p-5 rounded-[24px] shadow-[6px_6px_0px_#0F172A] h-[90px] flex flex-col justify-center">
        <div className="h-4 bg-slate-300 rounded-full w-32 mb-2" />
        <div className="h-3 bg-slate-250 rounded-full w-full" />
      </div>

      {/* Timeline Skeleton */}
      <div className="border-4 border-[#0F172A] shadow-[6px_6px_0px_#0F172A] rounded-[24px] bg-white p-6 md:p-8 flex flex-col gap-6">
        <div className="border-b-2 border-dashed border-slate-200 pb-4">
          <div className="h-6 bg-slate-250 rounded-full w-48" />
        </div>
        
        <div className="flex flex-col gap-5 pl-5 border-l-4 border-[#0F172A] ml-[14px] py-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-slate-50 border-4 border-[#0F172A] p-5 rounded-[20px] shadow-[4px_4px_0px_#0F172A] flex flex-col sm:flex-row justify-between gap-4">
              <div className="flex-1">
                <div className="h-5 bg-slate-300 rounded-full w-40 mb-2" />
                <div className="h-4 bg-slate-300 rounded-full w-60 mb-2" />
                <div className="h-3 bg-slate-250 rounded-full w-full" />
              </div>
              <div className="w-24 h-9 bg-slate-300 border-2 border-[#0F172A] rounded-xl self-end sm:self-center" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function WorkspaceSkeleton() {
  return (
    <div className="w-full h-screen bg-[#E0F2FE] flex flex-col relative overflow-hidden animate-pulse">
      {/* Toolbar Skeleton */}
      <div className="w-full bg-slate-900 text-white px-6 py-4 flex justify-between items-center border-b-4 border-[#0F172A] shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-700 border-2 border-slate-600 rounded-xl" />
          <div>
            <div className="h-4 bg-slate-700 rounded-full w-40 mb-1" />
            <div className="h-2.5 bg-slate-850 rounded-full w-24" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-20 h-7 bg-slate-700 border-2 border-slate-600 rounded-xl" />
          <div className="w-24 h-7 bg-slate-700 border-2 border-slate-600 rounded-xl" />
        </div>
      </div>

      {/* Main Panels Skeleton */}
      <div className="flex-grow w-full flex overflow-hidden min-h-0 relative">
        {/* Left Panel (PaletBlok) */}
        <div className="w-[280px] bg-slate-100 border-r-4 border-[#0F172A] flex flex-col p-4 shrink-0 gap-3">
          <div className="h-5 bg-slate-300 rounded-full w-32 mb-2" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-slate-200 border-2 border-[#0F172A] rounded-xl" />
          ))}
        </div>

        {/* Center Panel (Kanvas) */}
        <div className="flex-grow bg-white flex flex-col p-6 gap-4">
          <div className="h-6 bg-slate-200 rounded-full w-48 mb-2" />
          <div className="flex-grow border-4 border-dashed border-slate-300 rounded-[20px] flex items-center justify-center">
            <div className="h-4 bg-slate-300 rounded-full w-32" />
          </div>
        </div>

        {/* Right Panel (Preview/Code) */}
        <div className="w-[380px] bg-slate-50 border-l-4 border-[#0F172A] flex flex-col shrink-0">
          <div className="h-12 bg-slate-200 border-b-4 border-[#0F172A] flex items-center px-4 gap-2">
            <div className="w-16 h-6 bg-slate-300 rounded-lg" />
            <div className="w-16 h-6 bg-slate-300 rounded-lg" />
          </div>
          <div className="flex-grow p-4 flex flex-col gap-3">
            <div className="h-4 bg-slate-300 rounded-full w-full" />
            <div className="h-4 bg-slate-300 rounded-full w-5/6" />
            <div className="h-4 bg-slate-300 rounded-full w-4/5" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function RuangBelajarSkeleton() {
  return (
    <div className="w-full px-4 md:px-6 py-8 text-left max-w-[1400px] mx-auto flex flex-col gap-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="border-b-4 border-dashed border-slate-200 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="h-8 bg-slate-300 rounded-full w-48 mb-2" />
          <div className="h-4 bg-slate-250 rounded-full w-80" />
        </div>
        <div className="w-36 h-10 bg-slate-300 border-2 border-[#0F172A] rounded-xl shrink-0" />
      </div>

      {/* Classroom Join Gate (Student Only) placeholder */}
      <div className="bg-slate-200 border-4 border-[#0F172A] p-6 rounded-[24px] shadow-[6px_6px_0px_#0F172A] h-[120px] flex flex-col justify-center">
        <div className="h-4 bg-slate-300 rounded-full w-40 mb-3" />
        <div className="h-10 bg-slate-300 border-2 border-[#0F172A] rounded-xl w-72" />
      </div>

      {/* Classroom List Grid Skeleton */}
      <div className="flex flex-col gap-4">
        <div className="h-6 bg-slate-300 rounded-full w-36 mb-2" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border-4 border-[#0F172A] rounded-[24px] shadow-[6px_6px_0px_#0F172A] p-5 h-[160px] flex flex-col justify-between">
              <div>
                <div className="h-5 bg-slate-300 rounded-full w-32 mb-2" />
                <div className="h-4 bg-slate-250 rounded-full w-48 mb-2" />
                <div className="h-3 bg-slate-200 rounded-full w-24" />
              </div>
              <div className="w-full h-10 bg-slate-200 border-2 border-[#0F172A] rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
