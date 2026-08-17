import React, { useState, useEffect, useRef } from 'react';
import { Flame, Trophy, Star, ArrowUpRight, Sparkles, Search, User, Loader } from 'lucide-react';
import { fetchTrendingFits, fetchTopCreatorsByCity } from '../lib/outfitService';
import { supabase } from '../lib/supabaseClient';

export default function DesktopRightSidebar({ onUserClick, onFitClick, userCity = 'Seattle', refreshTrigger = 0 }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [trendingFits, setTrendingFits] = useState([]);
  const [topCreators, setTopCreators] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setSearchQuery('');
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Load sidebar widgets
  useEffect(() => {
    let isMounted = true;
    async function loadSidebarData() {
      setIsLoading(true);
      try {
        const [fits, creators] = await Promise.all([
          fetchTrendingFits(3).catch(() => []),
          fetchTopCreatorsByCity(userCity, 3).catch(() => []),
        ]);
        if (isMounted) {
          setTrendingFits(Array.isArray(fits) ? fits : []);
          setTopCreators(Array.isArray(creators) ? creators : []);
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

  // Debounced live search against Supabase profiles table
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }

    // Debounce: wait 300ms after the user stops typing
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, city')
          .ilike('username', `%${q}%`)
          .limit(8);

        if (!error && Array.isArray(data)) {
          setSearchResults(data);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.error('[Search] error:', err);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);

  const handleResultClick = (username) => {
    if (onUserClick && username) onUserClick(`@${username.replace(/^@/, '')}`);
    setSearchQuery('');
    setSearchResults([]);
  };

  const showDropdown = searchQuery.trim().length > 0;

  return (
    <aside className="desktop-sidebar-right">
      {/* Search Bar */}
      <div className="desktop-search-container" ref={containerRef}>
        {searchLoading
          ? <Loader size={15} className="desktop-search-icon search-spinner" />
          : <Search size={16} className="desktop-search-icon" />
        }
        <input
          type="text"
          className="desktop-search-input"
          placeholder="Search creators, fits, or tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoComplete="off"
        />

        {showDropdown && (
          <div className="search-dropdown">
            {searchLoading && searchResults.length === 0 ? (
              <div className="search-no-results">Searching...</div>
            ) : searchResults.length > 0 ? (
              searchResults.map((profile) => {
                if (!profile) return null;
                const uname = profile.username || 'user';
                return (
                  <button
                    key={profile.id || uname}
                    type="button"
                    className="search-result-item"
                    onClick={() => handleResultClick(profile.username)}
                  >
                    <div className="search-result-avatar-wrap">
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={uname}
                          className="search-result-avatar"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            if (e.currentTarget.nextElementSibling) {
                              e.currentTarget.nextElementSibling.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <div
                        className="search-result-avatar-placeholder"
                        style={{ display: profile.avatar_url ? 'none' : 'flex' }}
                      >
                        <User size={14} />
                      </div>
                    </div>
                    <div className="search-result-info">
                      <span className="search-result-username">@{uname}</span>
                      {profile.city && (
                        <span className="search-result-city">{profile.city}</span>
                      )}
                    </div>
                    <span className="search-result-type-badge">user</span>
                  </button>
                );
              })
            ) : (
              <div className="search-no-results">No users found for "{searchQuery}"</div>
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
                <img src={fit.image} alt={fit.title || 'fit'} className="trending-fit-img" />
                <div className="trending-fit-info">
                  <span className="trending-fit-title">{fit.title || 'Outfit'}</span>
                  <span className="trending-fit-user">{fit.username || '@creator'}</span>
                </div>
                <div className="trending-score-badge">
                  <Star size={10} fill="currentColor" />
                  <span>{fit.score || '8.0'}</span>
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
                <img src={creator.avatar} alt={creator.username || 'creator'} className="creator-avatar-thumb" />
                <div className="creator-meta">
                  <span className="creator-handle">{creator.username || '@creator'}</span>
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
