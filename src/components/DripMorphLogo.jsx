import React from 'react';

export default function DripMorphLogo({ size = 36, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`dripmorph-logo-svg ${className}`}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      <g transform="rotate(45 200 200)">
        {/* Outer White Sticker Shell */}
        <rect
          x="120"
          y="50"
          width="160"
          height="300"
          rx="80"
          fill="#FFFFFF"
        />

        {/* Inner Capsule Outline (Neon Green) */}
        <rect
          x="136"
          y="66"
          width="128"
          height="268"
          rx="64"
          fill="#a6fc29"
        />

        {/* Top Half Green Cap */}
        <path
          d="M 136 200 L 136 130 A 64 64 0 0 1 264 130 L 264 200 Z"
          fill="#a6fc29"
        />

        {/* Bottom Half Black Cap (with Green Ring around it) */}
        <rect
          x="152"
          y="186"
          width="96"
          height="134"
          rx="48"
          fill="#000000"
        />

        {/* Divider Line (White) */}
        <rect
          x="136"
          y="194"
          width="128"
          height="12"
          fill="#FFFFFF"
        />

        {/* White Glossy Highlight Arc on Top Right of Green Cap */}
        <path
          d="M 222 96 A 48 48 0 0 1 246 150"
          stroke="#FFFFFF"
          strokeWidth="14"
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </svg>
  );
}
