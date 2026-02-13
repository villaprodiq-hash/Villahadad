import React from 'react';

const AppShellSkeleton: React.FC = () => {
  return (
    <div className="h-screen w-full relative bg-linear-to-b from-[#F2E9CE] via-[#F8F9FA] to-white overflow-hidden flex flex-col" dir="rtl">
      
      {/* 1. Sidebar Skeleton (Right) */}
      <div className="fixed top-0 right-0 h-screen w-[250px] bg-white border-l border-gray-100 shadow-sm z-50 flex flex-col">
        {/* Logo Area */}
        <div className="h-24 flex items-center justify-center border-b border-gray-50/50">
           <div className="w-10 h-10 bg-gray-200 rounded-xl animate-pulse"></div>
           <div className="mr-3 flex flex-col gap-2">
             <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
             <div className="w-12 h-2 bg-gray-100 rounded animate-pulse"></div>
           </div>
        </div>

        {/* Menu Items */}
        <div className="flex-1 p-4 space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50/50">
               <div className="w-5 h-5 bg-gray-200 rounded-md animate-pulse"></div>
               <div className="w-24 h-3 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Header Skeleton (Top) */}
      <div className="mr-[250px] px-6 pt-2 relative z-40">
        <div className="h-20 w-full flex items-center justify-between">
            <div className="w-48 h-8 bg-gray-200/50 rounded-lg animate-pulse"></div>
            <div className="flex gap-3">
                <div className="w-10 h-10 bg-gray-200/50 rounded-full animate-pulse"></div>
                <div className="w-10 h-10 bg-gray-200/50 rounded-full animate-pulse"></div>
            </div>
        </div>
      </div>

      {/* 3. Main Content Skeleton */}
      <main className="mr-[250px] flex-1 px-6 pt-2 pb-8 overflow-hidden flex flex-col relative z-10 h-full">
        <div className="w-full h-full rounded-4xl bg-white/40 border border-white/50 shadow-sm p-6 relative overflow-hidden">
             {/* Dashboard Widgets Skeleton */}
             <div className="grid grid-cols-4 gap-6 mb-8">
                 {[1, 2, 3, 4].map(i => (
                     <div key={i} className="h-32 bg-white/60 rounded-3xl animate-pulse delay-75"></div>
                 ))}
             </div>
             <div className="grid grid-cols-3 gap-6 h-full">
                 <div className="col-span-2 h-[500px] bg-white/60 rounded-3xl animate-pulse delay-100"></div>
                 <div className="col-span-1 h-[500px] bg-white/60 rounded-3xl animate-pulse delay-150"></div>
             </div>
        </div>
      </main>

    </div>
  );
};

export default AppShellSkeleton;
