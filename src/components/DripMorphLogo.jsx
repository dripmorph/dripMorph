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
        {/* Vibrant Neon Lime Gradient */}
        <linearGradient id="dmLimeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#b4fd3b" />
          <stop offset="100%" stopColor="#8ae610" />
        </linearGradient>

        {/* Gloss Highlight Gradient */}
        <linearGradient id="dmGloss" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.1" />
        </linearGradient>
      </defs>

      {/* 45-degree Rotated Capsule / Drip Pill */}
      <g transform="rotate(45 50 50)">
        {/* Outer White Border / Sticker Silhouette */}
        <rect
          x="30"
          y="12"
          width="40"
          height="76"
          rx="20"
          fill="#FFFFFF"
        />

        {/* Inner Neon Lime Base */}
        <rect
          x="34"
          y="16"
          width="32"
          height="68"
          rx="16"
          fill="url(#dmLimeGrad)"
        />

        {/* Bottom Half Black Obsidian Cap */}
        <rect
          x="38"
          y="48"
          width="24"
          height="32"
          rx="12"
          fill="#0B0B0E"
        />

        {/* Center Crisp White Divider Line */}
        <rect
          x="34"
          y="48"
          width="32"
          height="3"
          fill="#FFFFFF"
        />

        {/* Top Gloss Arc Highlight */}
        <path
          d="M 56 22 A 12 12 0 0 1 62 35"
          stroke="url(#dmGloss)"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </svg>
  );
}
