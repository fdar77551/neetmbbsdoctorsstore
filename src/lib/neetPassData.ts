import { NeetMaterialType, NeetPassPlan, NeetPassSubjectKey, NeetSubject, Product } from '../types';

export interface PassTierInfo {
  subjectKey: NeetPassSubjectKey;
  subjectName: string;
  badge: string;
  tagline: string;
  icon: string;
  gradient: string;
  border: string;
  accentColor: string;
  features: string[];
  plans: {
    monthly: { price: number; originalPrice: number; label: string; periodText: string; savings?: string };
    yearly: { price: number; originalPrice: number; label: string; periodText: string; savings?: string };
    lifetime: { price: number; originalPrice: number; label: string; periodText: string; savings?: string };
  };
}

export const NEET_SUBJECTS: NeetSubject[] = [
  'Biology',
  'Chemistry',
  'Physics',
  'Complete PCB'
];

export const DIGITAL_LIBRARY_SUBJECTS: { key: 'Biology' | 'Chemistry' | 'Physics'; label: string; icon: string; badge: string }[] = [
  { key: 'Biology', label: 'Biology', icon: '🧬', badge: '360/360 Target' },
  { key: 'Chemistry', label: 'Chemistry', icon: '🧪', badge: '180/180 Target' },
  { key: 'Physics', label: 'Physics', icon: '⚛️', badge: '180/180 Target' }
];

export const NEET_MATERIAL_CATEGORIES: { type: NeetMaterialType; label: string; icon: string; description: string }[] = [
  { type: 'Notes', label: 'Handwritten Notes', icon: '📝', description: 'Topper handwritten concept notes & summaries' },
  { type: 'PYQs', label: 'PYQ Papers & Solutions', icon: '📅', description: 'Chapterwise 15-year NEET solved papers' },
  { type: 'MCQs', label: 'MCQs & Question Banks', icon: '🎯', description: 'Topicwise assertion-reason & clinical MCQs' },
  { type: 'Formulas', label: 'Formula Sheets', icon: '📐', description: 'Quick-revision formula sheets & cheat codes' },
  { type: 'Revision Material', label: 'Revision Material', icon: '⚡', description: 'Mindmaps, flowcharts & rapid recall charts' },
  { type: 'Tests', label: 'Chapterwise Tests', icon: '⏱️', description: 'Full mock papers & timed OMR tests' },
  { type: 'Short Notes', label: 'Short Notes', icon: '📌', description: 'High-yield crisp revision flash summaries' },
  { type: 'NCERT Content', label: 'NCERT Line by Line', icon: '📖', description: 'Direct NCERT highlighted lines & diagrams' },
  { type: 'New Content', label: 'New 2026 Material', icon: '✨', description: 'Updated NMC syllabus & latest additions' }
];

export const NEET_PASS_TIERS: Record<NeetPassSubjectKey, PassTierInfo> = {
  biology: {
    subjectKey: 'biology',
    subjectName: 'Biology Pass',
    badge: 'Botany & Zoology Complete',
    tagline: 'Unlock all 38 Biology Chapters, NCERT Line-by-Line & 15-Year PYQs',
    icon: '🧬',
    gradient: 'from-emerald-500/10 via-emerald-50 to-teal-50',
    border: 'border-emerald-200',
    accentColor: 'text-emerald-600',
    features: [
      'Full Botany & Zoology Complete Material',
      'NCERT Line-by-Line Highlighted PDFs',
      'Chapterwise 15-Year PYQ Question Banks',
      'Diagram-based Assertion & Reason MCQs',
      '1-Click Instant Downloads & Offline Reader',
      'Free 2026 NMC Syllabus Updates'
    ],
    plans: {
      monthly: { price: 99, originalPrice: 299, label: '1 Month Access', periodText: '/month', savings: '67% OFF' },
      yearly: { price: 599, originalPrice: 1499, label: '1 Year Access', periodText: '/year', savings: '60% OFF' },
      lifetime: { price: 999, originalPrice: 2499, label: 'Lifetime Access', periodText: '/lifetime', savings: 'Best Value' }
    }
  },
  chemistry: {
    subjectKey: 'chemistry',
    subjectName: 'Chemistry Pass',
    badge: 'Physical, Organic & Inorganic',
    tagline: 'Master Reaction Mechanisms, Name Reactions & Physical Formulae',
    icon: '🧪',
    gradient: 'from-cyan-500/10 via-cyan-50 to-blue-50',
    border: 'border-cyan-200',
    accentColor: 'text-cyan-600',
    features: [
      'Organic Named Reactions & Reaction Roadmaps',
      'Inorganic NCERT Extraction & Trend Tables',
      'Physical Chemistry Numerical Formula Sheets',
      'Chapterwise 15-Year Solved PYQ Banks',
      '1-Click Instant Downloads & Offline Reader',
      'Free 2026 NMC Syllabus Updates'
    ],
    plans: {
      monthly: { price: 99, originalPrice: 299, label: '1 Month Access', periodText: '/month', savings: '67% OFF' },
      yearly: { price: 599, originalPrice: 1499, label: '1 Year Access', periodText: '/year', savings: '60% OFF' },
      lifetime: { price: 999, originalPrice: 2499, label: 'Lifetime Access', periodText: '/lifetime', savings: 'Best Value' }
    }
  },
  physics: {
    subjectKey: 'physics',
    subjectName: 'Physics Pass',
    badge: 'Mechanics, Electrodynamics & Modern',
    tagline: 'Crack 160+ in Physics with High-Yield Trick Sheets & Solved Derivations',
    icon: '⚛️',
    gradient: 'from-indigo-500/10 via-indigo-50 to-purple-50',
    border: 'border-indigo-200',
    accentColor: 'text-indigo-600',
    features: [
      'All Chapter Formula Handbooks & Trick Sheets',
      'Concept Mindmaps for Difficult Mechanics Topics',
      '15-Year Step-by-Step Solved PYQ Papers',
      'High-Yield Derivations & Direct Question Bank',
      '1-Click Instant Downloads & Offline Reader',
      'Free 2026 NMC Syllabus Updates'
    ],
    plans: {
      monthly: { price: 99, originalPrice: 299, label: '1 Month Access', periodText: '/month', savings: '67% OFF' },
      yearly: { price: 599, originalPrice: 1499, label: '1 Year Access', periodText: '/year', savings: '60% OFF' },
      lifetime: { price: 999, originalPrice: 2499, label: 'Lifetime Access', periodText: '/lifetime', savings: 'Best Value' }
    }
  },
  pcb: {
    subjectKey: 'pcb',
    subjectName: 'Complete PCB Pass',
    badge: '⭐ ALL-IN-ONE TOPPER BUNDLE (BEST VALUE)',
    tagline: 'Unrestricted VIP Access to the Entire NEET Digital Library (Physics + Chemistry + Biology)',
    icon: '🏆',
    gradient: 'from-amber-500/15 via-amber-50 to-orange-50',
    border: 'border-amber-300',
    accentColor: 'text-amber-600',
    features: [
      'Full Access to ALL 3 Subjects (Physics + Chemistry + Biology)',
      '10,000+ Topicwise MCQs, PYQs & Handwritten Notes',
      'Complete Revision Mindmaps & Formula Cheatsheets',
      'All Chapterwise Tests & Full Length Mock Papers',
      'Priority Offline Downloads on All Devices',
      'Lifetime Access to New 2026 & 2027 Material'
    ],
    plans: {
      monthly: { price: 199, originalPrice: 499, label: '1 Month All PCB', periodText: '/month', savings: '60% OFF' },
      yearly: { price: 1099, originalPrice: 2999, label: '1 Year All PCB', periodText: '/year', savings: '63% OFF' },
      lifetime: { price: 1499, originalPrice: 4999, label: 'Lifetime All PCB', periodText: '/lifetime', savings: 'Toppers Choice' }
    }
  }
};

