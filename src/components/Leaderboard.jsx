import React, { useState, useEffect, useRef } from 'react';
import { MapPin, ChevronDown, Trophy, X, Loader2, Sparkles, User } from 'lucide-react';
import { FiSearch } from 'react-icons/fi';
import { fetchLeaderboard } from '../lib/outfitService';
import { supabase } from '../lib/supabaseClient';

const CITIES = ['Kolkata', 'Mumbai', 'Delhi'];

{/* Robust Avatar Component with Initial Fallback */}
const renderAvatar = (avatarUrl, username, size = 'w-12 h-12', textSize = 'text-base') => {
  const initial = (username || 'U').replace(/^@/, '').charAt(0).toUpperCase() || 'U';
  const hasValidUrl = Boolean(avatarUrl && typeof avatarUrl === 'string' && !avatarUrl.includes('placeholder'));

  return (
    <div className={`${size} rounded-full flex items-center justify-center bg-zinc-800 border border-lime-400/50 overflow-hidden shrink-0`}>
      {hasValidUrl ? (
        <img 
          src={avatarUrl} 
          alt={username || 'User'} 
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            if (e.currentTarget.nextElementSibling) {
              e.currentTarget.nextElementSibling.style.display = 'flex';
            }
          }}
        />
      ) : null}
      <span 
        className={`${textSize} font-bold text-lime-400 flex items-center justify-center w-full h-full`}
        style={{ display: hasValidUrl ? 'none' : 'flex' }}
      >
        {initial}
      </span>
    </div>
  );
};

