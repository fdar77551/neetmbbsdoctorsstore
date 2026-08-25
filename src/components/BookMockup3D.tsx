import React, { useState } from 'react';
import { resolveImageUrl } from './ProductCard';
import { Product } from '../types';

interface BookMockup3DProps {
  product: Product;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const BookMockup3D: React.FC<BookMockup3DProps> = ({
  product,
  size = 'md',
  className = ''
}) => {
  const [imageError, setImageError] = useState(false);
  const coverUrl = resolveImageUrl(product.coverImage);

  // Scaled dimensions
  const dims = {
    sm: { width: 'w-24 sm:w-26', height: 'h-34 sm:h-38', spineW: 'w-2.5', pageDepth: 'w-3', shadowW: 'w-22' },
    md: { width: 'w-36 sm:w-44', height: 'h-52 sm:h-62', spineW: 'w-4', pageDepth: 'w-4', shadowW: 'w-36' },
    lg: { width: 'w-48 sm:w-56', height: 'h-68 sm:h-80', spineW: 'w-5', pageDepth: 'w-5', shadowW: 'w-48' },
  }[size];

  // Subject gradient fallback
  const getSubjectFallback = (cat: string) => {
    switch (cat?.toLowerCase()) {
      case 'biology':
        return 'from-emerald-700 via-teal-800 to-slate-950 text-emerald-300';
      case 'physics':
        return 'from-blue-700 via-indigo-900 to-slate-950 text-blue-300';
      case 'chemistry':
        return 'from-amber-600 via-orange-900 to-slate-950 text-amber-300';
      default:
        return 'from-purple-700 via-indigo-950 to-slate-950 text-purple-300';
    }
  };

  const isBook = product.type === 'book' || !product.type;

  return (
    <div className={`relative flex flex-col items-center justify-center select-none py-1.5 ${className}`}>
      {/* 3D Perspective Box */}
      <div 
        className="relative group transition-transform duration-300 hover:scale-104"
        style={{
          perspective: '1200px',
          transformStyle: 'preserve-3d'
        }}
      >
        {/* Main 3D Book Container */}
        <div
          className={`relative ${dims.width} ${dims.height} rounded-r-md rounded-l-xs transition-all duration-300`}
          style={{
            transform: isBook 
              ? 'rotateY(-22deg) rotateX(7deg) rotateZ(-2deg)' 
              : 'rotateY(-12deg) rotateX(4deg)',
            transformStyle: 'preserve-3d',
            boxShadow: '10px 18px 25px -5px rgba(0, 0, 0, 0.4), 3px 6px 10px -2px rgba(0, 0, 0, 0.25)'
          }}
        >
          {/* Front Hardback Book Cover */}
          <div className="absolute inset-0 rounded-r-md rounded-l-xs overflow-hidden bg-slate-900 z-10 border-t border-r border-white/20">
            {coverUrl && !imageError ? (
              <img
                src={coverUrl}
                alt={product.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${getSubjectFallback(product.category)} p-2.5 flex flex-col justify-between text-white relative`}>
                <div className="flex justify-between items-center text-[7px] sm:text-[8px] font-black uppercase tracking-wider">
                  <span className="bg-white/20 px-1.5 py-0.5 rounded">{product.category}</span>
                  <span className="text-yellow-400">NEET UG</span>
                </div>

                <div className="my-auto py-1">
                  <h4 className="text-[10px] sm:text-xs font-black leading-tight line-clamp-3 font-['Outfit',sans-serif]">
                    {product.title}
                  </h4>
                  <p className="text-[8px] text-white/80 mt-1 font-medium truncate">
                    {product.author}
                  </p>
                </div>

                <div className="pt-1 border-t border-white/20 flex justify-between items-center text-[6px] sm:text-[7px] text-white/70">
                  <span>{product.type === 'pdf' ? '⚡ Instant PDF' : '📖 2026 Edition'}</span>
                  <span className="font-bold text-yellow-300">Verified</span>
                </div>
              </div>
            )}

            {/* Glossy Sheen Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent pointer-events-none" />

            {/* Left Spine Fold Depth & Gradient */}
            <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/40 via-white/10 to-transparent pointer-events-none" />
            <div className="absolute inset-y-0 left-3 w-0.5 bg-black/25 pointer-events-none" />
          </div>

          {/* 3D Left Hardcover Spine */}
          {isBook && (
            <div
              className={`absolute top-0 bottom-0 -left-3 ${dims.spineW} bg-gradient-to-r from-slate-950 via-slate-800 to-slate-900 rounded-l-xs border-y border-l border-white/15`}
              style={{
                transform: 'rotateY(-90deg) translateZ(0px)',
                transformOrigin: 'right center'
              }}
            >
              <div className="h-full w-full flex flex-col justify-between py-2 items-center opacity-60 text-[6px] text-amber-300 font-bold tracking-widest uppercase">
                <span>✦</span>
                <span className="rotate-90 origin-center whitespace-nowrap">{product.category || 'NEET'}</span>
                <span>✦</span>
              </div>
            </div>
          )}

          {/* 3D Right Pages Edge with Paper Texture */}
          {isBook && (
            <div
              className="absolute top-1 bottom-1 -right-2.5 w-2.5 bg-gradient-to-r from-amber-50 via-slate-100 to-slate-200 border-y border-r border-slate-300 rounded-r-xs shadow-inner"
              style={{
                transform: 'rotateY(90deg) translateZ(-2px)',
                transformOrigin: 'left center',
                backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 1px, rgba(0,0,0,0.06) 1px, rgba(0,0,0,0.06) 2px)'
              }}
            />
          )}

          {/* 3D Bottom Pages Edge */}
          {isBook && (
            <div
              className="absolute -bottom-2 left-1 right-1 h-2 bg-gradient-to-b from-amber-50 to-slate-200 border-x border-b border-slate-300 rounded-b-xs shadow-inner"
              style={{
                transform: 'rotateX(90deg) translateZ(-2px)',
                transformOrigin: 'center top',
                backgroundImage: 'repeating-linear-gradient(to right, transparent, transparent 1px, rgba(0,0,0,0.06) 1px, rgba(0,0,0,0.06) 2px)'
              }}
            />
          )}
        </div>

        {/* Realistic Floor Shadow Directly Underneath Book Base */}
        <div 
          className={`h-3.5 ${dims.shadowW} bg-slate-900/35 rounded-[100%] blur-[4px] mx-auto mt-1 transition-all duration-300 group-hover:scale-105`} 
        />
      </div>
    </div>
  );
};
