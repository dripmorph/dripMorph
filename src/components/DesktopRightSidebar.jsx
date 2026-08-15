import React, { useState, useEffect } from 'react';
import { Flame, Trophy, Star, ArrowUpRight, Sparkles, Search } from 'lucide-react';
import { fetchTrendingFits, fetchTopCreatorsByCity } from '../lib/outfitService';

const MOCK_SEARCH_INDEX = [
  { type: 'user', name: '@streetstyle_icon' },
  { type: 'user', name: '@neon_wanderer' },
  { type: 'user', name: '@brutal_aesthetic' },
  { type: 'user', name: '@cyber_ninja' },
  { type: 'user', name: '@tokyo_tide' },
  { type: 'user', name: '@berlin_minimalist' },
  { type: 'tag', name: '#techwear' },
  { type: 'tag', name: '#cyberpunk' },
  { type: 'tag', name: '#minimalist' },
  { type: 'tag', name: '#streetwear' }
];

export default function DesktopRightSidebar({ onUserClick, onFitClick, userCity = 'Seattle', refreshTrigger = 0 }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [trendingFits, setTrendingFits] = useState([]);
  const [topCreators, setTopCreators] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadSidebarData() {
      setIsLoading(true);
      try {
        const [fits, creators] = await Promise.all([
          fetchTrendingFits(3),
          fetchTopCreatorsByCity(userCity, 3),
        ]);
        if (isMounted) {
          setTrendingFits(fits || []);
          setTopCreators(creators || []);
        }
      } catch (err) {
        console.error('[DesktopRightSidebar] Error loading sidebar data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadSidebarData();
    return () => { isMounted = false; };
  }, [userCity, refreshTrigger]);

  const handleResultClick = (item) => {
    if (item.type === 'user') {
      if (onUserClick) onUserClick(item.name);
    }
    setSearchQuery('');
  };

  const showDropdown = searchQuery.trim().length > 0;
  const filteredResults = showDropdown
    ? MOCK_SEARCH_INDEX.filter(item =>
        item.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : [];

  return (
    <aside className="desktop-sidebar-right">
      {/* Search Bar Container */}
      <div className="search-container">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="Search creators, fits, or tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        
        {showDropdown && (
          <div className="search-dropdown">
            {filteredResults.length > 0 ? (
              filteredResults.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  className="search-result-item"
                  onClick={() => handleResultClick(item)}
                >
                  <span>{item.name}</span>
                  <span className="search-result-type-badge">{item.type}</span>
                </button>
              ))
            ) : (
              <div className="search-no-results">No results for "{searchQuery}"</div>
            )}
          </div>
        )}
      </div>

      {/* Trending Fits Widget */}
      <div className="right-widget-card">
        <div className="right-widget-header">
          <div className="widget-title-group">
            <Flame size={18} className="icon-flame" />
            <h3 className="widget-title">Trending Fits</h3>
          </div>
          <span className="widget-badge">LIVE</span>
        </div>

        <div className="trending-fits-list">
          {trendingFits.length === 0 ? (
            <div style={{ padding: '16px 12px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              No trending fits yet. Publish a fit to rank!
            </div>
          ) : (
            trendingFits.map((fit) => (
              <div key={fit.id} className="trending-fit-item" onClick={() => onFitClick && onFitClick(fit)}>
                <img src={fit.image} alt={fit.title} className="trending-fit-img" />
                <div className="trending-fit-info">
                  <span className="trending-fit-title">{fit.title}</span>
                  <span className="trending-fit-user">{fit.username}</span>
                </div>
                <div className="trending-score-badge">
                  <Star size={10} fill="currentColor" />
                  <span>{fit.score}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Top Creators in City Widget */}
      <div className="right-widget-card">
        <div className="right-widget-header">
          <div className="widget-title-group">
            <Trophy size={18} className="icon-trophy" />
            <h3 className="widget-title">Top Creators • {userCity}</h3>
          </div>
        </div>

        <div className="creators-list">
          {topCreators.length === 0 ? (
            <div style={{ padding: '16px 12px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              No creators in {userCity} yet.
            </div>
          ) : (
            topCreators.map((creator) => (
              <div key={creator.username} className="creator-row-item" onClick={() => onUserClick && onUserClick(creator.username)}>
                <div className="creator-rank-num">#{creator.rank}</div>
                <img src={creator.avatar} alt={creator.username} className="creator-avatar-thumb" />
                <div className="creator-meta">
                  <span className="creator-handle">{creator.username}</span>
                  <span className="creator-score-text">{creator.score} AI Score</span>
                </div>
                <ArrowUpRight size={16} className="creator-arrow-icon" />
              </div>
            ))
          )}
        </div>
      </div>

      {/* DripMorph AI Ranking Banner */}
      <div className="right-widget-card ai-banner-card">
        <div className="ai-banner-content">
          <Sparkles size={20} className="ai-sparkle-icon" />
          <div>
            <h4 className="ai-banner-title">DripMorph AI V1</h4>
            <p className="ai-banner-desc">Upload fits to get real-time silhouette & color harmony ratings!</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
