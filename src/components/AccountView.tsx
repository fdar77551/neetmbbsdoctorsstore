import React, { useState, useEffect } from 'react';
import { User, LogOut, Package, ShieldCheck, Mail, Phone, Heart, FileText, Lock, ChevronRight, Sparkles, BookOpen, ExternalLink, Camera, Check, Loader2, X, Upload, Crown, GraduationCap, Unlock, CheckCircle2 } from 'lucide-react';
import { UserProfile, Order, StoreConfig } from '../types';
import { BrandLogo } from './BrandLogo';
import { updateUserProfile, getStoredStoreConfig } from '../lib/storage';
import { hasUserPurchasedFullCourse, fetchVerifiedCourseAccess } from '../lib/fullCourseData';

interface AccountViewProps {
  userProfile: UserProfile | null;
  orders: Order[];
  onOpenAuth: (mode?: 'login' | 'signup') => void;
  onSignOut: () => void;
  onNavigateToOrders: () => void;
  onOpenWishlist: () => void;
  onOpenSupport: () => void;
  onNavigateToAdmin?: () => void;
  onOpenPdfLibrary?: () => void;
  onOpenNeetPass?: () => void;
  onOpenFullCourse?: () => void;
  isAdmin: boolean;
}

const PRESET_AVATARS = [
  '👨‍⚕️',
  '👩‍⚕️',
  '🩺',
  '🔬',
  '🧬',
  '🧪',
  '📚',
  '💉'
];

