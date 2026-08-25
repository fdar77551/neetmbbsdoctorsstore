import React, { useState, useEffect } from 'react';
import { BookOpen, FileText, CheckCircle2, Sparkles, Zap, FileText as PdfIcon } from 'lucide-react';
import { ProductType, StoreConfig } from '../types';
import { getStoredStoreConfig, resolveImageUrl } from '../lib/storage';

interface FormatSelectionSectionProps {
  onSelectFormat: (format: ProductType) => void;
  storeConfig?: StoreConfig;
}

export const FormatSelectionSection: React.FC<FormatSelectionSectionProps> = ({ 
  onSelectFormat,
  storeConfig: propStoreConfig
}) => {
  const [config, setConfig] = useState<StoreConfig>(() => propStoreConfig || getStoredStoreConfig());
  const [hardcopyImgError, setHardcopyImgError] = useState(false);
  const [softcopyImgError, setSoftcopyImgError] = useState(false);

  useEffect(() => {
    if (propStoreConfig) {
      setConfig(propStoreConfig);
    }
  }, [propStoreConfig]);

  useEffect(() => {
    const handleConfigUpdate = () => {
      setConfig(getStoredStoreConfig());
    };
    window.addEventListener('neetmbbs_store_config_updated', handleConfigUpdate);
    return () => window.removeEventListener('neetmbbs_store_config_updated', handleConfigUpdate);
  }, []);

  const hasCustomHardcopy = !!config.hardcopyCardImage && !hardcopyImgError && (config.hardcopyCardImage.startsWith('http') || config.hardcopyCardImage.startsWith('data:') || config.hardcopyCardImage.startsWith('/'));
  const hardcopySrc = hasCustomHardcopy ? resolveImageUrl(config.hardcopyCardImage!) : '';

  const hasCustomSoftcopy = !!config.softcopyCardImage && !softcopyImgError && (config.softcopyCardImage.startsWith('http') || config.softcopyCardImage.startsWith('data:') || config.softcopyCardImage.startsWith('/'));
  const softcopySrc = hasCustomSoftcopy ? resolveImageUrl(config.softcopyCardImage!) : '';

  return (
    <section id="choose-format-section" className="space-y-2 pt-1 pb-1">
      {/* ================= HEADER ================= */}
      {/* "— • — Choose Your Format — • —" with subtitle "Study your way, anytime, anywhere." */}
      <div className="text-center space-y-0.5 py-0.5 mb-1">
        <div className="flex items-center justify-center gap-1.5">
          <div className="flex items-center gap-1 opacity-60">
            <span className="w-6 h-[1.5px] bg-blue-400 rounded-full" />
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
          </div>
          
          <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight font-['Outfit',sans-serif]">
            Choose Your Format
          </h2>

          <div className="flex items-center gap-1 opacity-60">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            <span className="w-6 h-[1.5px] bg-blue-400 rounded-full" />
          </div>
        </div>

        <p className="text-[10.5px] sm:text-xs text-slate-500 font-medium leading-none">
          Study your way, anytime, anywhere.
        </p>
      </div>

      {/* ================= FORMAT CARDS ================= */}
      <div className="grid grid-cols-1 gap-3">
        {/* ================= CARD 1: HARDCOPY PHYSICAL BOOKS ================= */}
        <div
          id="format-card-hardcopy"
          onClick={() => onSelectFormat('book')}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#fff8f1] via-[#fffbf7] to-[#fed7aa]/35 border border-orange-200/90 p-3.5 sm:p-4 shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer"
        >
          {/* Subtle warm glow background accent */}
          <div className="absolute -right-4 -top-4 w-36 h-36 bg-orange-200/45 rounded-full blur-xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-12 gap-2.5 items-center">
            {/* Left Info Column */}
            <div className="col-span-7 space-y-2 pr-1">
              {/* Icon & Title */}
              <div className="flex items-start gap-1.5">
                <div className="w-7 h-7 rounded-lg bg-orange-500 text-white flex items-center justify-center shadow-2xs shrink-0 mt-0.5">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-[15px] font-black text-slate-900 leading-none font-['Outfit',sans-serif]">
                    Hardcopy
                  </h3>
                  <h4 className="text-xs sm:text-[13px] font-bold text-slate-800 font-['Outfit',sans-serif] mt-0.5 leading-none">
                    Physical Books
                  </h4>
                </div>
              </div>

              {/* Description */}
              <p className="text-[10px] sm:text-[11px] text-slate-600 leading-tight font-medium line-clamp-1">
                Premium quality printed books delivered to your doorstep.
              </p>

              {/* Feature Points */}
              <ul className="space-y-1 text-[9.5px] sm:text-[10px] text-slate-700 font-medium">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-orange-500 fill-orange-100 shrink-0" />
                  <span>High quality print</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-orange-500 fill-orange-100 shrink-0" />
                  <span>Easy to read & study</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-orange-500 fill-orange-100 shrink-0" />
                  <span>Fast & safe delivery</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-orange-500 fill-orange-100 shrink-0" />
                  <span>Best for long-term preparation</span>
                </li>
              </ul>

              {/* Action Button */}
              <div className="pt-0.5">
                <button
                  type="button"
                  id="explore-hardcopy-btn"
                  className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-black text-[10.5px] sm:text-[11px] rounded-xl shadow-2xs transition cursor-pointer"
                >
                  Explore Hardcopy Books
                </button>
              </div>
            </div>

            {/* Right Side: Seamlessly Blended Hardcopy Realistic Image View or Built-in 3D Mockup */}
            <div className="col-span-5 flex items-center justify-end relative select-none">
              {hasCustomHardcopy ? (
                <div className="relative w-full rounded-xl overflow-hidden bg-gradient-to-br from-amber-50/80 via-[#fff8f1] to-orange-100/60 border border-orange-200/70 shadow-2xs aspect-[4/3] min-h-[118px] sm:min-h-[135px] max-h-[155px] flex items-center justify-center p-1">
                  <div className="absolute top-1.5 right-1.5 z-20 flex items-center gap-1 bg-white/90 backdrop-blur-xs px-1.5 py-0.5 rounded-full border border-orange-200/80 shadow-2xs text-[7.5px] font-extrabold text-orange-800 uppercase tracking-tight">
                    <Sparkles className="w-2.5 h-2.5 text-orange-500" />
                    <span>Printed</span>
                  </div>
                  <img
                    src={hardcopySrc}
                    alt="Hardcopy Physical Books Mockup"
                    className="w-full h-full object-cover object-center rounded-lg transition-transform duration-300 group-hover:scale-103"
                    referrerPolicy="no-referrer"
                    onError={() => setHardcopyImgError(true)}
                  />
                  <div className="absolute inset-0 rounded-lg ring-1 ring-inset ring-orange-950/10 pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-t from-orange-950/15 via-transparent to-transparent pointer-events-none rounded-lg" />
                </div>
              ) : (
                /* Built-in Realistic 3D Standing Book + 5 Stacked Volume Spines */
                <div className="relative flex items-end justify-center w-full min-h-[118px] sm:min-h-[132px] py-0.5">
                  {/* Standing Book */}
                  <div 
                    className="relative z-10 w-[74px] sm:w-[84px] h-[112px] sm:h-[124px] rounded-r-md rounded-l-xs shadow-md bg-slate-950 border border-slate-700/80 overflow-hidden flex flex-col justify-between p-1.5 text-center text-white transform -rotate-y-12 rotate-y-[-8deg] rotate-x-[3deg] transition-transform duration-300 group-hover:scale-103"
                  >
                    {/* Top Emblem & Header */}
                    <div className="flex flex-col items-center pt-0.5">
                      <div className="w-3.5 h-3.5 rounded-full border border-amber-400/90 flex items-center justify-center bg-amber-500/20 mb-0.5 shadow-xs">
                        <span className="text-[7px] text-amber-400 font-black">⚕</span>
                      </div>
                      <span className="text-[7.5px] sm:text-[8px] font-black text-amber-400 tracking-tight leading-none uppercase">
                        NEET UG 2026
                      </span>
                      <span className="text-[6.5px] sm:text-[7px] font-black text-white tracking-tight leading-tight mt-0.5">
                        COMPLETE<br />STUDY PACKAGE
                      </span>
                    </div>

                    {/* Colored Subject Badges */}
                    <div className="space-y-0.5 py-0.5">
                      <div className="bg-blue-600 text-white text-[5.5px] sm:text-[6.5px] font-black py-0.2 px-0.5 rounded shadow-2xs uppercase tracking-wider">
                        PHYSICS
                      </div>
                      <div className="bg-emerald-600 text-white text-[5.5px] sm:text-[6.5px] font-black py-0.2 px-0.5 rounded shadow-2xs uppercase tracking-wider">
                        CHEMISTRY
                      </div>
                      <div className="bg-amber-600 text-white text-[5.5px] sm:text-[6.5px] font-black py-0.2 px-0.5 rounded shadow-2xs uppercase tracking-wider">
                        BIOLOGY
                      </div>
                    </div>

                    {/* Subtle Stationery Detail (Pens & Clips) */}
                    <div className="pt-0.5 flex justify-center items-center gap-1 opacity-70">
                      <div className="w-1.5 h-3 bg-red-500 rounded-full transform rotate-12" />
                      <div className="w-1.5 h-3.5 bg-blue-500 rounded-full" />
                      <div className="w-1.5 h-3 bg-yellow-400 rounded-full transform -rotate-12" />
                    </div>

                    <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-r from-black/70 via-white/10 to-transparent pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent pointer-events-none" />
                  </div>

                  {/* 5 Stacked Books on the Right */}
                  <div className="relative -ml-2 z-0 flex flex-col justify-end gap-[1.5px] w-[46px] sm:w-[54px] mb-0.5">
                    <div className="h-[16px] sm:h-[18px] bg-[#1e293b] rounded-r-xs border-y border-r border-slate-600 shadow-2xs flex items-center justify-between px-1">
                      <span className="text-[5.5px] sm:text-[6.5px] font-black text-slate-100 tracking-wider uppercase truncate">PHYSICS</span>
                      <span className="text-[6px] text-blue-400">⚛</span>
                    </div>
                    <div className="h-[16px] sm:h-[18px] bg-[#0f766e] rounded-r-xs border-y border-r border-teal-500 shadow-2xs flex items-center justify-between px-1">
                      <span className="text-[5.5px] sm:text-[6.5px] font-black text-teal-100 tracking-wider uppercase truncate">CHEMISTRY</span>
                      <span className="text-[6px] text-teal-200">⚗</span>
                    </div>
                    <div className="h-[16px] sm:h-[18px] bg-[#854d0e] rounded-r-xs border-y border-r border-yellow-600 shadow-2xs flex items-center justify-between px-1">
                      <span className="text-[5.5px] sm:text-[6.5px] font-black text-amber-100 tracking-wider uppercase truncate">BIOLOGY</span>
                      <span className="text-[6px] text-amber-200">🌿</span>
                    </div>
                    <div className="h-[16px] sm:h-[18px] bg-[#4338ca] rounded-r-xs border-y border-r border-indigo-500 shadow-2xs flex items-center justify-between px-1">
                      <span className="text-[5.5px] sm:text-[6.5px] font-black text-indigo-100 tracking-wider uppercase truncate">NCERT NOTES</span>
                      <span className="text-[6px] text-indigo-200">📖</span>
                    </div>
                    <div className="h-[16px] sm:h-[18px] bg-[#1e3a8a] rounded-r-xs border-y border-r border-blue-700 shadow-2xs flex items-center justify-between px-1">
                      <span className="text-[5.5px] sm:text-[6.5px] font-black text-blue-100 tracking-wider uppercase truncate">PYQ SOLVED</span>
                      <span className="text-[6px] text-blue-200">📋</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================= CARD 2: SOFTCOPY PDF BOOKS ================= */}
        <div
          id="format-card-softcopy"
          onClick={() => onSelectFormat('pdf')}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#f0f7ff] via-[#f8fafc] to-[#bfdbfe]/35 border border-blue-200/90 p-3.5 sm:p-4 shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer"
        >
          {/* Subtle blue glow background accent */}
          <div className="absolute -right-4 -top-4 w-36 h-36 bg-blue-200/45 rounded-full blur-xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-12 gap-2.5 items-center">
            {/* Left Info Column */}
            <div className="col-span-7 space-y-2 pr-1">
              {/* Icon & Title */}
              <div className="flex items-start gap-1.5">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-2xs shrink-0 mt-0.5">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-[15px] font-black text-slate-900 leading-none font-['Outfit',sans-serif]">
                    Softcopy
                  </h3>
                  <h4 className="text-xs sm:text-[13px] font-bold text-slate-800 font-['Outfit',sans-serif] mt-0.5 leading-none">
                    PDF Books
                  </h4>
                </div>
              </div>

              {/* Description */}
              <p className="text-[10px] sm:text-[11px] text-slate-600 leading-tight font-medium line-clamp-1">
                Instant downloadable PDFs access anytime, anywhere.
              </p>

              {/* Feature Points */}
              <ul className="space-y-1 text-[9.5px] sm:text-[10px] text-slate-700 font-medium">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-blue-600 fill-blue-100 shrink-0" />
                  <span>Instant download</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-blue-600 fill-blue-100 shrink-0" />
                  <span>Study on any device</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-blue-600 fill-blue-100 shrink-0" />
                  <span>Search & easy navigation</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-blue-600 fill-blue-100 shrink-0" />
                  <span>Eco-friendly & affordable</span>
                </li>
              </ul>

              {/* Action Button */}
              <div className="pt-0.5">
                <button
                  type="button"
                  id="explore-pdf-btn"
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-[10.5px] sm:text-[11px] rounded-xl shadow-2xs transition cursor-pointer"
                >
                  Explore PDF Books
                </button>
              </div>
            </div>

            {/* Right Side: Seamlessly Blended Softcopy Realistic Image View or Built-in 3D Mockup */}
            <div className="col-span-5 flex items-center justify-end relative select-none">
              {hasCustomSoftcopy ? (
                <div className="relative w-full rounded-xl overflow-hidden bg-gradient-to-br from-sky-50/80 via-[#f0f7ff] to-blue-100/60 border border-blue-200/70 shadow-2xs aspect-[4/3] min-h-[118px] sm:min-h-[135px] max-h-[155px] flex items-center justify-center p-1">
                  <div className="absolute top-1.5 right-1.5 z-20 flex items-center gap-1 bg-white/90 backdrop-blur-xs px-1.5 py-0.5 rounded-full border border-blue-200/80 shadow-2xs text-[7.5px] font-extrabold text-blue-800 uppercase tracking-tight">
                    <Zap className="w-2.5 h-2.5 text-blue-600" />
                    <span>Instant</span>
                  </div>
                  <img
                    src={softcopySrc}
                    alt="Softcopy PDF Notes Mockup"
                    className="w-full h-full object-cover object-center rounded-lg transition-transform duration-300 group-hover:scale-103"
                    referrerPolicy="no-referrer"
                    onError={() => setSoftcopyImgError(true)}
                  />
                  <div className="absolute inset-0 rounded-lg ring-1 ring-inset ring-blue-950/10 pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-950/15 via-transparent to-transparent pointer-events-none rounded-lg" />
                </div>
              ) : (
                /* Built-in Realistic Tablet + Phone + 3D Red PDF Badge Graphic */
                <div className="relative flex items-center justify-center w-full min-h-[118px] sm:min-h-[132px] py-0.5">
                  {/* Floating Red PDF 3D Badge */}
                  <div className="absolute top-0 right-0 z-30 flex flex-col items-center bg-white p-1 rounded-lg border border-red-200 shadow-xs">
                    <div className="w-4.5 h-4.5 rounded-xs bg-red-50 text-red-600 flex items-center justify-center">
                      <PdfIcon className="w-3 h-3 text-red-600" />
                    </div>
                    <span className="text-[6.5px] font-black text-red-600 uppercase tracking-tight mt-0.5">
                      PDF
                    </span>
                  </div>

                  {/* Main Tablet Mockup */}
                  <div 
                    className="relative z-10 w-[88px] sm:w-[100px] h-[112px] sm:h-[124px] bg-slate-900 rounded-lg p-1 shadow-md border border-slate-800 flex flex-col justify-between transform transition-transform duration-300 group-hover:scale-102"
                  >
                    <div className="w-full h-full bg-white rounded-xs p-1 flex flex-col justify-between overflow-hidden relative">
                      <div className="text-center pb-0.5 border-b border-slate-100">
                        <span className="text-[6.5px] sm:text-[7.5px] font-black text-emerald-700 uppercase tracking-tight block leading-tight">
                          NEET BIOLOGY
                        </span>
                        <span className="text-[5px] font-bold text-slate-500 uppercase tracking-tighter block">
                          NCERT LINE-BY-LINE NOTES
                        </span>
                      </div>

                      {/* Biological diagram preview */}
                      <div className="space-y-0.5 py-0.5">
                        <div className="flex items-center justify-center">
                          <div className="relative w-6 h-6 flex items-center justify-center">
                            <div className="w-4.5 h-4.5 rounded-full border border-purple-400 bg-purple-50 flex items-center justify-center">
                              <div className="w-2.5 h-2.5 rounded-full border border-emerald-500 bg-emerald-100" />
                            </div>
                            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border border-rose-400 bg-rose-50" />
                          </div>
                        </div>

                        <div className="space-y-0.5 px-0.5">
                          <div className="h-0.5 bg-slate-200 rounded-full w-full" />
                          <div className="h-0.5 bg-slate-200 rounded-full w-4/5" />
                        </div>
                      </div>

                      <div className="pt-0.5 border-t border-slate-100 flex items-center justify-between text-[5.5px] text-slate-400 font-medium">
                        <span>Pg 1/48</span>
                        <span className="text-blue-600 font-bold">100% Verified</span>
                      </div>
                    </div>
                  </div>

                  {/* Smartphone Mockup in front */}
                  <div 
                    className="absolute bottom-0 right-0 z-20 w-[40px] sm:w-[48px] h-[72px] sm:h-[80px] bg-slate-900 rounded-md p-0.5 shadow-xl border border-slate-800 transform transition-transform duration-300 group-hover:translate-x-0.5"
                  >
                    <div className="w-full h-full bg-white rounded-xs p-0.5 flex flex-col justify-between overflow-hidden">
                      <div className="text-center">
                        <span className="text-[5.5px] font-black text-blue-700 leading-none block truncate">
                          NEET PHYSICS
                        </span>
                        <span className="text-[4.5px] text-slate-400 block leading-none">
                          FORMULAS
                        </span>
                      </div>
                      <div className="space-y-0.5 my-auto px-0.5">
                        <div className="h-0.5 bg-blue-400 rounded-full w-full" />
                        <div className="h-0.5 bg-slate-200 rounded-full w-3/4" />
                      </div>
                      <div className="h-0.5 bg-blue-600 rounded-xs w-full" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

