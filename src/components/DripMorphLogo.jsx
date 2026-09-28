import React from 'react';

/**
 * DripMorph Official Brand Logo
 * Pixel-accurate, zero-dependency vector SVG with inlined colors.
 * Eliminates gradient-ID collisions to ensure vibrant neon green rendering everywhere.
 */
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
      {/* 45-degree Rotated Capsule / Drip Pill */}
      <g transform="rotate(45 50 50)">
        {/* Top-Right Half: Solid Electric Neon Lime Fill */}
        <path
          d="M 30 50 L 30 32 A 20 20 0 0 1 70 32 L 70 50 Z"
          fill="#a6fc29"
        />

        {/* Bottom-Left Half: Obsidian Black Fill */}
        <path
          d="M 30 50 L 30 68 A 20 20 0 0 0 70 68 L 70 50 Z"
          fill="#000000"
        />

        {/* Bottom-Left Half: Neon Lime Inner Contour Stroke */}
        <path
          d="M 35.5 50 L 35.5 67.5 A 14.5 14.5 0 0 0 64.5 67.5 L 64.5 50"
          stroke="#a6fc29"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Top-Right Half: Crisp White Gloss Arc Highlight */}
        <path
          d="M 57 23 A 13 13 0 0 1 63 36"
          stroke="#FFFFFF"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />

        {/* Outer White Shell Outline */}
        <rect
          x="30"
          y="12"
          width="40"
          height="76"
          rx="20"
          stroke="#FFFFFF"
          strokeWidth="5.5"
          fill="none"
        />

        {/* Center Crisp White Divider Line */}
        <line
          x1="28"
          y1="50"
          x2="72"
          y2="50"
          stroke="#FFFFFF"
          strokeWidth="5.5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
