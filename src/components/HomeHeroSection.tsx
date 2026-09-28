import React from 'react';
import { ArrowRight } from 'lucide-react';
import { ProductType } from '../types';

interface HomeHeroSectionProps {
  onExploreMockTests: () => void;
  onExploreBooks: (type?: ProductType) => void;
  activeTab?: ProductType;
}

export const HomeHeroSection: React.FC<HomeHeroSectionProps> = ({
  onExploreMockTests,
  onExploreBooks
}) => {
  return (
    <div id="home-hero-prepare-smarter" className="w-full">
      {/* 
        Hero Showcase Card exactly inspired by Reference Image:
        "Prepare Smarter. Practice Better. Achieve Your NEET Goal."
        Doctor illustration, stacked subject books (Physics, Chemistry, Biology),
        "BIG DREAMS NEET 2026", and high-yield action buttons.
        Mobile-first compact design that fits within ~25-35% viewport height.
      */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#ebf5ff] via-[#f2f8ff] to-[#dbeafe] border border-blue-200/70 p-3 sm:p-5 md:p-7 shadow-xs">
        {/* Soft background ambient accents */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-sky-200/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-48 bg-blue-100/40 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-12 gap-2 sm:gap-4 md:gap-5 items-center">
          {/* Left Column: Headlines & Call-to-Actions (7 cols) */}
          <div className="col-span-7 sm:col-span-7 md:col-span-7 space-y-1.5 sm:space-y-2.5 md:space-y-3">
            {/* Pill Badge: NEET 2026 */}
            <div className="inline-flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-blue-100/90 text-blue-700 text-[9px] sm:text-xs font-black tracking-wide border border-blue-200">
              <span>NEET 2026</span>
            </div>

            {/* Main Triple-Line Headline */}
            <div className="space-y-0 sm:space-y-0.5">
              <h1 className="text-[17px] sm:text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 font-['Outfit',sans-serif] tracking-tight leading-[1.12]">
                Prepare Smarter.
              </h1>
              <h2 className="text-[17px] sm:text-2xl md:text-3xl lg:text-4xl font-black text-blue-600 font-['Outfit',sans-serif] tracking-tight leading-[1.12]">
                Practice Better.
              </h2>
              <h2 className="text-[17px] sm:text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 font-['Outfit',sans-serif] tracking-tight leading-[1.12]">
                Achieve Your NEET Goal.
              </h2>
            </div>

            {/* Subtext description */}
            <p className="text-[10px] sm:text-xs md:text-sm text-slate-600 font-normal leading-tight sm:leading-relaxed line-clamp-2 sm:line-clamp-none max-w-xs sm:max-w-lg">
              Explore NEET books, digital study material and exam-pattern mock tests — all in one place.
            </p>

            {/* Two Action Buttons */}
            <div className="pt-1 sm:pt-2 flex flex-wrap items-center gap-1.5 sm:gap-2.5 md:gap-3">
              <button
                type="button"
                id="hero-btn-explore-mock-tests"
                onClick={onExploreMockTests}
                className="inline-flex items-center justify-center gap-1 sm:gap-2 px-2.5 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-[10px] sm:text-xs md:text-sm font-black rounded-full shadow-2xs sm:shadow-sm hover:shadow transition-all cursor-pointer select-none"
              >
                <span>Explore Mock Tests</span>
                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>

              <button
                type="button"
                id="hero-btn-browse-material"
                onClick={() => onExploreBooks('book')}
                className="inline-flex items-center justify-center gap-1 sm:gap-2 px-2.5 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5 bg-white hover:bg-blue-50/60 active:scale-98 text-blue-600 text-[10px] sm:text-xs md:text-sm font-black rounded-full border border-blue-300 shadow-2xs transition-all cursor-pointer select-none"
              >
                <span>Browse Study Material</span>
              </button>
            </div>
          </div>

          {/* Right Column: Doctor / NEET Aspirant Graphic Lockup (5 cols) */}
          <div className="col-span-5 sm:col-span-5 md:col-span-5 flex items-center justify-center select-none">
            <div className="relative w-full max-w-[150px] sm:max-w-[220px] md:max-w-[320px] rounded-xl sm:rounded-2xl bg-gradient-to-br from-white/95 via-sky-50 to-blue-100/70 p-2 sm:p-2.5 md:p-3 border border-blue-200/80 shadow-xs flex flex-col justify-between overflow-hidden">
              {/* Top Card: BIG DREAMS NEET 2026 */}
              <div className="flex items-center justify-between gap-1 mb-1">
                <div className="bg-blue-50/90 border border-blue-200 rounded-lg px-1.5 py-0.5 shadow-2xs">
                  <span className="text-[7px] sm:text-[8px] md:text-[9px] font-black uppercase text-blue-800 tracking-wider block">
                    BIG DREAMS
                  </span>
                  <div className="flex items-center gap-0.5">
                    <span className="text-[8px] sm:text-[10px] md:text-xs font-black text-blue-600">NEET 2026</span>
                    <span className="text-[8px] sm:text-[10px] text-rose-500">♥</span>
                  </div>
                </div>

                <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-[9px] sm:text-xs shadow-2xs shrink-0">
                  ⚕
                </div>
              </div>

              {/* Center Illustration: Stacked Colored Books + Stethoscope & Medical Badge */}
              <div className="flex items-end justify-center gap-1.5 sm:gap-2.5 md:gap-3 my-0.5 sm:my-1">
                {/* Stack of Colored Subject Books */}
                <div className="flex flex-col gap-0.5 sm:gap-1 w-14 sm:w-20 md:w-24">
                  <div className="bg-blue-600 text-white text-[6.5px] sm:text-[7.5px] md:text-[8px] font-black py-0.5 sm:py-1 px-1 sm:px-2 rounded sm:rounded-md shadow-2xs text-center tracking-wider uppercase">
                    PHYSICS
                  </div>
                  <div className="bg-rose-600 text-white text-[6.5px] sm:text-[7.5px] md:text-[8px] font-black py-0.5 sm:py-1 px-1 sm:px-2 rounded sm:rounded-md shadow-2xs text-center tracking-wider uppercase">
                    CHEMISTRY
                  </div>
                  <div className="bg-emerald-600 text-white text-[6.5px] sm:text-[7.5px] md:text-[8px] font-black py-0.5 sm:py-1 px-1 sm:px-2 rounded sm:rounded-md shadow-2xs text-center tracking-wider uppercase">
                    BIOLOGY
                  </div>
                </div>

                {/* Stethoscope & Medical Doctor Symbol Badge */}
                <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-white border sm:border-2 border-blue-400 shadow-sm flex flex-col items-center justify-center p-0.5 sm:p-1 relative shrink-0">
                  <div className="text-base sm:text-xl md:text-2xl leading-none">🩺</div>
                  <span className="text-[6px] sm:text-[7px] md:text-[8px] font-black text-blue-900 uppercase tracking-tighter mt-0.5">
                    Future Doctor
                  </span>
                  <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-3 h-3 sm:w-4 sm:h-4 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[6px] sm:text-[8px] font-black border border-white">
                    ✓
                  </div>
                </div>
              </div>

              {/* Bottom Tagline */}
              <div className="text-center pt-0.5 sm:pt-1 border-t border-blue-100">
                <span className="text-[7px] sm:text-[8.5px] md:text-[9.5px] font-bold text-slate-500 block truncate">
                  Curated by MBBS Doctors • NCERT
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
