import React, { useState, useEffect, useRef } from 'react';
import { Menu, Bell, Flame, Star, Loader2, X } from 'lucide-react';
import DripMorphLogo from './DripMorphLogo';
import { fetchTrendingFits } from '../lib/outfitService';

export default function Header({ 
  onMenuClick, 
  onBellClick, 
  hasNotifications, 
  onTabChange,
  onFitClick,
  refreshTrigger = 0
}) {
  const [showTrendingDropdown, setShowTrendingDropdown] = useState(false);
  const [trendingFits, setTrendingFits] = useState([]);
  const [loadingFits, setLoadingFits] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  // Load trending fits whenever dropdown opens or refreshTrigger changes
  useEffect(() => {
    let isMounted = true;
    async function loadTrending() {
      setLoadingFits(true);
      try {
        const fits = await fetchTrendingFits(8);
        if (isMounted) {
          setTrendingFits(Array.isArray(fits) ? fits : []);
        }
      } catch (err) {
        console.error('[Header] Failed to fetch trending fits:', err);
      } finally {
        if (isMounted) setLoadingFits(false);
      }
    }

    if (showTrendingDropdown || trendingFits.length === 0) {
      loadTrending();
    }

    return () => { isMounted = false; };
  }, [showTrendingDropdown, refreshTrigger]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setShowTrendingDropdown(false);
      }
    }

    if (showTrendingDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showTrendingDropdown]);

  const handleFitSelect = (fit) => {
    setShowTrendingDropdown(false);
    if (onFitClick) {
      onFitClick(fit);
    }
  };

  return (
    <header className="app-header">
      <button className="header-btn" onClick={onMenuClick} aria-label="Menu">
        <Menu size={22} strokeWidth={2} />
      </button>

      <div
        className="brand-logo-badge"
        onClick={() => onTabChange && onTabChange('feed')}
        style={{ cursor: 'pointer' }}
        role="button"
        tabIndex={0}
        aria-label="Go to Home"
      >
        <DripMorphLogo size={24} />
        <span className="sidebar-brand-title">DRIPMORPH</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' }}>
        {/* Notifications Button */}
        <button 
          className="header-btn" 
          onClick={onBellClick} 
          aria-label="Notifications"
          style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
        >
          <div style={{ position: 'relative', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={22} strokeWidth={2} style={{ display: 'block' }} />
            {hasNotifications && (
              <span style={{
                position: 'absolute',
                top: '0px',
                right: '0px',
                width: '7px',
                height: '7px',
                backgroundColor: 'var(--accent-solid)',
                borderRadius: '50%',
                border: '1.5px solid var(--bg-color)'
              }} />
            )}
          </div>
        </button>

        {/* Trending Fits Button (Replaces Chat/Message icon) */}
        <button 
          ref={buttonRef}
          className="header-btn header-trending-btn" 
          onClick={() => setShowTrendingDropdown(prev => !prev)} 
          aria-label="Trending Fits"
          aria-expanded={showTrendingDropdown}
          style={{
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            color: showTrendingDropdown ? '#a6fc29' : 'var(--text-primary)',
            transition: 'color 0.2s ease',
            position: 'relative'
          }}
        >
          <div style={{ position: 'relative', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Flame size={22} strokeWidth={2} style={{ display: 'block' }} />
            <span style={{
              position: 'absolute',
              top: '0px',
              right: '0px',
              width: '7px',
              height: '7px',
              backgroundColor: '#a6fc29',
              borderRadius: '50%',
              boxShadow: '0 0 6px rgba(166, 252, 41, 0.8)'
            }} />
          </div>
        </button>

        {/* Trending Fits Dropdown Menu & Backdrop */}
        {showTrendingDropdown && (
          <>
            <div 
              className="mobile-trending-backdrop" 
              onClick={() => setShowTrendingDropdown(false)} 
            />
            <div 
              ref={dropdownRef}
              className="mobile-trending-dropdown"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Dropdown Header */}
              <div className="mobile-trending-dropdown-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Flame size={18} className="icon-flame" style={{ color: '#a6fc29' }} />
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Trending Fits
                  </h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    backgroundColor: 'rgba(166, 252, 41, 0.15)',
                    color: '#a6fc29',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    letterSpacing: '0.5px'
                  }}>
                    LIVE
                  </span>
                  <button 
                    type="button"
                    onClick={() => setShowTrendingDropdown(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    aria-label="Close"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Fits List */}
              <div className="mobile-trending-dropdown-list">
                {loadingFits && trendingFits.length === 0 ? (
                  <div style={{ padding: '24px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Loading trending fits...</span>
                  </div>
                ) : trendingFits.length === 0 ? (
                  <div style={{ padding: '24px 12px', textAlign: 'center', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                    No trending fits yet. Publish a fit to rank!
                  </div>
                ) : (
                  trendingFits.map((fit) => (
                    <div 
                      key={fit.id} 
                      className="trending-fit-item" 
                      onClick={() => handleFitSelect(fit)}
                    >
                      <img 
                        src={fit.image || fit.image_url || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=100&h=120&fit=crop'} 
                        alt={fit.title || 'Trending Outfit'} 
                        className="trending-fit-img" 
                      />
                      <div className="trending-fit-info">
                        <span className="trending-fit-title">{fit.title || fit.caption || 'Outfit Check'}</span>
                        <span className="trending-fit-user">{(fit.username || 'creator').replace(/^@/, '')}</span>
                      </div>
                      <div className="trending-score-badge">
                        <Star size={11} fill="currentColor" />
                        <span>{fit.score || fit.overall_score || '8.0'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