export default function Leaderboard({ onUserClick, onFitClick, showToast, refreshTrigger = 0 }) {
  const [scope, setScope] = useState('local'); // 'global' or 'local'
  const [selectedCity, setSelectedCity] = useState('Kolkata');
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchContainerRef = useRef(null);
  const debounceRef = useRef(null);

  const [creators, setCreators] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSearchQuery('');
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Debounced live user search against Supabase profiles
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }

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
        console.error('[Leaderboard Search] error:', err);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);

  const handleSearchResultClick = (username) => {
    if (onUserClick && username) {
      onUserClick(username.replace(/^@/, ''));
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const cityFilter = scope === 'local' ? selectedCity : null;
        const remote = await fetchLeaderboard({ city: cityFilter, limit: 50 });
        if (isMounted) {
          setCreators(remote || []);
        }
      } catch (err) {
        console.warn('[Leaderboard] Remote fetch error:', err);
        if (isMounted) setCreators([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, [scope, selectedCity, refreshTrigger]);

  // Podium elements from actual rankings (unaffected by search!)
  const topOne = creators.find(p => Number(p.rank) === 1) || creators[0];
  const topTwo = creators.find(p => Number(p.rank) === 2) || (creators[1] && creators[1] !== topOne ? creators[1] : null);
  const topThree = creators.find(p => Number(p.rank) === 3) || (creators[2] && creators[2] !== topOne && creators[2] !== topTwo ? creators[2] : null);

  // Ranked list (4th and beyond)
  const rankedList = creators.filter(p => Number(p.rank) > 3);

  const handleCitySelect = (city) => {
    setSelectedCity(city);
    setShowCityDropdown(false);
  };

  const handleScopeChange = (newScope) => {
    setScope(newScope);
  };

  const handleOutfitClick = (e, item) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!item) return;
    if (onFitClick) {
      const outfitImg = item.outfit_image || item.image_url || item.image || item.avatar_url;
      const fitObj = {
        id: item.outfit_id || item.id || `leaderboard-${item.username}`,
        title: item.title || `${item.username}'s Ranked Fit`,
        username: item.username,
        user_avatar: item.avatar_url || item.avatar,
        image: outfitImg,
        image_url: outfitImg,
        score: item.avg_score || item.score || '8.5',
        aiScore: item.avg_score || item.score || '8.5',
        products: item.products || []
      };
      onFitClick(fitObj);
    }
  };

  const handleProfileClick = (e, creator) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (onUserClick && creator) {
      const creatorUserObj = typeof creator === 'object' && creator !== null ? {
        ...creator,
        id: creator.user_id || creator.poster_id || creator.id || creator.creator_id,
        user_id: creator.user_id || creator.poster_id || creator.id || creator.creator_id,
        username: creator.username
      } : creator;
      onUserClick(creatorUserObj);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '896px', marginLeft: 'auto', marginRight: 'auto', paddingLeft: '16px', paddingRight: '16px', paddingTop: '16px', paddingBottom: '16px', minHeight: '100vh', color: 'var(--text-primary, #f4f4f5)' }}>
      {/* Redesigned Header Section (Inline Styles for Guaranteed Styling) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px', maxWidth: '448px', marginLeft: 'auto', marginRight: 'auto', width: '100%' }}>
        {/* Search Input Container */}
        <div ref={searchContainerRef} style={{ position: 'relative', width: '100%' }}>
          <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
            {searchLoading ? <Loader2 size={16} className="animate-spin text-lime-400" /> : <FiSearch size={16} />}
          </div>
          <input
            type="text"
            style={{
              width: '100%',
              backgroundColor: '#1c1c1e',
              color: '#ffffff',
              paddingLeft: '44px',
              paddingRight: '36px',
              paddingTop: '12px',
              paddingBottom: '12px',
              borderRadius: '9999px',
              fontSize: '14px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              outline: 'none',
              boxSizing: 'border-box'
            }}
            placeholder="Search ranked creators..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
              }}
              style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
            >
              <X size={14} />
            </button>
          )}

          {/* Floating Search Dropdown */}
          {searchQuery.trim().length > 0 && (
            <div 
              className="search-dropdown" 
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                right: 0,
                backgroundColor: '#1c1c1e',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '16px',
                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.7)',
                zIndex: 100,
                maxHeight: '260px',
                overflowY: 'auto',
                padding: '6px'
              }}
            >
              {searchLoading && searchResults.length === 0 ? (
                <div style={{ padding: '12px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
                  Searching...
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((profile) => {
                  if (!profile) return null;
                  const uname = profile.username || 'user';
                  return (
                    <button
                      key={profile.id || uname}
                      type="button"
                      onClick={() => handleSearchResultClick(profile.username)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        color: '#ffffff',
                        backgroundColor: 'transparent',
                        border: 'none',
                        width: '100%',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div style={{ position: 'relative', width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                        {profile.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt={uname}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', backgroundColor: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a6fc29', fontWeight: '700', fontSize: '12px' }}>
                            {uname.replace(/^@/, '').charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {uname.replace(/^@/, '')}
                        </span>
                        {profile.city && (
                          <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                            {profile.city}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(255, 255, 255, 0.08)', color: '#a1a1aa' }}>
                        USER
                      </span>
                    </button>
                  );
                })
              ) : (
                <div style={{ padding: '12px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
                  No users found for "{searchQuery}"
                </div>
              )}
            </div>
          )}
        </div>

        {/* Segmented Control Pill Container (Global / Local) */}
        <div style={{ backgroundColor: '#1c1c1e', padding: '4px', borderRadius: '9999px', display: 'flex', alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
          <button
            style={{
              flex: 1,
              paddingTop: '10px',
              paddingBottom: '10px',
              borderRadius: '9999px',
              fontSize: '14px',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backgroundColor: scope === 'global' ? '#a6fc29' : 'transparent',
              color: scope === 'global' ? '#000000' : '#9ca3af',
              boxShadow: scope === 'global' ? '0 0 12px rgba(166, 252, 41, 0.4)' : 'none'
            }}
            onClick={() => handleScopeChange('global')}
          >
            Global
          </button>
          <button
            style={{
              flex: 1,
              paddingTop: '10px',
              paddingBottom: '10px',
              borderRadius: '9999px',
              fontSize: '14px',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backgroundColor: scope === 'local' ? '#a6fc29' : 'transparent',
              color: scope === 'local' ? '#000000' : '#9ca3af',
              boxShadow: scope === 'local' ? '0 0 12px rgba(166, 252, 41, 0.4)' : 'none'
            }}
            onClick={() => handleScopeChange('local')}
          >
            Local
          </button>
        </div>

        {/* City Selector Dropdown (Shown only when scope === 'local') */}
        {scope === 'local' && (
          <div style={{ position: 'relative', width: 'fit-content' }}>
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--text-primary, #ffffff)',
                fontSize: '14px',
                fontWeight: '600',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '8px'
              }}
              onClick={() => setShowCityDropdown(!showCityDropdown)}
            >
              <MapPin size={14} style={{ color: '#a6fc29', flexShrink: 0 }} />
              <span>{selectedCity}</span>
              <ChevronDown size={14} style={{ color: '#9ca3af', transition: 'transform 0.2s ease', transform: showCityDropdown ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </button>

            {showCityDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  marginTop: '8px',
                  width: '176px',
                  backgroundColor: '#1c1c1e',
                  border: '1px solid rgba(63, 63, 70, 0.8)',
                  borderRadius: '16px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  zIndex: 30,
                  paddingTop: '6px',
                  paddingBottom: '6px',
                  overflow: 'hidden'
                }}
              >
                {CITIES.map((city) => (
                  <button
                    key={city}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 16px',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: city === selectedCity ? '#a6fc29' : '#d4d4d8',
                      backgroundColor: city === selectedCity ? 'rgba(166, 252, 41, 0.1)' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                    onClick={() => handleCitySelect(city)}
                  >
                    <span>{city}</span>
                    {city === selectedCity && <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#a6fc29' }} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-400">
          <Loader2 size={28} className="animate-spin text-lime-400" />
          <span className="text-sm font-semibold">Fetching live leaderboard...</span>
        </div>
      ) : creators.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center border border-dashed border-zinc-800 bg-zinc-900/30 rounded-2xl my-6 gap-3">
          <Trophy size={42} className="text-lime-400 opacity-80" />
          <h3 className="text-white text-lg font-bold">No creators ranked yet</h3>
          <p className="text-zinc-400 text-xs max-w-xs leading-relaxed">
            {scope === 'local'
              ? `No ranked creators in ${selectedCity} yet. Be the first to publish an outfit and claim #1!`
              : 'Be the first creator to scan and publish an outfit to claim top rank!'}
          </p>
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: '448px', marginLeft: 'auto', marginRight: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '32px' }}>
          
          {/* #1 Winner Hero Card (Stitch Mockup) */}
          {topOne && (
            <div 
              style={{ 
                position: 'relative', 
                backgroundColor: '#1f1f22', 
                border: '2px solid #a6fc29', 
                boxShadow: '0 0 25px rgba(166, 252, 41, 0.4)', 
                borderRadius: '24px', 
                padding: '16px', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                width: '100%', 
                boxSizing: 'border-box' 
              }}
            >
              {/* Center Outfit Photo with Frosted Overlay */}
              {(() => {
                const outfitPhoto = topOne.outfit_image || topOne.image_url || topOne.image || topOne.avatar_url;
                const initial = (topOne.username || 'U').replace(/^@/, '').charAt(0).toUpperCase();

                return (
                  <div 
                    style={{ 
                      width: '100%', 
                      height: '220px', 
                      borderRadius: '16px', 
                      position: 'relative', 
                      overflow: 'hidden', 
                      backgroundColor: '#18181b', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease, opacity 0.2s ease'
                    }}
                    className="hover:opacity-95"
                    onClick={(e) => handleOutfitClick(e, topOne)}
                    title="Click to view outfit detail"
                  >
                    {outfitPhoto ? (
                      <img 
                        src={outfitPhoto} 
                        alt={topOne.username || 'Winner Outfit'} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          if (e.currentTarget.nextElementSibling) {
                            e.currentTarget.nextElementSibling.style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}

                    {/* Dark Image Fallback */}
                    <div 
                      style={{ 
                        display: outfitPhoto ? 'none' : 'flex', 
                        width: '100%', 
                        height: '100%', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        backgroundColor: '#18181b', 
                        color: '#a6fc29', 
                        fontWeight: 'bold', 
                        fontSize: '48px' 
                      }}
                    >
                      {initial}
                    </div>

                    {/* Frosted Glass Overlay Badge */}
                    <div 
                      style={{ 
                        position: 'absolute', 
                        top: '50%', 
                        left: '50%', 
                        transform: 'translate(-50%, -50%)', 
                        backgroundColor: 'rgba(0, 0, 0, 0.45)', 
                        backdropFilter: 'blur(8px)', 
                        WebkitBackdropFilter: 'blur(8px)', 
                        border: '1px solid rgba(255, 255, 255, 0.2)', 
                        padding: '12px 24px', 
                        borderRadius: '16px', 
                        textAlign: 'center', 
                        zIndex: 10,
                        boxShadow: '0 8px 20px rgba(0, 0, 0, 0.4)',
                        pointerEvents: 'none'
                      }}
                    >
                      <div style={{ fontSize: '24px', fontWeight: '800', color: '#ffffff', lineHeight: 1 }}>
                        #1
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#ffffff', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: '4px' }}>
                        WINNER
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Creator Chip Below Photo */}
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px', 
                  marginTop: '12px', 
                  marginBottom: '12px',
                  cursor: 'pointer' 
                }}
                className="hover:opacity-80 transition-opacity"
                onClick={(e) => handleProfileClick(e, topOne)}
                title={`View ${topOne.username}'s profile`}
              >
                {(() => {
                  const avatarUrl = topOne.avatar_url || topOne.avatar || topOne.user_avatar;
                  const initial = (topOne.username || 'U').replace(/^@/, '').charAt(0).toUpperCase();

                  return (
                    <div style={{ width: '24px', height: '24px', borderRadius: '9999px', overflow: 'hidden', backgroundColor: '#18181b', border: '1px solid rgba(255, 255, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {avatarUrl ? (
                        <img 
                          src={avatarUrl} 
                          alt={topOne.username} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            if (e.currentTarget.nextElementSibling) {
                              e.currentTarget.nextElementSibling.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <span style={{ display: avatarUrl ? 'none' : 'flex', fontSize: '10px', fontWeight: 'bold', color: '#a6fc29', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                        {initial}
                      </span>
                    </div>
                  );
                })()}
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#ffffff' }}>
                  {topOne.username ? topOne.username.replace(/^@/, '') : 'creator'}
                </span>
              </div>

              {/* Full-Width Solid Neon-Lime DRIP SCORE Pill */}
              <div 
                style={{ 
                  width: '100%', 
                  backgroundColor: '#a6fc29', 
                  color: '#000000', 
                  padding: '10px', 
                  borderRadius: '9999px', 
                  fontWeight: '900', 
                  fontSize: '14px', 
                  textAlign: 'center', 
                  boxSizing: 'border-box',
                  boxShadow: '0 4px 14px rgba(166, 252, 41, 0.3)',
                  cursor: 'pointer'
                }}
                className="hover:opacity-90 transition-opacity"
                onClick={(e) => handleOutfitClick(e, topOne)}
                title="Click to view outfit detail"
              >
                DRIP SCORE: {topOne.avg_score || topOne.score || '6.0'}
              </div>
            </div>
          )}

          {/* 2-Column Grid for #2 and #3 Runner-Up Cards */}
          {(topTwo || topThree) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%' }}>
              {/* #2 Runner-Up Card */}
              {topTwo && (
                <div 
                  style={{ 
                    backgroundColor: '#1f1f22', 
                    border: '1px solid rgba(63, 63, 70, 0.6)', 
                    borderRadius: '18px', 
                    padding: '12px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)' 
                  }}
                >
                  {/* Left Thumbnail: Small Tall Outfit Preview */}
                  {(() => {
                    const outfitPhoto = topTwo.outfit_image || topTwo.image_url || topTwo.image || topTwo.avatar_url;
                    const initial = (topTwo.username || 'U').replace(/^@/, '').charAt(0).toUpperCase();

                    return (
                      <div 
                        style={{ 
                          width: '44px', 
                          height: '56px', 
                          borderRadius: '10px', 
                          overflow: 'hidden', 
                          backgroundColor: '#18181b', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          flexShrink: 0,
                          cursor: 'pointer'
                        }}
                        className="hover:opacity-90 transition-opacity"
                        onClick={(e) => handleOutfitClick(e, topTwo)}
                        title="Click to view outfit"
                      >
                        {outfitPhoto ? (
                          <img 
                            src={outfitPhoto} 
                            alt={topTwo.username} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              if (e.currentTarget.nextElementSibling) {
                                e.currentTarget.nextElementSibling.style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <span style={{ display: outfitPhoto ? 'none' : 'flex', fontSize: '16px', fontWeight: 'bold', color: '#a6fc29', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                          {initial}
                        </span>
                      </div>
                    );
                  })()}

                  {/* Right Stack */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
                    <div 
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', cursor: 'pointer' }}
                      className="hover:opacity-80 transition-opacity"
                      onClick={(e) => handleProfileClick(e, topTwo)}
                      title={`View ${topTwo.username}'s profile`}
                    >
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#a1a1aa', flexShrink: 0 }}>#2</span>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {topTwo.username ? topTwo.username.replace(/^@/, '') : 'creator'}
                      </span>
                    </div>
                    <div 
                      style={{ backgroundColor: '#a6fc29', color: '#000000', padding: '3px 8px', borderRadius: '9999px', fontSize: '10px', fontWeight: '800', width: 'fit-content', whiteSpace: 'nowrap', cursor: 'pointer' }}
                      className="hover:opacity-90 transition-opacity"
                      onClick={(e) => handleOutfitClick(e, topTwo)}
                      title="Click to view outfit"
                    >
                      DRIP SCORE: {topTwo.avg_score || topTwo.score || '5.9'}
                    </div>
                  </div>
                </div>
              )}

              {/* #3 Runner-Up Card */}
              {topThree && (
                <div 
                  style={{ 
                    backgroundColor: '#1f1f22', 
                    border: '1px solid rgba(63, 63, 70, 0.6)', 
                    borderRadius: '18px', 
                    padding: '12px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)' 
                  }}
                >
                  {/* Left Thumbnail: Small Tall Outfit Preview */}
                  {(() => {
                    const outfitPhoto = topThree.outfit_image || topThree.image_url || topThree.image || topThree.avatar_url;
                    const initial = (topThree.username || 'U').replace(/^@/, '').charAt(0).toUpperCase();

                    return (
                      <div 
                        style={{ 
                          width: '44px', 
                          height: '56px', 
                          borderRadius: '10px', 
                          overflow: 'hidden', 
                          backgroundColor: '#18181b', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          flexShrink: 0,
                          cursor: 'pointer'
                        }}
                        className="hover:opacity-90 transition-opacity"
                        onClick={(e) => handleOutfitClick(e, topThree)}
                        title="Click to view outfit"
                      >
                        {outfitPhoto ? (
                          <img 
                            src={outfitPhoto} 
                            alt={topThree.username} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              if (e.currentTarget.nextElementSibling) {
                                e.currentTarget.nextElementSibling.style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <span style={{ display: outfitPhoto ? 'none' : 'flex', fontSize: '16px', fontWeight: 'bold', color: '#a6fc29', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                          {initial}
                        </span>
                      </div>
                    );
                  })()}

                  {/* Right Stack */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
                    <div 
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', cursor: 'pointer' }}
                      className="hover:opacity-80 transition-opacity"
                      onClick={(e) => handleProfileClick(e, topThree)}
                      title={`View ${topThree.username}'s profile`}
                    >
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#a1a1aa', flexShrink: 0 }}>#3</span>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {topThree.username ? topThree.username.replace(/^@/, '') : 'creator'}
                      </span>
                    </div>
                    <div 
                      style={{ backgroundColor: '#a6fc29', color: '#000000', padding: '3px 8px', borderRadius: '9999px', fontSize: '10px', fontWeight: '800', width: 'fit-content', whiteSpace: 'nowrap', cursor: 'pointer' }}
                      className="hover:opacity-90 transition-opacity"
                      onClick={(e) => handleOutfitClick(e, topThree)}
                      title="Click to view outfit"
                    >
                      DRIP SCORE: {topThree.avg_score || topThree.score || '5.8'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Top 10 Section Grid (#4 to #10) */}
          {(() => {
            const othersList = creators.filter(p => p !== topOne && p !== topTwo && p !== topThree);
            const topTenList = othersList.slice(0, 7);
            const remainingList = othersList.slice(7);

            return (
              <div style={{ width: '100%', marginTop: '8px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary, #ffffff)', marginBottom: '12px' }}>
                  Top 10 {scope === 'local' ? 'Local' : 'Global'}
                </h3>

                {topTenList.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {topTenList.map((player, index) => {
                      const displayRank = player.rank || (index + 4);
                      const avatarUrl = player.avatar_url || player.avatar || player.user_avatar;
                      const initial = (player.username || 'U').replace(/^@/, '').charAt(0).toUpperCase();

                      return (
                        <div 
                          key={player.id || displayRank} 
                          style={{ 
                            backgroundColor: '#1c1c1e', 
                            border: '1px solid rgba(63, 63, 70, 0.5)', 
                            borderRadius: '9999px', 
                            padding: '6px 12px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between'
                          }}
                        >
                          {/* Left Info (Profile Click) */}
                          <div 
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, cursor: 'pointer' }}
                            className="hover:opacity-80 transition-opacity"
                            onClick={(e) => handleProfileClick(e, player)}
                            title={`View ${player.username}'s profile`}
                          >
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#a1a1aa', flexShrink: 0 }}>
                              #{displayRank}.
                            </span>
                            <div style={{ width: '20px', height: '20px', borderRadius: '9999px', overflow: 'hidden', backgroundColor: '#18181b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {avatarUrl ? (
                                <img 
                                  src={avatarUrl} 
                                  alt={player.username} 
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    if (e.currentTarget.nextElementSibling) {
                                      e.currentTarget.nextElementSibling.style.display = 'flex';
                                    }
                                  }}
                                />
                              ) : null}
                              <span style={{ display: avatarUrl ? 'none' : 'flex', fontSize: '9px', fontWeight: 'bold', color: '#a6fc29', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                                {initial}
                              </span>
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: '600', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {player.username ? player.username.replace(/^@/, '') : 'user'}
                            </span>
                          </div>

                          {/* Right Badge (Outfit Click) */}
                          <div 
                            style={{ backgroundColor: '#a6fc29', color: '#000000', padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: '800', flexShrink: 0, marginLeft: '4px', cursor: 'pointer' }}
                            className="hover:opacity-90 transition-opacity"
                            onClick={(e) => handleOutfitClick(e, player)}
                            title="Click to view outfit"
                          >
                            {player.avg_score || player.score || '5.5'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {/* Remaining Ranked Creators (#11+) */}
                {remainingList.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '20px' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary, #a1a1aa)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                      More Ranked Creators
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {remainingList.map((player, index) => {
                        const displayRank = player.rank || (index + 11);
                        const avatarUrl = player.avatar_url || player.avatar || player.user_avatar;
                        const initial = (player.username || 'U').replace(/^@/, '').charAt(0).toUpperCase();

                        return (
                          <div 
                            key={player.id || displayRank} 
                            style={{ 
                              backgroundColor: '#1c1c1e', 
                              border: '1px solid rgba(63, 63, 70, 0.5)', 
                              borderRadius: '9999px', 
                              padding: '6px 12px', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between'
                            }}
                          >
                            {/* Left Info (Profile Click) */}
                            <div 
                              style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, cursor: 'pointer' }}
                              className="hover:opacity-80 transition-opacity"
                              onClick={(e) => handleProfileClick(e, player)}
                              title={`View ${player.username}'s profile`}
                            >
                              <span style={{ fontSize: '11px', fontWeight: '700', color: '#a1a1aa', flexShrink: 0 }}>
                                #{displayRank}.
                              </span>
                              <div style={{ width: '20px', height: '20px', borderRadius: '9999px', overflow: 'hidden', backgroundColor: '#18181b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {avatarUrl ? (
                                  <img 
                                    src={avatarUrl} 
                                    alt={player.username} 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      if (e.currentTarget.nextElementSibling) {
                                        e.currentTarget.nextElementSibling.style.display = 'flex';
                                      }
                                    }}
                                  />
                                ) : null}
                                <span style={{ display: avatarUrl ? 'none' : 'flex', fontSize: '9px', fontWeight: 'bold', color: '#a6fc29', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                                  {initial}
                                </span>
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: '600', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {player.username ? player.username.replace(/^@/, '') : 'user'}
                              </span>
                            </div>

                            {/* Right Badge (Outfit Click) */}
                            <div 
                              style={{ backgroundColor: '#a6fc29', color: '#000000', padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: '800', flexShrink: 0, marginLeft: '4px', cursor: 'pointer' }}
                              className="hover:opacity-90 transition-opacity"
                              onClick={(e) => handleOutfitClick(e, player)}
                              title="Click to view outfit"
                            >
                              {player.avg_score || player.score || '5.0'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