/**
 * Creates a clean virtual Product for adding a NEET Success Pass to the Cart & Checkout
 */
export function createNeetPassProduct(subjectKey: NeetPassSubjectKey, plan: NeetPassPlan): Product {
  const tier = NEET_PASS_TIERS[subjectKey];
  const planInfo = tier.plans[plan];
  const passId = `pass-${subjectKey}-${plan}`;

  const planLabel = plan === 'monthly' ? 'Monthly' : plan === 'yearly' ? '1 Year' : 'Lifetime';
  const title = `NEET SUCCESS PASS — ${tier.subjectName.toUpperCase()} (${planLabel.toUpperCase()})`;

  return {
    id: passId,
    title,
    author: 'NEET MBBS Doctors Board',
    type: 'pdf',
    category: 'NEET Success Pass',
    subject: subjectKey === 'pcb' ? 'Complete PCB' : subjectKey === 'biology' ? 'Biology' : subjectKey === 'chemistry' ? 'Chemistry' : 'Physics',
    materialType: 'New Content',
    price: planInfo.price,
    originalPrice: planInfo.originalPrice,
    rating: 5.0,
    reviewsCount: 1420,
    coverImage: subjectKey === 'pcb' 
      ? '/favicon.svg' 
      : subjectKey === 'biology' 
      ? 'https://pub-fe249f0325e741c9bb12b22f8850f331.r2.dev/book-covers/1787227288297-1000083413.jpg'
      : subjectKey === 'chemistry'
      ? 'https://pub-fe249f0325e741c9bb12b22f8850f331.r2.dev/book-covers/1787390639944-1000083953.png'
      : '/favicon.svg',
    pdfUrl: 'https://pub-fe249f0325e741c9bb12b22f8850f331.r2.dev/sample-pages/1787317123582-1000083953.png',
    description: `Instant digital unlock for ${tier.subjectName}. Plan: ${planLabel}. Includes all Notes, PYQs, MCQs, Formulas, Revision Material, Tests, Short Notes, and NCERT Content.`,
    features: tier.features,
    tags: ['neet-pass', subjectKey, plan, 'subscription', 'instant-access'],
    pages: 1200,
    edition: '2026 Instant Digital Pass',
    language: 'English & Hindi',
    inStock: true,
    isBestSeller: true,
    shippingCost: 0,
    isFreeShipping: true,
    createdAt: new Date().toISOString()
  };
}

/**
 * Calculates expiration timestamp based on plan
 */
export function calculatePassExpiry(plan: NeetPassPlan): string {
  if (plan === 'lifetime') return 'lifetime';
  const now = new Date();
  if (plan === 'monthly') {
    now.setMonth(now.getMonth() + 1);
  } else if (plan === 'yearly') {
    now.setFullYear(now.getFullYear() + 1);
  }
  return now.toISOString();
}

/**
 * Checks if a pass is still valid
 */
export function isPassActive(expiryDate: string): boolean {
  if (!expiryDate) return false;
  if (expiryDate.toLowerCase() === 'lifetime') return true;
  try {
    const expiryTime = new Date(expiryDate).getTime();
    return expiryTime > Date.now();
  } catch (e) {
    return false;
  }
}
