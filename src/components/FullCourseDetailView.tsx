import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Sparkles, 
  CheckCircle2, 
  ExternalLink, 
  FolderOpen, 
  Lock, 
  Unlock, 
  ShieldCheck, 
  Zap, 
  BookOpen, 
  Layers, 
  Clock, 
  Share2, 
  Flame, 
  Dna, 
  Atom, 
  FileText, 
  HelpCircle,
  Award,
  ChevronRight,
  Download,
  Smartphone,
  Globe
} from 'lucide-react';
import { NeetFullCourseConfig, UserProfile, Order } from '../types';
import { hasUserPurchasedFullCourse, fetchVerifiedCourseAccess } from '../lib/fullCourseData';
import { ReviewSection } from './ReviewSection';

interface FullCourseDetailViewProps {
  config: NeetFullCourseConfig;
  userProfile?: UserProfile | null;
  orders?: Order[];
  onBack: () => void;
  onEnrollCourse: () => void;
  onOpenAuth: (mode?: 'login' | 'signup') => void;
  onOpenSupport?: () => void;
}

export const FullCourseDetailView: React.FC<FullCourseDetailViewProps> = ({
  config,
  userProfile,
  orders,
  onBack,
  onEnrollCourse,
  onOpenAuth,
  onOpenSupport
}) => {
  const [isVerifyingAccess, setIsVerifyingAccess] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const isPurchased = hasUserPurchasedFullCourse(userProfile, orders);
  const sampleLink = config.sampleDriveLink || 'https://drive.google.com/drive/folders/1Mdq8czw42v-QaSegmWnWjq9Vmb5qAWZH';

  const handleOpenSample = () => {
    window.open(sampleLink, '_blank', 'noopener,noreferrer');
  };

  const handleAccessMainCourse = async () => {
    setIsVerifyingAccess(true);
    setAccessError(null);
    try {
      const res = await fetchVerifiedCourseAccess(userProfile?.email, userProfile?.uid);
      if (res.success && res.accessUrl) {
        window.open(res.accessUrl, '_blank', 'noopener,noreferrer');
      } else {
        setAccessError(res.message || 'Could not verify course access. Please contact support or re-login.');
      }
    } catch (err: any) {
      setAccessError('Error connecting to access server. Please retry.');
    } finally {
      setIsVerifyingAccess(false);
    }
  };

  const handleBuyClick = () => {
    if (!userProfile) {
      onOpenAuth('login');
      return;
    }
    onEnrollCourse();
  };

  const handleShare = () => {
    try {
      if (navigator.share) {
        navigator.share({
          title: config.title || 'NEET (11th & 12th) Full Course',
          text: 'Complete NEET preparation study material for Class 11 + Class 12 on Google Drive!',
          url: window.location.href
        });
      } else {
        navigator.clipboard.writeText(window.location.href);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch (e) {}
  };

  const discountPercent = config.originalPrice > config.price 
    ? Math.round(((config.originalPrice - config.price) / config.originalPrice) * 100) 
    : 75;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-28 animate-in fade-in duration-200">
      {/* Top Sticky Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3.5 sm:px-6 py-2.5 flex items-center justify-between shadow-2xs">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-950 transition cursor-pointer p-1.5 rounded-lg hover:bg-slate-100"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Store</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="p-2 text-slate-600 hover:text-slate-950 rounded-full hover:bg-slate-100 transition cursor-pointer text-xs font-medium flex items-center gap-1"
            title="Share Course"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">{copiedLink ? 'Copied!' : 'Share'}</span>
          </button>

          {isPurchased ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
              <Unlock className="w-3.5 h-3.5" />
              <span>Enrolled</span>
            </span>
          ) : (
            <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              ₹{config.price}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3.5 sm:px-6 py-4 space-y-5">
        {/* ================= HERO SECTION ================= */}
        <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white p-5 sm:p-8 shadow-xl overflow-hidden border border-indigo-500/30">
          {/* Subtle Accent Glows */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            {/* Top Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-sm uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 fill-current" />
                NEET 2026 TOPPERS EDITION
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                <Layers className="w-3 h-3" />
                Class 11 + Class 12 Full Syllabus
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <Globe className="w-3 h-3" />
                Google Drive Digital Access
              </span>
            </div>

            {/* Title & Subtitle */}
            <div>
              <h1 className="text-xl sm:text-3xl lg:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-amber-200 tracking-tight">
                {config.title || 'NEET (11th & 12th) Full Course'}
              </h1>
              <p className="text-xs sm:text-base text-slate-300 font-medium mt-2 max-w-2xl leading-relaxed">
                {config.subtitle || 'Complete Class 11 + Class 12 preparation material for NEET aspirants.'}
              </p>
            </div>

            {/* Price & CTA Action Bar */}
            <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-baseline gap-2.5">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Course Price:</span>
                  <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-['Outfit',sans-serif]">
                    ₹{config.price}
                  </span>
                  {config.originalPrice > config.price && (
                    <span className="text-sm text-slate-500 line-through">
                      ₹{config.originalPrice}
                    </span>
                  )}
                  <span className="text-xs font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/30">
                    {discountPercent}% OFF
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>One-time payment • Lifetime Google Drive Access • No recurring fees</span>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                {/* View Sample Button */}
                <button
                  type="button"
                  onClick={handleOpenSample}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-bold border border-slate-700 transition cursor-pointer active:scale-95 shadow-sm"
                  title="View Sample Google Drive Folder"
                >
                  <FolderOpen className="w-4 h-4 text-amber-400" />
                  <span>View Sample</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </button>

                {/* Primary CTA */}
                {isPurchased ? (
                  <button
                    type="button"
                    onClick={handleAccessMainCourse}
                    disabled={isVerifyingAccess}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 text-xs sm:text-sm font-black shadow-lg shadow-emerald-500/30 transition cursor-pointer active:scale-95 animate-pulse"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>{isVerifyingAccess ? 'Verifying Access...' : 'Access Course'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleBuyClick}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-xs sm:text-sm font-black shadow-lg shadow-indigo-600/30 transition cursor-pointer active:scale-95"
                  >
                    <Zap className="w-4 h-4 fill-white" />
                    <span>Buy Full Course</span>
                  </button>
                )}
              </div>
            </div>

            {accessError && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-200">
                {accessError}
              </div>
            )}
          </div>
        </div>

        {/* ================= 3. COURSE DETAILS: INFORMATION CARDS ================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <span>What's Inside the Full Course</span>
            </h2>
            <span className="text-[11px] font-bold text-slate-500">
              Class 11 + Class 12 Master Bundle
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Card 1: 📚 Complete Coverage */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:border-indigo-300 transition space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0 text-lg">
                  📚
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Complete Coverage</h3>
                  <p className="text-xs text-indigo-600 font-bold">Class 11 + Class 12 NEET Syllabus</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Class 11 + Class 12 NEET preparation material. Comprehensive coverage of every single topic prescribed in the latest NTA NEET UG syllabus with NCERT line pointers.
              </p>
            </div>

            {/* Card 2: ⚡ Physics */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:border-amber-300 transition space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0 text-lg">
                  ⚡
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Physics</h3>
                  <p className="text-xs text-amber-600 font-bold">Mechanics to Modern Physics</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Organized study material for NEET Physics. Includes concept revision sheets, step-by-step formula derivations, high-yield diagrams, and numerical shortcut tricks.
              </p>
            </div>

            {/* Card 3: 🧪 Chemistry */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:border-rose-300 transition space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shrink-0 text-lg">
                  🧪
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Chemistry</h3>
                  <p className="text-xs text-rose-600 font-bold">Physical, Organic & Inorganic</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Complete Chemistry preparation material. Organic reaction roadmap cheatsheets, Inorganic NCERT trend tables, and Physical Chemistry formula handbooks with solved examples.
              </p>
            </div>

            {/* Card 4: 🧬 Biology */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:border-emerald-300 transition space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0 text-lg">
                  🧬
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Biology</h3>
                  <p className="text-xs text-emerald-600 font-bold">Botany & Zoology Mastery</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Complete Biology preparation material. NCERT-extracted high-yield summary points, anatomical labelled diagrams, flowchart cycles, and quick-revision memory maps for 360/360.
              </p>
            </div>
          </div>

          {/* Card 5: 📖 Digital Study Material & Google Drive Delivery */}
          <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/80 to-purple-50/80 rounded-2xl p-4 sm:p-6 border border-indigo-200/80 space-y-3">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shrink-0 text-xl">
                📖
              </div>
              <div className="space-y-1">
                <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                  <span>Digital Study Material Delivered via Google Drive</span>
                  <span className="text-[10px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-full uppercase">
                    Admin Controlled
                  </span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  The course is delivered digitally through a dedicated, securely managed Google Drive folder.
                </p>
              </div>
            </div>

            <div className="bg-white/80 rounded-xl p-3 border border-indigo-100 text-xs text-slate-600 space-y-1.5">
              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Continuously Updated by Expert Faculty:</span>
              </p>
              <p className="leading-relaxed">
                The actual number of PDFs and study resources can vary and expands over time because the main course Drive folder is directly curated and continuously enriched by our admin and faculty team (e.g. 20, 50, 100, 200+ PDFs, revision sets, and mind maps).
              </p>
              <p className="text-[11px] text-indigo-700 font-bold">
                ✓ Once enrolled, you receive instant, permanent digital access to everything inside the folder, including all future updates at no extra cost!
              </p>
            </div>
          </div>
        </div>

        {/* ================= SAMPLE FOLDER CALLOUT ================= */}
        <div className="bg-amber-50/80 rounded-2xl p-4 sm:p-5 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-amber-600" />
              <h4 className="text-sm font-black text-amber-950">
                Want to check the study material quality first?
              </h4>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              Explore our free sample notes on Google Drive before purchasing. Free to view anytime without requiring an account or purchase.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenSample}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black shadow-sm transition cursor-pointer active:scale-95 shrink-0"
          >
            <span>View Sample</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ================= KEY ADVANTAGES GRID ================= */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 space-y-3.5">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-600" />
            <span>Why NEET Aspirants Choose This Course</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-700">
            <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block">Class 11 + Class 12 In One Bundle</span>
                <span className="text-slate-500 text-[11px]">No need to buy separate materials for 11th and 12th.</span>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block">Physics + Chemistry + Biology</span>
                <span className="text-slate-500 text-[11px]">All 3 core NEET subjects systematically organized.</span>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block">Learn At Your Own Pace</span>
                <span className="text-slate-500 text-[11px]">Lifetime access on mobile, tablet, and laptop.</span>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block">Instant Verified Digital Delivery</span>
                <span className="text-slate-500 text-[11px]">Access is granted immediately after successful payment.</span>
              </div>
            </div>
          </div>
        </div>

        {/* ================= FREQUENTLY ASKED QUESTIONS ================= */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 space-y-3">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-indigo-600" />
            <span>Frequently Asked Questions</span>
          </h3>

          <div className="space-y-2.5 text-xs">
            <details className="group bg-slate-50 rounded-xl p-3 border border-slate-100 cursor-pointer">
              <summary className="font-bold text-slate-900 flex items-center justify-between">
                <span>How will I access the course material after payment?</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-open:rotate-90 transition-transform" />
              </summary>
              <p className="text-slate-600 mt-2 leading-relaxed text-[11px]">
                As soon as your payment is verified by our secure gateway, the "Buy Now" button automatically changes to <strong>"Access Course"</strong> on this page, the homepage, and in your <strong>My Orders / Purchases</strong> tab. Clicking it opens the main Google Drive folder directly.
              </p>
            </details>

            <details className="group bg-slate-50 rounded-xl p-3 border border-slate-100 cursor-pointer">
              <summary className="font-bold text-slate-900 flex items-center justify-between">
                <span>Can I view sample study material before buying?</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-open:rotate-90 transition-transform" />
              </summary>
              <p className="text-slate-600 mt-2 leading-relaxed text-[11px]">
                Yes! Click the <strong>"View Sample"</strong> button above to open the free sample Google Drive folder. You do not need to make any purchase or log in to view the sample.
              </p>
            </details>

            <details className="group bg-slate-50 rounded-xl p-3 border border-slate-100 cursor-pointer">
              <summary className="font-bold text-slate-900 flex items-center justify-between">
                <span>How many PDFs and resources are included?</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-open:rotate-90 transition-transform" />
              </summary>
              <p className="text-slate-600 mt-2 leading-relaxed text-[11px]">
                The number of files inside the Drive folder is completely flexible and continuously managed by the admin (e.g. 20, 50, 100, 200+ PDFs). As new study materials, mock tests, and revision notes are added by our faculty, you will get access automatically without paying again.
              </p>
            </details>

            <details className="group bg-slate-50 rounded-xl p-3 border border-slate-100 cursor-pointer">
              <summary className="font-bold text-slate-900 flex items-center justify-between">
                <span>Do I have to pay every year or month?</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-open:rotate-90 transition-transform" />
              </summary>
              <p className="text-slate-600 mt-2 leading-relaxed text-[11px]">
                No! This is a one-time enrollment fee of ₹{config.price}. You receive permanent access for your NEET preparation.
              </p>
            </details>
          </div>
        </div>

        {/* ================= STUDENT REVIEWS & STAR RATINGS ================= */}
        <ReviewSection
          productId={config.id}
          productType="course"
          productTitle={config.title}
          userProfile={userProfile}
          onRequireAuth={onOpenAuth}
          baseRating={4.9}
          baseCount={142}
        />
      </div>

      {/* ================= STICKY BOTTOM BAR (MOBILE & DESKTOP) ================= */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg sm:text-xl font-black text-slate-950 font-['Outfit',sans-serif]">
                ₹{config.price}
              </span>
              {config.originalPrice > config.price && (
                <span className="text-xs text-slate-400 line-through">
                  ₹{config.originalPrice}
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-500 block truncate">
              {isPurchased ? 'Enrolled & Verified' : 'Complete 11th + 12th NEET Course'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenSample}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer active:scale-95"
            >
              <FolderOpen className="w-3.5 h-3.5 inline mr-1 text-amber-600" />
              <span>Sample</span>
            </button>

            {isPurchased ? (
              <button
                type="button"
                onClick={handleAccessMainCourse}
                disabled={isVerifyingAccess}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black shadow-md shadow-emerald-500/20 transition cursor-pointer active:scale-95 animate-pulse flex items-center gap-1.5"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>{isVerifyingAccess ? 'Opening...' : 'Access Course'}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleBuyClick}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-xs font-black shadow-md shadow-indigo-600/30 transition cursor-pointer active:scale-95 flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 fill-white" />
                <span>Buy Full Course</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
