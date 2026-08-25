import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 'md', className = '' }) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  return (
    <div className={`relative shrink-0 rounded-full overflow-hidden flex items-center justify-center ${sizeMap[size]} ${className}`}>
      {/* Official NEET MBBS DOCTORS STORE circular emblem */}
      <svg
        viewBox="0 0 200 200"
        className="w-full h-full drop-shadow-xs select-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Deep Navy Border & Pure White Circle */}
        <circle cx="100" cy="100" r="98" fill="#FFFFFF" stroke="#0B1A30" strokeWidth="4" />

        {/* Golden Winged Caduceus Symbol at Top */}
        <g id="caduceus-symbol" transform="translate(100, 36)">
          {/* Central Staff */}
          <line x1="0" y1="-22" x2="0" y2="16" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="0" cy="-22" r="3.5" fill="#F59E0B" stroke="#B45309" strokeWidth="1" />

          {/* Golden Wings */}
          <path
            d="M-2 -15 C -14 -28, -30 -22, -38 -10 C -28 -8, -18 -10, -4 -8 Z"
            fill="url(#gold-wing-left)"
          />
          <path
            d="M2 -15 C 14 -28, 30 -22, 38 -10 C 28 -8, 18 -10, 4 -8 Z"
            fill="url(#gold-wing-right)"
          />

          {/* Entwined Golden Serpents */}
          <path
            d="M -7 -8 C -13 -3, -11 4, 0 7 C 12 10, 14 15, 0 19 C -10 15, -12 10, 0 7"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M 7 -8 C 13 -3, 11 4, 0 7 C -12 10, -14 15, 0 19 C 10 15, 12 10, 0 7"
            fill="none"
            stroke="#D97706"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </g>

        {/* Gradients */}
        <defs>
          <linearGradient id="gold-wing-left" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
          <linearGradient id="gold-wing-right" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
          <linearGradient id="ecg-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EA580C" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#16A34A" />
          </linearGradient>
        </defs>

        {/* NEET Text (Bold Orange) */}
        <text
          x="100"
          y="79"
          textAnchor="middle"
          fill="#EA580C"
          fontSize="30"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="1.5"
        >
          NEET
        </text>

        {/* Divider Top Line */}
        <line x1="26" y1="87" x2="174" y2="87" stroke="#EA580C" strokeWidth="1.2" strokeOpacity="0.8" />

        {/* MBBS Text (Massive Deep Navy Blue) */}
        <text
          x="100"
          y="124"
          textAnchor="middle"
          fill="#0B2545"
          fontSize="37"
          fontWeight="950"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="0.8"
        >
          MBBS
        </text>

        {/* ECG Heartbeat Divider Line */}
        <path
          d="M 24 132 L 82 132 L 87 127 L 92 136 L 96 125 L 101 139 L 105 131 L 110 134 L 114 132 L 176 132"
          fill="none"
          stroke="url(#ecg-grad)"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />

        {/* DOCTORS Text (Medical Emerald Green) */}
        <text
          x="100"
          y="154"
          textAnchor="middle"
          fill="#16A34A"
          fontSize="22"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="2.2"
        >
          DOCTORS
        </text>

        {/* — STORE — Subtext */}
        <g transform="translate(100, 172)">
          <line x1="-58" y1="-4" x2="-38" y2="-4" stroke="#EA580C" strokeWidth="2.2" strokeLinecap="round" />
          <text
            x="0"
            y="0"
            textAnchor="middle"
            fill="#0B2545"
            fontSize="18"
            fontWeight="900"
            fontFamily="system-ui, -apple-system, sans-serif"
            letterSpacing="3.5"
          >
            STORE
          </text>
          <line x1="38" y1="-4" x2="58" y2="-4" stroke="#EA580C" strokeWidth="2.2" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
};
