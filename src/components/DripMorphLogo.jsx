import React from 'react';

export default function DripMorphLogo({ size = 32, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`dripmorph-logo-svg ${className}`}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
      aria-label="DripMorph Logo"
    >
      <defs>
        {/* Neon Lime to Cyber Green Gradient */}
        <linearGradient id="dmPrimaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C4FF36" />
          <stop offset="45%" stopColor="#A6FC29" />
          <stop offset="100%" stopColor="#05E064" />
        </linearGradient>

        {/* Ambient Dark Velvet Sheen */}
        <linearGradient id="dmDarkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E1E26" />
          <stop offset="100%" stopColor="#0B0B0F" />
        </linearGradient>

        {/* Gloss Edge Highlight */}
        <linearGradient id="dmGlossGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>

        {/* Outer Glow Filter */}
        <filter id="dmGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Outer Diamond/Shield Container */}
      <rect
        x="10"
        y="10"
        width="80"
        height="80"
        rx="22"
        fill="url(#dmDarkGrad)"
        stroke="url(#dmPrimaryGrad)"
        strokeWidth="2.5"
        strokeOpacity="0.8"
      />

      {/* Stylized 'D' and 'M' Intersection Shape (Cyber Streetwear Drip & Morph) */}
      <g filter="url(#dmGlow)">
        {/* Left 'D' Arch with Drip Stem */}
        <path
          d="M28 26 C28 24.895 28.895 24 30 24 H48 C60.15 24 70 33.85 70 46 C70 55.4 63.95 63.4 55.3 66.4 L46 76 C44.8 77.2 42.8 76.5 42.8 74.8 L42.8 68 H30 C28.895 68 28 67.105 28 66 Z"
          fill="url(#dmPrimaryGrad)"
        />

        {/* Inner Cutout creating the sharp 'M' contour */}
        <path
          d="M38 34 H47 C54.73 34 61 40.27 61 48 C61 55.73 54.73 62 47 62 H38 Z"
          fill="url(#dmDarkGrad)"
        />

        {/* Center Liquid Drip Diamond Core */}
        <path
          d="M48 38 L56 50 L48 62 L40 50 Z"
          fill="url(#dmPrimaryGrad)"
        />

        {/* Gloss Top Reflection Accent */}
        <path
          d="M32 26 H46 C55 26 62 31 65 39"
          stroke="url(#dmGlossGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Micro Neon Power Indicator Beacon */}
        <circle cx="70" cy="30" r="3.5" fill="#C4FF36" />
      </g>
    </svg>
  );
}
