import React from 'react';
import { 
  ArrowRight, 
  BookOpen, 
  FileText, 
  ClipboardCheck, 
  ShoppingCart, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  Eye,
  Zap,
  Play,
  Lock,
  Tag
} from 'lucide-react';
import { Product, MockTest, UserProfile } from '../types';
import { resolveImageUrl } from '../lib/storage';

// =========================================================================
// 1. FEATURED MOCK TESTS (Matches Image 1)
// =========================================================================
interface FeaturedMockTestsProps {
  tests: MockTest[];
  onExploreMockTests: () => void;
  onSelectTest: (test: MockTest) => void;
  userProfile?: UserProfile | null;
}

export const FeaturedMockTestsSection: React.FC<FeaturedMockTestsProps> = ({
  tests,
  onExploreMockTests,
  onSelectTest,
  userProfile
}) => {
  const publishedTests = tests.filter(t => t.status === 'published').slice(0, 3);

  return (
    <section id="featured-mock-tests" className="space-y-3 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
            <ClipboardCheck className="w-4 h-4" />
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight font-['Outfit',sans-serif]">
            Featured Mock Tests
          </h2>
        </div>

        <button
          type="button"
          onClick={onExploreMockTests}
          className="inline-flex items-center gap-1 text-xs font-black text-blue-600 hover:text-blue-700 transition cursor-pointer select-none"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {publishedTests.length === 0 ? (
        /* Empty / Coming Soon card matching Image 1 exactly - compact on mobile */
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#eff6ff] via-[#f0f9ff] to-[#e0f2fe] border border-blue-200/80 p-3 sm:p-5 md:p-8 flex flex-row items-center justify-start sm:justify-center gap-3 sm:gap-6 text-left shadow-2xs">
          {/* Clipboard & Stopwatch Illustration */}
          <div className="relative flex items-center justify-center shrink-0 select-none">
            <div className="w-12 h-14 sm:w-16 sm:h-20 md:w-20 md:h-24 bg-white rounded-xl sm:rounded-2xl border-2 border-blue-200 shadow-xs sm:shadow-md p-1 sm:p-2 flex flex-col justify-between">
              <div className="w-5 sm:w-8 h-1.5 sm:h-2 bg-blue-600 rounded-full mx-auto" />
              <div className="space-y-1 sm:space-y-1.5 px-0.5 sm:px-1">
                <div className="h-1 sm:h-1.5 bg-blue-100 rounded-full w-full" />
                <div className="h-1 sm:h-1.5 bg-blue-100 rounded-full w-4/5" />
                <div className="h-1 sm:h-1.5 bg-blue-100 rounded-full w-3/4" />
              </div>
              <div className="w-full h-0.5 sm:h-1 bg-slate-100 rounded-full" />
            </div>

            <div className="absolute -bottom-1.5 -right-1.5 sm:-bottom-2 sm:-right-2 w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm sm:shadow-lg border sm:border-2 border-white">
              <Clock className="w-3.5 h-3.5 sm:w-5 sm:h-5 md:w-6 md:h-6" />
            </div>
          </div>

          <div className="space-y-0.5 sm:space-y-1 max-w-md">
            <h3 className="text-xs sm:text-base md:text-lg font-black text-slate-900 font-['Outfit',sans-serif]">
              New mock tests are coming soon!
            </h3>
            <p className="text-[10px] sm:text-xs md:text-sm text-slate-600 font-normal leading-snug sm:leading-relaxed">
              Stay tuned! More tests will be available soon to help you ace your NEET preparation.
            </p>
          </div>
        </div>
      ) : (
        /* Real Mock Tests Grid */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {publishedTests.map(test => {
            const isFree = test.isFree || test.price === 0;

            return (
              <div
                key={test.id}
                onClick={() => onSelectTest(test)}
                className="group relative bg-white rounded-2xl border border-slate-200/90 hover:border-blue-500/80 p-4 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                      {test.subject || (test.subjects && test.subjects[0]) || 'Full Syllabus'}
                    </span>
                    {isFree ? (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        100% Free
                      </span>
                    ) : (
                      <span className="text-xs font-black text-slate-900 font-['Outfit',sans-serif]">
                        ₹{test.price}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition leading-snug line-clamp-2">
                    {test.title}
                  </h3>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium mt-3 pt-2.5 border-t border-slate-100">
                    <span>{test.totalQuestions} Qs</span>
                    <span>•</span>
                    <span>{test.durationMinutes} Mins</span>
                    <span>•</span>
                    <span>{test.maxMarks || 720} Marks</span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-medium">NEET CBT</span>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-2xs transition"
                  >
                    <span>Attempt Now</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};


// =========================================================================
// 2. POPULAR PHYSICAL BOOKS (Matches Image 1)
// =========================================================================
interface PopularPhysicalBooksProps {
  products: Product[];
  popularBookIds?: string[];
  onSelectProduct: (p: Product) => void;
  onAddToCart: (p: Product) => void;
  onViewAll: () => void;
}

export const PopularPhysicalBooksSection: React.FC<PopularPhysicalBooksProps> = ({
  products,
  popularBookIds,
  onSelectProduct,
  onAddToCart,
  onViewAll
}) => {
  // If admin has selected specific books, use them; otherwise, default to first 3-4 physical books
  const books = React.useMemo(() => {
    const allBooks = products.filter(p => p.type === 'book');
    if (popularBookIds && popularBookIds.length > 0) {
      const selected = allBooks.filter(b => popularBookIds.includes(b.id));
      if (selected.length > 0) return selected;
    }
    return allBooks.slice(0, 4);
  }, [products, popularBookIds]);

  if (books.length === 0) return null;

  return (
    <section id="popular-physical-books" className="space-y-3 pt-2">
      {/* Header matching Image 1: Book Icon + Title + View All -> */}
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
            <BookOpen className="w-4 h-4" />
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight font-['Outfit',sans-serif]">
            Popular Physical Books
          </h2>
        </div>

        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex items-center gap-1 text-xs font-black text-blue-600 hover:text-blue-700 transition cursor-pointer select-none"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Horizontal Scroll / Desktop Grid of Books matching Image 1 */}
      <div className="flex gap-2.5 sm:gap-3 overflow-x-auto pb-2 scrollbar-none sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {books.map(book => {
          return (
            <div
              key={book.id}
              onClick={() => onSelectProduct(book)}
              className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 p-2.5 sm:p-3.5 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between w-[160px] sm:w-auto shrink-0 cursor-pointer group"
            >
              <div>
                {/* Book Cover Thumbnail */}
                <div className="relative aspect-[4/3] rounded-lg sm:rounded-xl overflow-hidden bg-slate-100 mb-1.5 sm:mb-2.5 flex items-center justify-center">
                  {book.coverImage ? (
                    <img
                      src={resolveImageUrl(book.coverImage)}
                      alt={book.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-emerald-600 to-teal-700 text-white flex flex-col items-center justify-center p-2 text-center">
                      <span className="text-[10px] font-black uppercase">NCERT</span>
                      <span className="text-xs font-black">{book.category}</span>
                    </div>
                  )}
                </div>

                {/* Title & Edition */}
                <h3 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-blue-600 transition leading-snug line-clamp-1">
                  {book.title}
                </h3>
                <span className="text-[9.5px] sm:text-[10.5px] text-slate-500 font-medium block truncate mt-0.5">
                  {book.edition || `Class 11 + 12 • ${book.category}`}
                </span>

                {/* Price & In Stock Badge matching Image 1 */}
                <div className="flex items-center justify-between gap-1 mt-2 sm:mt-2.5 pt-1.5 sm:pt-2 border-t border-slate-100">
                  <span className="text-xs sm:text-sm font-black text-slate-900 font-['Outfit',sans-serif]">
                    ₹ {book.price}
                  </span>

                  <span className="inline-flex items-center gap-0.5 sm:gap-1 text-[8px] sm:text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 sm:px-2 py-0.5 rounded-full">
                    <span>🛍</span>
                    <span>In Stock</span>
                  </span>
                </div>
              </div>

              {/* Full-Width Blue Add to Cart Button matching Image 1 */}
              <div className="pt-2 sm:pt-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToCart(book);
                  }}
                  className="w-full inline-flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 sm:py-2 px-2 sm:px-3 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-[10.5px] sm:text-xs font-black rounded-lg sm:rounded-xl shadow-2xs transition-all cursor-pointer"
                >
                  <ShoppingCart className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>Add to Cart</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};


// =========================================================================
// 3. DIGITAL STUDY MATERIAL (Matches Image 1)
// =========================================================================
interface DigitalStudyMaterialProps {
  products: Product[];
  featuredPdfIds?: string[];
  purchasedProductIds: string[];
  onSelectProduct: (p: Product) => void;
  onAddToCart: (p: Product) => void;
  onQuickBuy: (p: Product) => void;
  onOpenPdfReader: (url: string, title: string) => void;
  onViewAll: () => void;
}

export const DigitalStudyMaterialSection: React.FC<DigitalStudyMaterialProps> = ({
  products,
  featuredPdfIds,
  purchasedProductIds,
  onSelectProduct,
  onAddToCart,
  onQuickBuy,
  onOpenPdfReader,
  onViewAll
}) => {
  // If admin has selected specific PDFs, use them; otherwise, default to first 3-4 PDFs
  const pdfs = React.useMemo(() => {
    const allPdfs = products.filter(p => p.type === 'pdf');
    if (featuredPdfIds && featuredPdfIds.length > 0) {
      const selected = allPdfs.filter(p => featuredPdfIds.includes(p.id));
      if (selected.length > 0) return selected;
    }
    return allPdfs.slice(0, 4);
  }, [products, featuredPdfIds]);

  if (pdfs.length === 0) return null;

  return (
    <section id="digital-study-material" className="space-y-3 pt-2">
      {/* Header matching Image 1: Purple PDF Icon + Title + View All -> */}
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
            <span className="text-[10px] font-black">PDF</span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight font-['Outfit',sans-serif]">
            Digital Study Material
          </h2>
        </div>

        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex items-center gap-1 text-xs font-black text-blue-600 hover:text-blue-700 transition cursor-pointer select-none"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Horizontal Scroll / Desktop Grid of PDFs matching Image 1 */}
      <div className="flex gap-2.5 sm:gap-3 overflow-x-auto pb-2 scrollbar-none sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {pdfs.map(pdf => {
          const isPurchased = purchasedProductIds.includes(pdf.id);

          return (
            <div
              key={pdf.id}
              onClick={() => onSelectProduct(pdf)}
              className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 p-2.5 sm:p-3.5 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between w-[160px] sm:w-auto shrink-0 cursor-pointer group"
            >
              <div>
                {/* PDF Cover / Icon Thumbnail */}
                <div className="relative aspect-[4/3] rounded-lg sm:rounded-xl overflow-hidden bg-slate-100 mb-1.5 sm:mb-2.5 flex items-center justify-center">
                  {pdf.coverImage ? (
                    <img
                      src={resolveImageUrl(pdf.coverImage)}
                      alt={pdf.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-purple-700 to-indigo-800 text-white flex flex-col items-center justify-center p-2 text-center">
                      <span className="text-xs font-black uppercase">{pdf.category}</span>
                      <span className="text-[9px] font-medium text-purple-200">Notes &amp; PYQs</span>
                    </div>
                  )}

                  {/* PDF Pill Tag */}
                  <div className="absolute top-1 left-1 sm:top-1.5 sm:left-1.5 bg-rose-600 text-white text-[7.5px] sm:text-[8px] font-black px-1.5 py-0.2 sm:py-0.5 rounded shadow-2xs uppercase">
                    PDF
                  </div>
                </div>

                {/* Title & Subject */}
                <h3 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-blue-600 transition leading-snug line-clamp-1">
                  {pdf.title}
                </h3>
                <span className="text-[9.5px] sm:text-[10.5px] text-slate-500 font-medium block truncate mt-0.5">
                  {pdf.category} • Notes
                </span>

                {/* Price & Status matching Image 1 */}
                <div className="flex items-center justify-between gap-1 mt-2 sm:mt-2.5 pt-1.5 sm:pt-2 border-t border-slate-100">
                  <span className="text-xs sm:text-sm font-black text-slate-900 font-['Outfit',sans-serif]">
                    ₹ {pdf.price}
                  </span>

                  {isPurchased ? (
                    <span className="inline-flex items-center gap-0.5 sm:gap-1 text-[8px] sm:text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 sm:px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>Purchased</span>
                    </span>
                  ) : (
                    <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium">
                      Instant Access
                    </span>
                  )}
                </div>
              </div>

              {/* Action Button: View PDF (if purchased) or Buy Now matching Image 1 */}
              <div className="pt-2 sm:pt-3">
                {isPurchased ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (pdf.pdfUrl) onOpenPdfReader(pdf.pdfUrl, pdf.title);
                      else onSelectProduct(pdf);
                    }}
                    className="w-full inline-flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 sm:py-2 px-2 sm:px-3 bg-white hover:bg-blue-50 border border-blue-400 text-blue-600 text-[10.5px] sm:text-xs font-black rounded-lg sm:rounded-xl shadow-2xs transition-all cursor-pointer"
                  >
                    <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span>View PDF</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickBuy(pdf);
                    }}
                    className="w-full inline-flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 sm:py-2 px-2 sm:px-3 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-[10.5px] sm:text-xs font-black rounded-lg sm:rounded-xl shadow-2xs transition-all cursor-pointer"
                  >
                    <span>Buy Now</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

// =========================================================================
// 4. CONNECT WITH US (Matches Image 1 / Request 3)
// =========================================================================
interface ConnectWithUsProps {
  storeConfig?: {
    telegramUsername?: string;
    telegramLink?: string;
    whatsappNumber?: string;
    whatsappUrl?: string;
    youtubeUrl?: string;
    instagramUrl?: string;
    supportEmails?: string[];
    supportPhones?: string[];
  };
  onSupportClick?: () => void;
}

export const ConnectWithUsSection: React.FC<ConnectWithUsProps> = ({
  storeConfig,
  onSupportClick
}) => {
  const telegramHref = storeConfig?.telegramLink || 'https://t.me/neetmbbsdoctors';
  const whatsappNum = storeConfig?.whatsappNumber || '+91 6005894110';
  const cleanPhone = whatsappNum.replace(/[^0-9]/g, '');
  const whatsappHref = storeConfig?.whatsappUrl || `https://wa.me/${cleanPhone}?text=Hello%20NEET%20MBBS%20Doctors%2C%20I%20need%20help%20with%20NEET%20preparation`;
  const youtubeHref = storeConfig?.youtubeUrl || 'https://youtube.com/@neetmbbsdoctors';
  const instagramHref = storeConfig?.instagramUrl || 'https://instagram.com/neetmbbsdoctors';

  return (
    <section id="connect-with-us-section" className="space-y-3 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
            💬
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight font-['Outfit',sans-serif]">
            Connect With Us
          </h2>
        </div>
        <span className="text-xs font-semibold text-slate-500">24/7 Mentorship</span>
      </div>

      {/* Grid of channels */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {/* Telegram */}
        <a
          href={telegramHref}
          target="_blank"
          rel="noopener noreferrer"
          className="group p-2.5 sm:p-3.5 bg-gradient-to-br from-sky-50 to-blue-50/70 hover:from-sky-100 hover:to-blue-100/90 border border-sky-200/90 rounded-xl sm:rounded-2xl flex flex-col justify-between transition-all duration-200 shadow-2xs hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xl sm:text-2xl">✈️</span>
            <span className="text-[9px] sm:text-[10px] font-black uppercase text-sky-800 bg-sky-100 px-1.5 sm:px-2 py-0.5 rounded-full">
              Channel
            </span>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-blue-700 transition">
              Telegram
            </div>
            <div className="text-[9.5px] sm:text-[10.5px] text-slate-500 font-medium">Daily MCQs &amp; Notes</div>
          </div>
        </a>

        {/* WhatsApp */}
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="group p-2.5 sm:p-3.5 bg-gradient-to-br from-emerald-50 to-teal-50/70 hover:from-emerald-100 hover:to-teal-100/90 border border-emerald-200/90 rounded-xl sm:rounded-2xl flex flex-col justify-between transition-all duration-200 shadow-2xs hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xl sm:text-2xl">💬</span>
            <span className="text-[9px] sm:text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 px-1.5 sm:px-2 py-0.5 rounded-full">
              Direct
            </span>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-emerald-700 transition">
              WhatsApp
            </div>
            <div className="text-[9.5px] sm:text-[10.5px] text-slate-500 font-medium">Instant Mentor Chat</div>
          </div>
        </a>

        {/* YouTube */}
        <a
          href={youtubeHref}
          target="_blank"
          rel="noopener noreferrer"
          className="group p-2.5 sm:p-3.5 bg-gradient-to-br from-rose-50 to-red-50/70 hover:from-rose-100 hover:to-red-100/90 border border-rose-200/90 rounded-xl sm:rounded-2xl flex flex-col justify-between transition-all duration-200 shadow-2xs hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xl sm:text-2xl">▶️</span>
            <span className="text-[9px] sm:text-[10px] font-black uppercase text-rose-800 bg-rose-100 px-1.5 sm:px-2 py-0.5 rounded-full">
              Videos
            </span>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-rose-700 transition">
              YouTube
            </div>
            <div className="text-[9.5px] sm:text-[10.5px] text-slate-500 font-medium">Lectures &amp; Solutions</div>
          </div>
        </a>

        {/* Instagram */}
        <a
          href={instagramHref}
          target="_blank"
          rel="noopener noreferrer"
          className="group p-2.5 sm:p-3.5 bg-gradient-to-br from-fuchsia-50 to-pink-50/70 hover:from-fuchsia-100 hover:to-pink-100/90 border border-pink-200/90 rounded-xl sm:rounded-2xl flex flex-col justify-between transition-all duration-200 shadow-2xs hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xl sm:text-2xl">📸</span>
            <span className="text-[9px] sm:text-[10px] font-black uppercase text-fuchsia-800 bg-fuchsia-100 px-1.5 sm:px-2 py-0.5 rounded-full">
              Updates
            </span>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-pink-700 transition">
              Instagram
            </div>
            <div className="text-[9.5px] sm:text-[10.5px] text-slate-500 font-medium">Tips &amp; Mnemonics</div>
          </div>
        </a>
      </div>
    </section>
  );
};

