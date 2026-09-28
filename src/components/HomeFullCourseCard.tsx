import React, { useState } from 'react';
import { 
  GraduationCap, 
  Sparkles, 
  BookOpen, 
  Zap, 
  CheckCircle2, 
  ExternalLink, 
  ArrowRight, 
  FolderOpen,
  Lock,
  Unlock,
  ShieldCheck,
  Layers,
  ChevronRight,
  Atom,
  Flame,
  Dna
} from 'lucide-react';
import { NeetFullCourseConfig, UserProfile, Order } from '../types';
import { hasUserPurchasedFullCourse, fetchVerifiedCourseAccess } from '../lib/fullCourseData';

interface HomeFullCourseCardProps {
  config: NeetFullCourseConfig;
  userProfile?: UserProfile | null;
  orders?: Order[];
  onViewCourse: () => void;
  onQuickBuy?: () => void;
  onRequireAuth?: () => void;
}

export const HomeFullCourseCard: React.FC<HomeFullCourseCardProps> = ({
  config,
  userProfile,
  orders,
  onViewCourse,
  onQuickBuy,
  onRequireAuth
}) => {
  const [isAccessing, setIsAccessing] = useState(false);
  const isPurchased = hasUserPurchasedFullCourse(userProfile, orders);

  const sampleLink = config.sampleDriveLink || 'https://drive.google.com/drive/folders/1Mdq8czw42v-QaSegmWnWjq9Vmb5qAWZH';

  const handleAccessClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAccessing(true);
    try {
      const res = await fetchVerifiedCourseAccess(userProfile?.email, userProfile?.uid);
      if (res.success && res.accessUrl) {
        window.open(res.accessUrl, '_blank', 'noopener,noreferrer');
      } else {
        // Fallback to sample or open course page
        onViewCourse();
      }
    } finally {
      setIsAccessing(false);
    }
  };

  const handleSampleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(sampleLink, '_blank', 'noopener,noreferrer');
  };

  const discountPercent = config.originalPrice > config.price 
    ? Math.round(((config.originalPrice - config.price) / config.originalPrice) * 100) 
    : 75;

  return (
    <section className="px-3.5 sm:px-6 my-4">
      {/* Container with dynamic gradient border and inner glow */}
      <div 
        onClick={onViewCourse}
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-0.5 sm:p-1 shadow-xl hover:shadow-2xl transition-all duration-300 group cursor-pointer border border-indigo-500/30 hover:border-indigo-400/60"
      >
        {/* Animated Background Glow Highlights */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-gradient-to-br from-indigo-500/25 via-purple-500/20 to-pink-500/10 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-700" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-gradient-to-tr from-emerald-500/20 via-teal-500/15 to-cyan-500/10 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-700" />

        {/* Inner Card Content */}
        <div className="relative rounded-[14px] sm:rounded-[22px] bg-slate-900/90 backdrop-blur-xl p-4 sm:p-6 text-white overflow-hidden">
          {/* Top Banner Row: Badges & Status */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-slate-950 shadow-sm uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-slate-950 fill-current animate-pulse" />
                NEET 2026 TOPPERS CHOICE
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                <Layers className="w-2.5 h-2.5 text-blue-400" />
                Class 11 + 12
              </span>
            </div>

            {/* Purchase Status Pill */}
            {isPurchased ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 animate-pulse">
                <Unlock className="w-3 h-3" />
                Enrolled
              </span>
            ) : (
              <span className="text-[10px] sm:text-xs font-black text-amber-400 flex items-center gap-1 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                <Zap className="w-3 h-3 fill-amber-400" />
                Save {discountPercent}%
              </span>
            )}
          </div>

          {/* Main Title & Subtitle */}
          <div className="mb-3.5">
            <h3 className="text-lg sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-amber-200 tracking-tight flex items-center gap-2">
              <span>{config.title || 'NEET (11th & 12th) Full Course'}</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1 leading-snug">
              {config.subtitle || 'Complete study material for your NEET preparation — Class 11 + Class 12.'}
            </p>
          </div>

          {/* Core Subject Pills: Physics + Chemistry + Biology */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-3.5">
            <div className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-800 p-1.5 sm:p-2 rounded-xl border border-slate-700/60 transition">
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] sm:text-xs font-black text-slate-200 block truncate">Physics</span>
                <span className="text-[9px] text-slate-400 block truncate">Concepts & formulas</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-800 p-1.5 sm:p-2 rounded-xl border border-slate-700/60 transition">
              <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <Flame className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] sm:text-xs font-black text-slate-200 block truncate">Chemistry</span>
                <span className="text-[9px] text-slate-400 block truncate">Org, Inorg & Phys</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-800 p-1.5 sm:p-2 rounded-xl border border-slate-700/60 transition">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Dna className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] sm:text-xs font-black text-slate-200 block truncate">Biology</span>
                <span className="text-[9px] text-slate-400 block truncate">Botany & Zoology</span>
              </div>
            </div>
          </div>

          {/* Feature Highlights Grid (2 cols mobile, 3 cols desktop) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-2 mb-3.5 border-y border-slate-800/80 text-[11px] sm:text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">Complete study material</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">Regularly organized PDFs</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">Easy digital access</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">Learn at your own pace</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">Private Google Drive folder</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">Unlimited flexible resources</span>
            </div>
          </div>

          {/* Pricing & Call To Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            {/* Price block */}
            <div className="flex items-baseline gap-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Course Price:</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-400 font-['Outfit',sans-serif]">
                ₹{config.price}
              </span>
              {config.originalPrice > config.price && (
                <span className="text-xs text-slate-500 line-through">
                  ₹{config.originalPrice}
                </span>
              )}
              <span className="text-[9px] font-black text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                One-time
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Sample Folder Button (Always accessible before purchase) */}
              <button
                type="button"
                onClick={handleSampleClick}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700/80 transition cursor-pointer active:scale-95"
                title="View free course sample files on Google Drive"
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>View Sample</span>
              </button>

              {/* Main CTA: Access Course if purchased, or View Full Course / Buy */}
              {isPurchased ? (
                <button
                  type="button"
                  onClick={handleAccessClick}
                  disabled={isAccessing}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/25 transition cursor-pointer active:scale-95 animate-pulse"
                >
                  <Unlock className="w-4 h-4" />
                  <span>{isAccessing ? 'Opening Drive...' : 'Access Course'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewCourse();
                  }}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-xs font-black shadow-lg shadow-indigo-600/30 transition cursor-pointer active:scale-95 group-hover:translate-x-0.5"
                >
                  <span>View Full Course</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
