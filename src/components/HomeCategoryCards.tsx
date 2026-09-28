import React from 'react';
import { ArrowRight, BookOpen, FileText, ClipboardCheck, Truck, Download, Clock } from 'lucide-react';
import { ProductType } from '../types';

interface HomeCategoryCardsProps {
  onSelectFormat: (format: ProductType) => void;
  onNavigateMockTests: () => void;
  onNavigatePasses?: () => void;
  onNavigateFreeResources?: () => void;
  onSelectCategory?: (category: string) => void;
}

export const HomeCategoryCards: React.FC<HomeCategoryCardsProps> = ({
  onSelectFormat,
  onNavigateMockTests
}) => {
  return (
    <section id="everything-for-neet-section" className="space-y-3 pt-1">
      {/* Section Header matching Image 1: "Everything You Need for NEET Preparation" + "Your Dream Our Support 💙" */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-0.5">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight font-['Outfit',sans-serif]">
            Everything You Need for NEET Preparation
          </h2>
          <div className="w-12 h-1 bg-blue-600 rounded-full mt-1" />
        </div>

        <div className="flex items-center gap-1 text-xs font-bold text-slate-700">
          <span>Your Dream</span>
          <span className="text-slate-400">•</span>
          <span className="text-blue-600">Our Support 💙</span>
        </div>
      </div>

      {/* 
        Three Horizontal Service Cards matching Image 1:
        1. Physical Books (Pink/Coral gradient, 🚚 Physical Delivery badge, Explore Books ->)
        2. Digital Study Material (Cyan/Blue gradient, 📥 Instant Digital Access badge, Explore PDFs ->)
        3. Mock Tests (Mint/Green gradient, 📋 Online Tests badge, Take a Test ->)
        Mobile-first compact 3-column row matching reference image.
      */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-3 md:gap-3.5">
        {/* ================= 1. PHYSICAL BOOKS ================= */}
        <div
          id="home-service-physical-books"
          onClick={() => onSelectFormat('book')}
          className="group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#fff1f2] via-[#fff5f5] to-white border border-rose-200/80 p-2.5 sm:p-4 md:p-5 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
        >
          <div>
            {/* Top Badge: Physical Delivery */}
            <div className="flex items-center justify-between gap-1 mb-1 sm:mb-2 md:mb-3">
              <span className="inline-flex items-center gap-0.5 sm:gap-1.5 px-1.5 sm:px-2.5 md:px-3 py-0.5 sm:py-1 rounded-full bg-white/90 text-rose-600 text-[7.5px] sm:text-[9.5px] md:text-[10px] font-black uppercase tracking-tight border border-rose-200 shadow-2xs truncate">
                <span>🚚</span>
                <span className="hidden sm:inline">Physical</span>
                <span>Delivery</span>
              </span>
            </div>

            {/* Illustration Graphic: Stacked NEET Books */}
            <div className="w-full h-16 sm:h-22 md:h-28 flex items-center justify-center my-0.5 sm:my-1 select-none">
              <div className="relative flex flex-col items-center">
                {/* 3D-styled Stack of Books */}
                <div className="w-18 sm:w-24 md:w-28 h-4 sm:h-5 md:h-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded sm:rounded-md shadow-xs border border-blue-700 flex items-center justify-between px-1 sm:px-2 text-white text-[6.5px] sm:text-[7.5px] md:text-[8px] font-black">
                  <span>NEET</span>
                  <span>PHYSICS</span>
                </div>
                <div className="w-20 sm:w-28 md:w-32 h-4 sm:h-5 md:h-6 bg-gradient-to-r from-amber-500 to-orange-500 rounded sm:rounded-md shadow-xs border border-orange-600 -mt-1 sm:-mt-1.5 flex items-center justify-between px-1 sm:px-2 text-white text-[6.5px] sm:text-[7.5px] md:text-[8px] font-black z-10">
                  <span>NEET</span>
                  <span>CHEMISTRY</span>
                </div>
                <div className="w-22 sm:w-32 md:w-36 h-5 sm:h-7 md:h-8 bg-gradient-to-r from-emerald-600 to-teal-600 rounded sm:rounded-lg shadow-sm border border-emerald-700 -mt-1 sm:-mt-1.5 flex items-center justify-between px-1 sm:px-2 text-white text-[7px] sm:text-[8px] md:text-[9px] font-black z-20">
                  <span>NEET 2026</span>
                  <span>BIOLOGY</span>
                </div>
              </div>
            </div>

            {/* Title & Description */}
            <h3 className="text-xs sm:text-sm md:text-base font-black text-slate-900 font-['Outfit',sans-serif] group-hover:text-rose-600 transition leading-tight mt-1 sm:mt-2 truncate sm:whitespace-normal">
              Physical Books
            </h3>
            <p className="text-[8.5px] sm:text-[10.5px] md:text-xs text-slate-600 font-normal leading-tight mt-0.5 sm:mt-1 line-clamp-2">
              Order high-quality NEET preparation books delivered to your doorstep.
            </p>
          </div>

          {/* Action Button: Explore Books -> */}
          <div className="pt-2 sm:pt-3 md:pt-4">
            <button
              type="button"
              className="w-full inline-flex items-center justify-center gap-0.5 sm:gap-1.5 py-1.5 sm:py-2 md:py-2.5 px-1 sm:px-3 md:px-4 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white text-[9px] sm:text-xs font-black rounded-full shadow-xs group-hover:shadow transition-all"
            >
              <span>Explore Books</span>
              <ArrowRight className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* ================= 2. DIGITAL STUDY MATERIAL ================= */}
        <div
          id="home-service-digital-material"
          onClick={() => onSelectFormat('pdf')}
          className="group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#eff6ff] via-[#f0f9ff] to-white border border-sky-200/80 p-2.5 sm:p-4 md:p-5 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
        >
          <div>
            {/* Top Badge: Instant Digital Access */}
            <div className="flex items-center justify-between gap-1 mb-1 sm:mb-2 md:mb-3">
              <span className="inline-flex items-center gap-0.5 sm:gap-1.5 px-1.5 sm:px-2.5 md:px-3 py-0.5 sm:py-1 rounded-full bg-white/90 text-blue-600 text-[7.5px] sm:text-[9.5px] md:text-[10px] font-black uppercase tracking-tight border border-blue-200 shadow-2xs truncate">
                <span>📥</span>
                <span className="hidden sm:inline">Instant</span>
                <span>Access</span>
              </span>
            </div>

            {/* Illustration Graphic: Tablet with PDF */}
            <div className="w-full h-16 sm:h-22 md:h-28 flex items-center justify-center my-0.5 sm:my-1 select-none">
              <div className="relative w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-white rounded-xl sm:rounded-2xl border sm:border-2 border-blue-400 shadow-xs sm:shadow-md p-1 sm:p-2 flex flex-col items-center justify-center gap-0.5 sm:gap-1 transform -rotate-3 group-hover:rotate-0 transition-transform">
                <div className="w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg sm:rounded-xl bg-rose-50 border border-rose-200 flex flex-col items-center justify-center text-rose-600 font-black shadow-2xs">
                  <span className="text-[8px] sm:text-[10px] md:text-[11px] leading-none">PDF</span>
                  <FileText className="w-2.5 h-2.5 sm:w-3 sm:h-3 mt-0.5" />
                </div>
                <span className="text-[6px] sm:text-[7px] md:text-[7.5px] font-black text-slate-700 tracking-tight">
                  NCERT NOTES
                </span>
                <div className="w-full h-0.5 sm:h-1 bg-blue-100 rounded-full" />
              </div>
            </div>

            {/* Title & Description */}
            <h3 className="text-xs sm:text-sm md:text-base font-black text-slate-900 font-['Outfit',sans-serif] group-hover:text-blue-600 transition leading-tight mt-1 sm:mt-2 truncate sm:whitespace-normal">
              Digital Material
            </h3>
            <p className="text-[8.5px] sm:text-[10.5px] md:text-xs text-slate-600 font-normal leading-tight mt-0.5 sm:mt-1 line-clamp-2">
              Purchase notes, short notes, PYQs, MCQs, revision material and more.
            </p>
          </div>

          {/* Action Button: Explore PDFs -> */}
          <div className="pt-2 sm:pt-3 md:pt-4">
            <button
              type="button"
              className="w-full inline-flex items-center justify-center gap-0.5 sm:gap-1.5 py-1.5 sm:py-2 md:py-2.5 px-1 sm:px-3 md:px-4 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white text-[9px] sm:text-xs font-black rounded-full shadow-xs group-hover:shadow transition-all"
            >
              <span>Explore PDFs</span>
              <ArrowRight className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* ================= 3. MOCK TESTS ================= */}
        <div
          id="home-service-mock-tests"
          onClick={onNavigateMockTests}
          className="group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#f0fdf4] via-[#f7fee7] to-white border border-emerald-200/80 p-2.5 sm:p-4 md:p-5 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
        >
          <div>
            {/* Top Badge: Online Tests */}
            <div className="flex items-center justify-between gap-1 mb-1 sm:mb-2 md:mb-3">
              <span className="inline-flex items-center gap-0.5 sm:gap-1.5 px-1.5 sm:px-2.5 md:px-3 py-0.5 sm:py-1 rounded-full bg-white/90 text-emerald-700 text-[7.5px] sm:text-[9.5px] md:text-[10px] font-black uppercase tracking-tight border border-emerald-200 shadow-2xs truncate">
                <span>📋</span>
                <span>Online Tests</span>
              </span>
            </div>

            {/* Illustration Graphic: Test Paper & Timer Clock */}
            <div className="w-full h-16 sm:h-22 md:h-28 flex items-center justify-center gap-1 sm:gap-2 my-0.5 sm:my-1 select-none">
              {/* Test Paper */}
              <div className="w-12 h-14 sm:w-16 sm:h-20 md:w-20 md:h-24 bg-white rounded-lg sm:rounded-xl border border-slate-200 shadow-xs sm:shadow-md p-1 sm:p-1.5 flex flex-col justify-between transform -rotate-6 group-hover:rotate-0 transition-transform">
                <div className="text-[6px] sm:text-[7px] md:text-[7.5px] font-black text-emerald-700 border-b border-slate-100 pb-0.5 text-center">
                  TEST SHEET
                </div>
                <div className="space-y-0.5 sm:space-y-1 px-0.5">
                  <div className="flex items-center gap-0.5 sm:gap-1 text-[6px] sm:text-[7px] text-emerald-600 font-bold">
                    <span>☑ Q1</span>
                    <span className="text-slate-400">A</span>
                  </div>
                  <div className="flex items-center gap-0.5 sm:gap-1 text-[6px] sm:text-[7px] text-emerald-600 font-bold">
                    <span>☑ Q2</span>
                    <span className="text-slate-400">C</span>
                  </div>
                  <div className="flex items-center gap-0.5 sm:gap-1 text-[6px] sm:text-[7px] text-emerald-600 font-bold">
                    <span>☑ Q3</span>
                    <span className="text-slate-400">B</span>
                  </div>
                </div>
                <div className="w-full h-0.5 sm:h-1 bg-emerald-100 rounded-full" />
              </div>

              {/* Timer Clock */}
              <div className="w-9 h-9 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full bg-blue-600 text-white flex flex-col items-center justify-center border sm:border-2 border-white shadow-xs sm:shadow-md shrink-0">
                <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 mb-0.5" />
                <span className="text-[6px] sm:text-[7px] md:text-[7.5px] font-black">180m</span>
              </div>
            </div>

            {/* Title & Description */}
            <h3 className="text-xs sm:text-sm md:text-base font-black text-slate-900 font-['Outfit',sans-serif] group-hover:text-emerald-700 transition leading-tight mt-1 sm:mt-2 truncate sm:whitespace-normal">
              Mock Tests
            </h3>
            <p className="text-[8.5px] sm:text-[10.5px] md:text-xs text-slate-600 font-normal leading-tight mt-0.5 sm:mt-1 line-clamp-2">
              Practice with NEET-style mock tests, detailed results, scores and history.
            </p>
          </div>

          {/* Action Button: Take a Test -> */}
          <div className="pt-2 sm:pt-3 md:pt-4">
            <button
              type="button"
              className="w-full inline-flex items-center justify-center gap-0.5 sm:gap-1.5 py-1.5 sm:py-2 md:py-2.5 px-1 sm:px-3 md:px-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-[9px] sm:text-xs font-black rounded-full shadow-xs group-hover:shadow transition-all"
            >
              <span>Take a Test</span>
              <ArrowRight className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
