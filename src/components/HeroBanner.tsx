import React, { useState, useEffect } from 'react';
import { ProductType, BannerSlide } from '../types';
import { getStoredBanners, resolveImageUrl } from '../lib/storage';

interface HeroBannerProps {
  activeTab: ProductType;
  onExplore: (type?: ProductType) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ activeTab, onExplore }) => {
  const [slides, setSlides] = useState<BannerSlide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const loadBanners = () => {
      const stored = getStoredBanners().filter(b => b.active);
      setSlides(stored.length > 0 ? stored : [
        {
          id: "default-1",
          titleLine1: "",
          titleLine2: "",
          titleLine3: "",
          subtitle: "",
          buttonText: "",
          badge: "",
          type: "book",
          imageUrl: "https://images.unsplash.com/photo-1532012164546-f432f2e37276?auto=format&fit=crop&w=1200&q=80",
          active: true
        }
      ]);
    };

    loadBanners();
    window.addEventListener('neetmbbs_banners_updated', loadBanners);
    return () => window.removeEventListener('neetmbbs_banners_updated', loadBanners);
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 3000); // Cycles every 3s
    return () => clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) return null;
  const slide = slides[currentSlide] || slides[0];

  return (
    <div className="w-full">
      <div 
        id="hero-banner-container"
        onClick={() => onExplore(slide.type || 'book')}
        className="relative overflow-hidden rounded-2xl bg-slate-900 shadow-xs border border-slate-200/80 aspect-[16/6.8] sm:h-[150px] max-h-[155px] w-full cursor-pointer select-none group"
      >
        {slide.imageUrl ? (
          <img 
            src={resolveImageUrl(slide.imageUrl)} 
            alt="Hero Promotion Banner"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center group-hover:scale-101 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 flex items-center justify-center p-3 text-center">
            <span className="text-white font-extrabold text-xs sm:text-sm tracking-wide">
              NEET MBBS 2026 • Official Study Notes & Books
            </span>
          </div>
        )}

        {/* Carousel Indicator Dots */}
        {slides.length > 1 && (
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="absolute bottom-1.5 left-0 right-0 z-10 flex items-center justify-center gap-1.5 pointer-events-auto"
          >
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentSlide(idx)}
                aria-label={`Slide ${idx + 1}`}
                className={`transition-all duration-300 rounded-full cursor-pointer shadow-xs ${
                  currentSlide === idx
                    ? 'w-3.5 h-1 bg-yellow-400'
                    : 'w-1.5 h-1 bg-white/60 hover:bg-white'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
