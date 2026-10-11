import React, { useState, useEffect } from 'react';
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
  Dna,
  Clock,
  Compass
} from 'lucide-react';
import { NeetFullCourseConfig, UserProfile, Order } from '../types';
import { hasUserPurchasedFullCourse, fetchVerifiedCourseAccess, getAllCourses } from '../lib/fullCourseData';

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
  const [allCoursesList, setAllCoursesList] = useState<NeetFullCourseConfig[]>(() => getAllCourses());
  const [selectedClassId, setSelectedClassId] = useState<string>(config?.id || 'neet-full-course-11-12');

  useEffect(() => {
    const handleUpdate = () => {
      setAllCoursesList(getAllCourses());
    };
    window.addEventListener('neetmbbs_all_courses_updated', handleUpdate);
    window.addEventListener('neetmbbs_course_config_updated', handleUpdate);
    return () => {
      window.removeEventListener('neetmbbs_all_courses_updated', handleUpdate);
      window.removeEventListener('neetmbbs_course_config_updated', handleUpdate);
    };
  }, []);

  const activeCourse = allCoursesList.find(c => c.id === selectedClassId) || config;
  const isPurchased = hasUserPurchasedFullCourse(userProfile, orders);

  const sampleLink = activeCourse.sampleDriveLink || config.sampleDriveLink || 'https://drive.google.com/drive/folders/1Mdq8czw42v-QaSegmWnWjq9Vmb5qAWZH';

  const handleAccessClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAccessing(true);
    try {
      const res = await fetchVerifiedCourseAccess(userProfile?.email, userProfile?.uid);
      if (res.success && res.accessUrl) {
        window.open(res.accessUrl, '_blank', 'noopener,noreferrer');
      } else {
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

  const discountPercent = activeCourse.originalPrice > activeCourse.price 
    ? Math.round(((activeCourse.originalPrice - activeCourse.price) / activeCourse.originalPrice) * 100) 
    : 75;

  return (
    <section className="px-3 sm:px-6 my-3 sm:my-4 max-w-7xl mx-auto font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Energetic High-Fidelity Container */}
      <div 
        onClick={onViewCourse}
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-0.5 sm:p-1 shadow-xl hover:shadow-2xl transition-all duration-300 group cursor-pointer border border-indigo-500/30 hover:border-indigo-400/60"
      >
        {/* Ambient Glowing Spotlights */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/10 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-700" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-gradient-to-tr from-emerald-500/15 via-teal-500/15 to-cyan-500/10 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-700" />

        {/* Inner Card Frame */}
        <div className="relative rounded-[14px] sm:rounded-[22px] bg-slate-900/90 backdrop-blur-xl p-3.5 sm:p-5 text-white overflow-hidden space-y-3">
          
          {/* Header Row: Category Badge + Class Filter Selector + Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-slate-950 shadow-xs uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-slate-950 fill-current animate-pulse" />
                NEET 2026 TOPPERS CHOICE
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                <Layers className="w-3 h-3 text-blue-400" />
                Comprehensive Study Material
              </span>
            </div>

            {/* Enrolled Status or Discount Badge */}
            <div className="flex items-center gap-2">
              {isPurchased ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 animate-pulse">
                  <Unlock className="w-3.5 h-3.5" />
                  Enrolled &amp; Verified
                </span>
              ) : (
                <span className="text-[11px] font-black text-amber-300 flex items-center gap-1 bg-amber-400/15 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                  <Zap className="w-3 h-3 fill-amber-300" />
                  Flat {discountPercent}% OFF
                </span>
              )}
            </div>
          </div>

          {/* Class Switching Pills Bar (Real multi-class comfortable selector) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none" onClick={(e) => e.stopPropagation()}>
            <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0 mr-1 flex items-center gap-1">
              <Compass className="w-3 h-3 text-indigo-400" />
              <span>Select Class:</span>
            </span>
            {allCoursesList.map((c) => {
              const isSelected = c.id === activeCourse.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedClassId(c.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs ring-1 ring-blue-300/40 font-black'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                  }`}
                >
                  <span>{c.targetClass || c.title}</span>
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />}
                </button>
              );
            })}
          </div>

          {/* Main Title, Subtitle & Interactive 3-Pillar Visuals */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-center">
            
            {/* Left Content (8 cols) */}
            <div className="md:col-span-8 space-y-2">
              <h3 className="text-base sm:text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-amber-200 tracking-tight leading-tight">
                {activeCourse.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed line-clamp-2">
                {activeCourse.subtitle || activeCourse.description}
              </p>

              {/* 3 Core High-Yield Subject Chips */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-1">
                <div className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 p-1.5 sm:p-2 rounded-xl border border-white/10 transition">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] sm:text-xs font-black text-slate-200 block truncate">Physics</span>
                    <span className="text-[9px] text-slate-400 block truncate">Core formula notes</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 p-1.5 sm:p-2 rounded-xl border border-white/10 transition">
                  <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                    <Flame className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] sm:text-xs font-black text-slate-200 block truncate">Chemistry</span>
                    <span className="text-[9px] text-slate-400 block truncate">Mechanisms & NCERT</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 p-1.5 sm:p-2 rounded-xl border border-white/10 transition">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Dna className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] sm:text-xs font-black text-slate-200 block truncate">Biology</span>
                    <span className="text-[9px] text-slate-400 block truncate">High-yield diagrams</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Content: Pricing & Quick Actions Card (4 cols) */}
            <div className="md:col-span-4 bg-white/5 rounded-2xl p-3 sm:p-4 border border-white/10 flex flex-col justify-between gap-3 text-center md:text-left">
              <div className="flex items-center md:items-baseline justify-between md:justify-start gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Special Course Price:
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-['Outfit',sans-serif]">
                      ₹{activeCourse.price}
                    </span>
                    {activeCourse.originalPrice > activeCourse.price && (
                      <span className="text-xs sm:text-sm text-slate-500 line-through">
                        ₹{activeCourse.originalPrice}
                      </span>
                    )}
                  </div>
                </div>

                <span className="text-[10px] font-black text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                  Lifetime Access
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSampleClick}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700/80 transition cursor-pointer active:scale-95"
                  title="View free course sample files on Google Drive"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span>View Sample</span>
                </button>

                {isPurchased ? (
                  <button
                    type="button"
                    onClick={handleAccessClick}
                    disabled={isAccessing}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 text-xs font-black shadow-md transition cursor-pointer active:scale-95 animate-pulse"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>{isAccessing ? 'Opening...' : 'Access Course'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewCourse();
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black shadow-md shadow-indigo-600/30 transition cursor-pointer active:scale-95 group-hover:translate-x-0.5"
                  >
                    <span>View Course</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};
