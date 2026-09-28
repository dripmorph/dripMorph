import React from 'react';

/**
 * DripShareCard - High-fidelity Cybernetic 9:16 Share Card Template
 * Exactly replicates the DripMorph Light and Dark mode share templates.
 */
export default function DripShareCard({ post, theme = 'dark', cardRef }) {
  const isLight = theme === 'light';

  // ── Extract & Format Data ──────────────────────────────────────────────────
  const rawUsername = (post?.username || 'rishideep').replace(/^@/, '');
  const usernameStr = `@${rawUsername}`;

  // Formatted display name (e.g. Rishideep Mallick)
  const formatDisplayName = () => {
    if (post?.display_name) return post.display_name;
    if (post?.full_name) return post.full_name;
    if (post?.author_name) return post.author_name;
    if (post?.user?.display_name) return post.user.display_name;
    if (post?.user?.full_name) return post.user.full_name;

    const lower = rawUsername.toLowerCase();
    if (lower === 'rishideep') return 'Rishideep Mallick';
    if (lower === 'streetstyle_icon') return 'Streetstyle Icon';
    if (lower === 'neon_wanderer') return 'Neon Wanderer';
    if (lower === 'brutal_aesthetic') return 'Brutal Aesthetic';
    if (lower === 'cyber_ninja') return 'Cyber Ninja';
    if (lower === 'tokyo_tide') return 'Tokyo Tide';
    if (lower === 'berlin_minimalist') return 'Berlin Minimalist';

    return rawUsername
      .split(/[._-]/)
      .filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const displayName = formatDisplayName();

  // Helper to safely parse numeric scores
  const parseScore = (val, fallback) => {
    if (typeof val === 'number') return val;
    if (!val) return fallback;
    const match = String(val).match(/(\d+(\.\d+)?)/);
    return match ? parseFloat(match[1]) : fallback;
  };

  // Main Overall Score
  const rawOverall = post?.overall_score ?? post?.score ?? post?.aiScore;
  const overallNum = parseScore(rawOverall, 7.7);
  const overallStr = overallNum.toFixed(1);

  // Sub-scores: Color Harmony, Silhouette & Proportions, Coherence & Styling
  const colorHarmonyNum = parseScore(
    post?.color_harmony_score ?? post?.color_harmony?.score ?? post?.color_harmony,
    Math.max(5.0, Math.min(10.0, parseFloat((overallNum - 0.2).toFixed(1))))
  );
  const colorHarmonyStr = colorHarmonyNum % 1 === 0 ? colorHarmonyNum.toString() : colorHarmonyNum.toFixed(1);

  const silhouetteNum = parseScore(
    post?.silhouette_proportions_score ?? post?.silhouette_proportions?.score ?? post?.silhouette_proportions,
    Math.max(5.0, Math.min(10.0, Math.round(overallNum - 0.7)))
  );
  const silhouetteStr = silhouetteNum % 1 === 0 ? silhouetteNum.toString() : silhouetteNum.toFixed(1);

  const coherenceNum = parseScore(
    post?.coherence_styling_score ?? post?.coherence_styling?.score ?? post?.coherence_styling,
    Math.max(5.0, Math.min(10.0, parseFloat((overallNum + 0.6).toFixed(1))))
  );
  const coherenceStr = coherenceNum % 1 === 0 ? coherenceNum.toString() : coherenceNum.toFixed(1);

  const imageUrl = post?.image || post?.image_url || post?.outfit_image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&h=800&fit=crop';

  return (
    <div
      ref={cardRef}
      className={`drip-share-card ${isLight ? 'theme-light' : 'theme-dark'}`}
      data-card-theme={theme}
    >
      {/* ── Background Cyber Speed Stripes / Decals ── */}
      <svg className="cyber-bg-svg" viewBox="0 0 380 680" fill="none" preserveAspectRatio="none">
        {isLight ? (
          <>
            {/* Top-Left speed slashes (Light mode) */}
            <line x1="-30" y1="40" x2="60" y2="-50" stroke="#a6ff00" strokeWidth="8" opacity="0.9" strokeLinecap="round" />
            <line x1="-15" y1="90" x2="110" y2="-35" stroke="#a6ff00" strokeWidth="5" opacity="0.6" strokeLinecap="round" />
            <line x1="-10" y1="130" x2="70" y2="50" stroke="#a6ff00" strokeWidth="3" opacity="0.4" strokeLinecap="round" />
            <line x1="-5" y1="160" x2="50" y2="105" stroke="#a6ff00" strokeWidth="2" opacity="0.3" strokeLinecap="round" />

            {/* Top-Right speed slashes */}
            <line x1="310" y1="-30" x2="410" y2="70" stroke="#a6ff00" strokeWidth="6" opacity="0.7" strokeLinecap="round" />
            <line x1="340" y1="-20" x2="420" y2="60" stroke="#a6ff00" strokeWidth="10" opacity="0.85" strokeLinecap="round" />
            <line x1="320" y1="60" x2="390" y2="130" stroke="#a6ff00" strokeWidth="4" opacity="0.5" strokeLinecap="round" />
            <line x1="340" y1="110" x2="400" y2="170" stroke="#a6ff00" strokeWidth="2.5" opacity="0.3" strokeLinecap="round" />

            {/* Bottom-Left speed slashes */}
            <line x1="-40" y1="580" x2="70" y2="690" stroke="#a6ff00" strokeWidth="12" opacity="0.85" strokeLinecap="round" />
            <line x1="-20" y1="530" x2="60" y2="610" stroke="#a6ff00" strokeWidth="4" opacity="0.4" strokeLinecap="round" />

            {/* Bottom-Right speed slashes */}
            <line x1="300" y1="690" x2="410" y2="580" stroke="#a6ff00" strokeWidth="10" opacity="0.8" strokeLinecap="round" />
            <line x1="330" y1="640" x2="400" y2="570" stroke="#a6ff00" strokeWidth="4" opacity="0.5" strokeLinecap="round" />
          </>
        ) : (
          <>
            {/* Top-Left speed slashes (Dark mode) */}
            <line x1="-30" y1="40" x2="60" y2="-50" stroke="#a6ff00" strokeWidth="8" opacity="0.8" strokeLinecap="round" />
            <line x1="-15" y1="90" x2="110" y2="-35" stroke="#a6ff00" strokeWidth="5" opacity="0.45" strokeLinecap="round" />
            <line x1="-10" y1="130" x2="70" y2="50" stroke="#a6ff00" strokeWidth="3" opacity="0.25" strokeLinecap="round" />
            <line x1="-5" y1="160" x2="50" y2="105" stroke="#a6ff00" strokeWidth="2" opacity="0.15" strokeLinecap="round" />

            {/* Top-Right speed slashes */}
            <line x1="310" y1="-30" x2="410" y2="70" stroke="#a6ff00" strokeWidth="6" opacity="0.5" strokeLinecap="round" />
            <line x1="340" y1="-20" x2="420" y2="60" stroke="#a6ff00" strokeWidth="10" opacity="0.75" strokeLinecap="round" />
            <line x1="320" y1="60" x2="390" y2="130" stroke="#a6ff00" strokeWidth="4" opacity="0.3" strokeLinecap="round" />
            <line x1="340" y1="110" x2="400" y2="170" stroke="#a6ff00" strokeWidth="2.5" opacity="0.2" strokeLinecap="round" />

            {/* Bottom-Left speed slashes */}
            <line x1="-40" y1="580" x2="70" y2="690" stroke="#a6ff00" strokeWidth="12" opacity="0.75" strokeLinecap="round" />
            <line x1="-20" y1="530" x2="60" y2="610" stroke="#a6ff00" strokeWidth="4" opacity="0.3" strokeLinecap="round" />

            {/* Bottom-Right speed slashes */}
            <line x1="300" y1="690" x2="410" y2="580" stroke="#a6ff00" strokeWidth="10" opacity="0.7" strokeLinecap="round" />
            <line x1="330" y1="640" x2="400" y2="570" stroke="#a6ff00" strokeWidth="4" opacity="0.35" strokeLinecap="round" />
          </>
        )}
      </svg>

      {/* ── Top Header: Pill Brand Logo + Username ── */}
      <div className="card-top-header">
        <div className="brand-logo-group">
          {/* DripMorph Slanted Capsule Logo */}
          <div className="capsule-logo-wrapper">
            <svg width="24" height="24" viewBox="0 0 100 100" fill="none">
              <g transform="rotate(-40 50 50)">
                {/* Capsule Container Outline */}
                <rect x="15" y="28" width="70" height="44" rx="22" fill={isLight ? "#ffffff" : "#000000"} stroke="#a6ff00" strokeWidth="7" />
                {/* Green Left Half */}
                <path d="M 37 28 A 22 22 0 0 0 37 72 L 50 72 L 50 28 Z" fill="#a6ff00" />
                {/* Dark/Light Right Half */}
                <path d="M 50 28 L 50 72 L 63 72 A 22 22 0 0 0 63 28 Z" fill={isLight ? "#111111" : "#000000"} />
                {/* Center Divider Line */}
                <line x1="50" y1="28" x2="50" y2="72" stroke="#ffffff" strokeWidth="4" />
                {/* Pill Gloss Highlight */}
                <rect x="25" y="38" width="18" height="6" rx="3" fill="#ffffff" opacity="0.9" />
              </g>
            </svg>
          </div>
          <span className="brand-title-text">DRIPMORPH</span>
        </div>

        <div className="username-tag-text">
          {usernameStr}
        </div>
      </div>

      {/* ── Main Photo Frame with Cybernetic Brackets ── */}
      <div className="cyber-photo-frame-container">
        {/* Outer Tech Corner Brackets */}
        <div className="tech-corner corner-tl" />
        <div className="tech-corner corner-tr" />
        <div className="tech-corner corner-bl" />
        <div className="tech-corner corner-br" />

        {/* Outer glowing border wrapper */}
        <div className="cyber-photo-inner-wrapper">
          <img
            src={imageUrl}
            alt="Outfit Fit Check"
            className="cyber-fit-image"
            crossOrigin="anonymous"
          />
        </div>
      </div>

      {/* ── Creator Name Banner ── */}
      <div className="creator-name-banner-row">
        {/* Left Green Chevrons */}
        <div className="speed-chevrons left-chevrons">
          <span className="chevron-bar" />
          <span className="chevron-bar" />
        </div>

        {/* Center Skewed Name Badge */}
        <div className="creator-name-badge">
          <span className="creator-name-text">{displayName}</span>
        </div>

        {/* Right Green Chevrons */}
        <div className="speed-chevrons right-chevrons">
          <span className="chevron-bar" />
          <span className="chevron-bar" />
        </div>
      </div>

      {/* ── Main Score Banner ("Drip Rating") ── */}
      <div className="drip-rating-banner">
        {/* Top/Bottom Cyber Notch lines */}
        <div className="rating-notch-top-left" />
        <div className="rating-notch-bottom-right" />

        <div className="drip-rating-left">
          <span className="drip-rating-title">Drip Rating</span>
        </div>

        <div className="drip-rating-badge">
          <span className="rating-star-icon">★</span>
          <span className="rating-score-value">{overallStr}</span>
        </div>
      </div>

      {/* ── Bottom 3 Metric Sub-Cards ── */}
      <div className="metric-cards-grid">
        {/* Metric 1: Color Harmony */}
        <div className="metric-card">
          <div className="metric-card-notch" />
          <div className="metric-icon-box">
            {/* Palette SVG */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isLight ? "#000000" : "#ffffff"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="13.5" cy="6.5" r="1" fill="#a6ff00" stroke="#a6ff00" />
              <circle cx="17.5" cy="10.5" r="1" fill="#a6ff00" stroke="#a6ff00" />
              <circle cx="8.5" cy="7.5" r="1" fill="#a6ff00" stroke="#a6ff00" />
              <circle cx="6.5" cy="12.5" r="1" fill="#a6ff00" stroke="#a6ff00" />
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
            </svg>
          </div>
          <div className="metric-score-pill">
            <span>{colorHarmonyStr}</span>
          </div>
          <span className="metric-label">Color Harmony</span>
        </div>

        {/* Metric 2: Silhouette & Proportions */}
        <div className="metric-card">
          <div className="metric-card-notch" />
          <div className="metric-icon-box">
            {/* Sparkles SVG */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isLight ? "#000000" : "#ffffff"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              <circle cx="19" cy="5" r="1" fill="#a6ff00" stroke="#a6ff00" />
            </svg>
          </div>
          <div className="metric-score-pill">
            <span>{silhouetteStr}</span>
          </div>
          <span className="metric-label">Silhouette & Proportions</span>
        </div>

        {/* Metric 3: Coherence & Styling */}
        <div className="metric-card">
          <div className="metric-card-notch" />
          <div className="metric-icon-box">
            {/* Clothes Hanger SVG */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isLight ? "#000000" : "#ffffff"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 7a2 2 0 1 0-2-2 2 2 0 0 0 2 2v2" />
              <path d="M12 9 2.5 15.5a1.5 1.5 0 0 0 .9 2.5h17.2a1.5 1.5 0 0 0 .9-2.5L12 9z" />
            </svg>
          </div>
          <div className="metric-score-pill">
            <span>{coherenceStr}</span>
          </div>
          <span className="metric-label">Coherence & Styling</span>
        </div>
      </div>
    </div>
  );
}