export const AccountView: React.FC<AccountViewProps> = ({
  userProfile,
  orders,
  onOpenAuth,
  onSignOut,
  onNavigateToOrders,
  onOpenWishlist,
  onOpenSupport,
  onNavigateToAdmin,
  onOpenPdfLibrary,
  onOpenNeetPass,
  onOpenFullCourse,
  isAdmin
}) => {
  const [storeConfig, setStoreConfig] = useState<StoreConfig>(getStoredStoreConfig());

  useEffect(() => {
    setStoreConfig(getStoredStoreConfig());
    const handleUpdate = () => setStoreConfig(getStoredStoreConfig());
    window.addEventListener('neetmbbs_store_config_updated', handleUpdate);
    return () => window.removeEventListener('neetmbbs_store_config_updated', handleUpdate);
  }, []);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const userEmail = userProfile?.email?.toLowerCase().trim();
  const userOrders = orders.filter(
    o => o.userEmail?.toLowerCase().trim() === userEmail || o.userId === userProfile?.uid
  );
  const totalOrdersCount = userOrders.length;
  const purchasedPdfsCount = userOrders.reduce((sum, ord) => {
    return sum + ord.items.filter(i => i.type === 'pdf').length;
  }, 0);

  const handleSelectPresetAvatar = (avatar: string) => {
    if (!userProfile?.email) return;
    updateUserProfile({
      email: userProfile.email,
      avatarUrl: avatar,
      photoURL: undefined
    });
    setShowAvatarPicker(false);
  };

  const handleCustomAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userProfile?.email) return;

    setUploadingAvatar(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        const res = await fetch('/api/r2/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            base64Data,
            folder: 'avatars'
          })
        });

        const data = await res.json();
        const finalUrl = (data.success && data.url) ? data.url : base64Data;
        updateUserProfile({
          email: userProfile.email,
          photoURL: finalUrl,
          avatarUrl: undefined
        });
        setUploadingAvatar(false);
        setShowAvatarPicker(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Avatar upload error:', err);
      setUploadingAvatar(false);
    }
  };

  const avatarDisplay = () => {
    if (userProfile?.photoURL) {
      return (
        <img
          src={userProfile.photoURL}
          alt={userProfile.displayName || 'Profile'}
          className="w-full h-full object-cover rounded-full"
          referrerPolicy="no-referrer"
        />
      );
    }
    if (userProfile?.avatarUrl) {
      return <span className="text-2xl">{userProfile.avatarUrl}</span>;
    }
    return userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'U';
  };

  return (
    <div className="p-4 space-y-4 pb-36 max-w-md mx-auto">
      {/* Profile Header Card */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden">
        {/* Subtle Ambient Background Light */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3.5 relative z-10">
          <div className="relative group">
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-md border-2 border-blue-400/40 overflow-hidden">
              {avatarDisplay()}
            </div>
            {userProfile && (
              <button
                type="button"
                onClick={() => setShowAvatarPicker(true)}
                className="absolute -bottom-1 -right-1 bg-blue-600 hover:bg-blue-700 text-white p-1 rounded-full border border-slate-900 shadow-xs cursor-pointer transition"
                title="Change Profile Photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold truncate font-['Outfit',sans-serif]">
                {userProfile?.displayName || 'NEET Aspirant'}
              </h2>
              {isAdmin && (
                <span className="text-[9px] font-black bg-red-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                  ADMIN
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 truncate mt-0.5 font-medium">
              {userProfile?.email || 'Not logged in'}
            </p>
          </div>
        </div>

        {/* Avatar Chooser Modal / Panel */}
        {showAvatarPicker && (
          <div className="mt-4 pt-3 border-t border-slate-800 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">Choose Profile Picture</span>
              <button
                type="button"
                onClick={() => setShowAvatarPicker(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Custom Photo Upload */}
            <label className="cursor-pointer border border-dashed border-blue-400/50 hover:border-blue-400 rounded-xl p-2.5 flex items-center justify-center gap-2 bg-slate-800/60 hover:bg-slate-800 transition">
              {uploadingAvatar ? (
                <div className="flex items-center gap-2 text-xs text-blue-400 font-bold">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading to R2...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
                  <Upload className="w-4 h-4" />
                  <span>Upload Custom Photo</span>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleCustomAvatarUpload} className="hidden" />
            </label>

            {/* Quick Preset Avatars */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Or Select Doctor Avatar:</span>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_AVATARS.map((av, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPresetAvatar(av)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xl flex items-center justify-center transition border border-slate-700/60 cursor-pointer"
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {!userProfile ? (
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Sign in to save orders & notes</span>
            <button
              onClick={() => onOpenAuth('login')}
              className="px-4 py-2 bg-blue-600 text-white text-xs font-black rounded-xl shadow-xs hover:bg-blue-700 transition cursor-pointer"
            >
              Sign In / Register
            </button>
          </div>
        ) : (
          <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-center text-xs">
            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50">
              <span className="text-[10px] text-slate-400 block font-medium">Total Orders</span>
              <span className="text-sm font-black text-blue-400 font-['Outfit',sans-serif]">{totalOrdersCount}</span>
            </div>
            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50">
              <span className="text-[10px] text-slate-400 block font-medium">Digital PDFs</span>
              <span className="text-sm font-black text-emerald-400 font-['Outfit',sans-serif]">{purchasedPdfsCount}</span>
            </div>
          </div>
        )}
      </div>

      {/* Menu Options Group */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs divide-y divide-slate-100 overflow-hidden text-xs">
        {/* 0. NEET Success Pass & Digital Suite */}
        {onOpenNeetPass && (
          <button
            id="profile-menu-neet-pass"
            onClick={onOpenNeetPass}
            className="w-full p-4 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent hover:bg-amber-500/15 transition text-left cursor-pointer active:bg-amber-500/20"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-xs border border-amber-300">
                <Crown className="w-5 h-5 fill-amber-100 text-amber-100" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-slate-900 block text-xs">NEET Success Pass & Library</span>
                  <span className="text-[9px] font-black bg-amber-500 text-white px-1.5 py-0.2 rounded-full uppercase">VIP</span>
                </div>
                <span className="text-[10px] text-amber-900/80 font-medium">Digital Library, Free Resources & Student Dashboard</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-600" />
          </button>
        )}

        {/* 0B. NEET (11th & 12th) Full Course */}
        <div 
          id="profile-menu-full-course"
          onClick={async () => {
            const isPurchased = hasUserPurchasedFullCourse(userProfile, orders);
            if (isPurchased) {
              const res = await fetchVerifiedCourseAccess(userProfile?.email, userProfile?.uid);
              if (res.success && res.accessUrl) {
                window.open(res.accessUrl, '_blank', 'noopener,noreferrer');
                return;
              }
            }
            if (onOpenFullCourse) {
              onOpenFullCourse();
            }
          }}
          className="w-full p-4 flex items-center justify-between bg-gradient-to-r from-indigo-500/10 via-blue-500/10 to-transparent hover:bg-indigo-500/15 transition text-left cursor-pointer active:bg-indigo-500/20"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-xs border border-indigo-300">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-slate-900 block text-xs">NEET (11th & 12th) Full Course</span>
                {hasUserPurchasedFullCourse(userProfile, orders) ? (
                  <span className="text-[9px] font-black bg-emerald-500 text-white px-1.5 py-0.2 rounded-full uppercase">
                    Purchased
                  </span>
                ) : (
                  <span className="text-[9px] font-black bg-indigo-600 text-white px-1.5 py-0.2 rounded-full uppercase">
                    Full Bundle
                  </span>
                )}
              </div>
              <span className="text-[10px] text-indigo-900/80 font-medium">
                {hasUserPurchasedFullCourse(userProfile, orders)
                  ? 'Access Main Google Drive Study Folder'
                  : 'Complete Class 11 + 12 Study Material on Google Drive'}
              </span>
            </div>
          </div>
          {hasUserPurchasedFullCourse(userProfile, orders) ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black bg-emerald-600 text-white shadow-xs animate-pulse">
              <Unlock className="w-3 h-3" />
              <span>Access Course</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </span>
          ) : (
            <ChevronRight className="w-4 h-4 text-indigo-600" />
          )}
        </div>

        {/* 1. Orders & Invoices */}
        <button
          id="profile-menu-orders"
          onClick={onNavigateToOrders}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition text-left cursor-pointer active:bg-slate-100"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-2xs">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 block text-xs">My Orders & Invoices</span>
              <span className="text-[10px] text-slate-500">Track shipments & view bills</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        {/* 2. PDF Library */}
        <button
          id="profile-menu-pdf-library"
          onClick={() => {
            if (onOpenPdfLibrary) {
              onOpenPdfLibrary();
            } else {
              onNavigateToOrders();
            }
          }}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition text-left cursor-pointer active:bg-slate-100"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-2xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 block text-xs">PDF Notes Library</span>
              <span className="text-[10px] text-slate-500">Instant access to purchased study files</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        {/* 3. Wishlist */}
        <button
          id="profile-menu-wishlist"
          onClick={onOpenWishlist}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition text-left cursor-pointer active:bg-slate-100"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shadow-2xs">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 block text-xs">My Wishlist</span>
              <span className="text-[10px] text-slate-500">Saved NEET books & test papers</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        {/* Admin Management Console (If Authorized Admin) */}
        {isAdmin && onNavigateToAdmin && (
          <button
            id="profile-menu-admin"
            onClick={onNavigateToAdmin}
            className="w-full p-4 flex items-center justify-between bg-blue-50/70 hover:bg-blue-100/70 transition text-left border-l-4 border-blue-600 cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="font-black text-blue-950 block text-xs">Admin Management Console</span>
                <span className="text-[10px] text-blue-700">Upload books, accept orders & manage users</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-blue-700" />
          </button>
        )}

        {/* 4. Help & Support */}
        <button
          id="profile-menu-support"
          onClick={onOpenSupport}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition text-left cursor-pointer active:bg-slate-100"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200 shadow-2xs">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 block text-xs">Help & Support</span>
              <span className="text-[10px] text-slate-500">
                {storeConfig.supportEmails.filter(Boolean).slice(0, 2).join(' • ') || 'Customer Care & Helplines'}
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Logout Button */}
      {userProfile && (
        <button
          onClick={onSignOut}
          className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition border border-red-100 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out of Account</span>
        </button>
      )}

      {/* Brand Watermark */}
      <div className="pt-2 flex flex-col items-center justify-center opacity-70 space-y-1">
        <BrandLogo size="sm" />
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          NEET MBBS Doctors Store • 2026
        </span>
      </div>
    </div>
  );
};
