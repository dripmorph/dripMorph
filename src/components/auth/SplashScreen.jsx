import React, { useEffect } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import DripMorphLogo from '../DripMorphLogo';

export default function SplashScreen({ onFinish }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 2800);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="auth-screen splash-screen">
      <div className="splash-content">
        <div className="splash-logo-wrapper">
          <div className="splash-logo-box splash-icon-container splash-icon-glow">
            <DripMorphLogo size={58} />
          </div>
          <h1 className="splash-title">
            DRIP<span className="gradient-text">MORPH</span>
          </h1>
        </div>

        <p className="splash-tagline">
          Discover AI-Ranked Streetwear & Techwear Outfits
        </p>

        <div className="splash-badge">
          <Sparkles size={14} />
          <span>V2.0 AI Rating Engine</span>
        </div>

        <div className="splash-loader">
          <div className="splash-loader-bar" />
        </div>

        <button className="splash-skip-btn" onClick={onFinish}>
          <span>Get Started</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
