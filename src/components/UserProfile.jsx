import React, { useState, useEffect, useRef } from 'react';
import { MapPin, User, Edit2, Star, ShoppingBag, ShoppingBasket, MoreVertical, Camera, ArrowLeft, X } from 'lucide-react';
import { TbRuler2 } from 'react-icons/tb';
import { FaStar } from 'react-icons/fa';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { fetchUserOutfits, uploadAvatarImage, fetchUserProfile } from '../lib/outfitService';
import ProfileShoppingModal from './ProfileShoppingModal';

// Import our local premium outfit images
import techwearImg from '../assets/techwear_look.png';
import cyberpunkImg from '../assets/cyberpunk_look.png';
import minimalistImg from '../assets/minimalist_look.png';

// Mock Top 5 Fits data by toggle state
const MOCK_FITS_BY_TIME = {
  'ALL TIME': [
    {
      id: 1,
      title: 'Cyberpunk Tailoring',
      brands: 'Acronym / Yohji',
      score: '8.9',
      image: cyberpunkImg,
      products: [
        { name: 'Cyberpunk Tailored Coat', price: '$299' },
        { name: 'Pleated Tactical Skirt/Pants', price: '$180' }
      ]
    },
    {
      id: 2,
      title: 'Brutalist Winter',
      brands: 'Jil Sander / Rick',
      score: '8.7',
      image: minimalistImg,
      products: [
        { name: 'Brutalist Long Coat', price: '$420' },
        { name: 'Structured Boots', price: '$350' }
      ]
    },
    {
      id: 3,
      title: 'Tactical Techwear',
      brands: 'Nike ACG / Arc',
      score: '8.5',
      image: techwearImg,
      products: [
        { name: 'Modular Tactical Vest', price: '$220' }
      ]
    },
    {
      id: 4,
      title: 'Oversized Streetwear',
      brands: 'Y-3 / Essentials',
      score: '8.4',
      image: minimalistImg,
      products: [
        { name: 'Oversized Hoodie', price: '$130' }
      ]
    },
    {
      id: 5,
      title: 'Neon Wanderer',
      brands: 'Cav Empt / Off',
      score: '8.1',
      image: cyberpunkImg,
      products: [
        { name: 'Reflective Bomber Jacket', price: '$240' }
      ]
    }
  ],
  'THIS WEEK': [
    {
      id: 1,
      title: 'Brutalist Winter',
      brands: 'Jil Sander / Rick',
      score: '8.7',
      image: minimalistImg,
      products: [
        { name: 'Brutalist Long Coat', price: '$420' }
      ]
    },
    {
      id: 2,
      title: 'Tactical Techwear',
      brands: 'Nike ACG / Arc',
      score: '8.5',
      image: techwearImg,
      products: [
        { name: 'Modular Tactical Vest', price: '$220' }
      ]
    },
    {
      id: 3,
      title: 'Oversized Streetwear',
      brands: 'Y-3 / Essentials',
      score: '8.4',
      image: minimalistImg,
      products: [
        { name: 'Oversized Hoodie', price: '$130' }
      ]
    },
    {
      id: 4,
      title: 'Neon Wanderer',
      brands: 'Cav Empt / Off',
      score: '8.1',
      image: cyberpunkImg,
      products: [
        { name: 'Reflective Bomber Jacket', price: '$240' }
      ]
    },
    {
      id: 5,
      title: 'Cyberpunk Tailoring',
      brands: 'Acronym / Yohji',
      score: '7.9',
      image: techwearImg,
      products: [
        { name: 'Cyberpunk Tailored Coat', price: '$299' }
      ]
    }
  ]
};

export default function UserProfile({ 
  showToast, 
  onShopClick, 
  onFitClick,
  profileFits, 
  fitsCount = 42, 
  avgScore = 8.4, 
  onEditFit, 
  onDeleteFit, 
  recentPosts = [], 
  weekLabel = 'This Week',
  username = '@minimalist_enzo',
  avatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&h=240&fit=crop',
  city = '',
  height = '',
  gender = '',
  instagramLink = '',
  bio = 'Minimalist enthusiast. Exploring the intersection of digital precision and sartorial elegance.',
  isOwnProfile = true,
  onBackClick = null,
  onAvatarChange = null,
  onNavigateToChat = null,
  activeTab = 'profile',
  refreshTrigger = 0,
  lastDeletedOutfitId = null,
  viewedUser = null
}) {
  const [activeFitMenuId, setActiveFitMenuId] = useState(null);
  const [activeRecentMenuId, setActiveRecentMenuId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isShoppingModalOpen, setIsShoppingModalOpen] = useState(false);

  const fileInputRef = useRef(null);
  const [avatarUrl, setAvatarUrl] = useState(avatar);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [userOutfits, setUserOutfits] = useState(null);
  const [fetchedProfile, setFetchedProfile] = useState(null);

  const { openChat } = useChat();
  const { user, updateProfileDetails } = useAuth();

  useEffect(() => {
    setAvatarUrl(avatar);
    setIsFollowing(false);
  }, [avatar]);

  // Load follow state + followers count from Supabase when viewing another user
  useEffect(() => {
    if (isOwnProfile || !fetchedProfile?.id) {
      // For own profile: just load followers count
      if (isOwnProfile && user?.id) {
        supabase
          .from('follows')
          .select('follower_id', { count: 'exact', head: true })
          .eq('following_id', user.id)
          .then(({ count, error }) => {
            if (!error && count !== null) setFollowersCount(count);
          })
          .catch((err) => console.warn('[UserProfile] follows count error:', err));
      }
      return;
    }
    const viewedId = fetchedProfile.id;
    // Check if current user follows this profile
    if (user?.id) {
      supabase
        .from('follows')
        .select('follower_id', { count: 'exact', head: true })
        .eq('follower_id', user.id)
        .eq('following_id', viewedId)
        .then(({ count, error }) => {
          if (!error && count !== null) setIsFollowing(count > 0);
        })
        .catch((err) => console.warn('[UserProfile] check following error:', err));
    }
    // Get total followers count for this profile
    supabase
      .from('follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('following_id', viewedId)
      .then(({ count, error }) => {
        if (!error && count !== null) setFollowersCount(count);
      })
      .catch((err) => console.warn('[UserProfile] profile followers count error:', err));
  }, [fetchedProfile?.id, user?.id, isOwnProfile]);

  const handleFollowClick = async () => {
    if (!user?.id || !fetchedProfile?.id) return;
    const viewedId = fetchedProfile.id;
    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', viewedId);
        setIsFollowing(false);
        setFollowersCount(prev => Math.max(0, prev - 1));
        showToast(`Unfollowed ${displayUsername}`);
      } else {
        await supabase
          .from('follows')
          .insert({ follower_id: user.id, following_id: viewedId });
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
        showToast(`Following ${displayUsername}`);
      }
    } catch (err) {
      console.error('[UserProfile] handleFollowClick error:', err);
    }
  };

  useEffect(() => {
    if (activeFitMenuId === null && activeRecentMenuId === null) return;
    const closeMenu = () => { setActiveFitMenuId(null); setActiveRecentMenuId(null); };
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, [activeFitMenuId, activeRecentMenuId]);

  // Optimistically remove deleted outfit immediately from userOutfits local state
  useEffect(() => {
    if (lastDeletedOutfitId) {
      setUserOutfits(prev => (prev ? prev.filter(item => item.id !== lastDeletedOutfitId) : []));
    }
  }, [lastDeletedOutfitId]);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      console.log('[UserProfile.loadData] Step 1 Initiated:', {
        isOwnProfile,
        loggedInUserId: user?.id,
        viewedUser_id: typeof viewedUser === 'object' && viewedUser !== null ? viewedUser.id : undefined,
        viewedUser_user_id: typeof viewedUser === 'object' && viewedUser !== null ? viewedUser.user_id : undefined,
        viewedUser_poster_id: typeof viewedUser === 'object' && viewedUser !== null ? viewedUser.poster_id : undefined,
        viewedUser_username: typeof viewedUser === 'object' && viewedUser !== null ? viewedUser.username : (typeof viewedUser === 'string' ? viewedUser : undefined),
        viewedUser_raw_json: JSON.stringify(viewedUser)
      });

      let targetUserId = null;
      let targetUsername = null;

      if (isOwnProfile) {
        targetUserId = user?.id;
        targetUsername = user?.username;
      } else if (viewedUser) {
        if (typeof viewedUser === 'object' && viewedUser !== null) {
          targetUserId = viewedUser.poster_id || viewedUser.user_id || viewedUser.id || viewedUser.creator_id || null;
          targetUsername = viewedUser.username || viewedUser.handle || viewedUser.name || viewedUser.poster_username || viewedUser.user?.username || null;
        } else if (typeof viewedUser === 'string') {
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(viewedUser)) {
            targetUserId = viewedUser;
          } else {
            targetUsername = viewedUser;
          }
        }
      }

      // Check URL pathname (e.g., /profile/Ris or ?user=Ris)
      const urlParams = new URLSearchParams(window.location.search);
      const urlUser = urlParams.get('user') || urlParams.get('username') || window.location.pathname.split('/').pop();

      // Extract handle from any possible property structure
      const rawHandle = 
        (typeof viewedUser === 'string' ? viewedUser : '') ||
        (typeof viewedUser === 'object' && viewedUser !== null ? (viewedUser.username || viewedUser.handle || viewedUser.name || viewedUser.poster_username || viewedUser.user?.username) : '') ||
        targetUsername ||
        (urlUser && urlUser !== 'profile' && urlUser !== '' ? urlUser : '') ||
        'Ris';

      const cleanUsername = rawHandle.replace(/^@/, '').trim();
      const cleanHandle = cleanUsername;

      // Extract UUID from any possible property key
      let resolvedUserId = targetUserId || 
        (typeof viewedUser === 'object' && viewedUser !== null ? (viewedUser.id || viewedUser.user_id || viewedUser.poster_id || viewedUser.creator_id) : null) || 
        null;

      // 2. If no direct UUID was passed in, query profiles table flex-matching both 'Ris' and '@Ris'
      if (!resolvedUserId && cleanUsername) {
        try {
          const { data: profileMatch } = await supabase
            .from('profiles')
            .select('id, user_id, username, avatar_url, city')
            .or(`username.ilike.${cleanUsername},username.ilike.@${cleanUsername}`)
            .maybeSingle();

          if (profileMatch) {
            resolvedUserId = profileMatch.id || profileMatch.user_id;
          }
        } catch (err) {
          console.warn('[UserProfile.loadData] profiles lookup failed:', err);
        }
      }

      // 3. Fallback: Query outfits table directly for poster_id matching the handle
      if (!resolvedUserId && cleanUsername) {
        try {
          const { data: outfitMatch } = await supabase
            .from('outfits')
            .select('poster_id')
            .or(`profiles.username.ilike.${cleanUsername},profiles.username.ilike.@${cleanUsername}`)
            .limit(1)
            .maybeSingle();

          if (outfitMatch?.poster_id) {
            resolvedUserId = outfitMatch.poster_id;
          }
        } catch (err) {
          console.warn('[UserProfile.loadData] outfits lookup fallback failed:', err);
        }
      }

      targetUserId = resolvedUserId;

      console.log('[UserProfile.loadData] Step 2 Resolved:', {
        targetUserId,
        targetUsername,
        cleanUsername,
        fallbackIdUsed: typeof viewedUser === 'object' && viewedUser !== null ? (!viewedUser.id && !viewedUser.user_id) : true
      });

      let profileRow = null;
      if (targetUserId) {
        profileRow = await fetchUserProfile(targetUserId);
      } else if (cleanUsername) {
        profileRow = await fetchUserProfile(cleanUsername);
        if (profileRow?.id) {
          targetUserId = profileRow.id;
        }
      }

      console.log('[UserProfile.loadData] Step 3 fetchUserProfile returned:', JSON.stringify(profileRow, null, 2));
      console.log('[UserProfile.loadData] Step 4 Final targetUserId for outfits fetch:', targetUserId);

      if (!isMounted) return;
      setFetchedProfile(profileRow);

      if (targetUserId) {
        try {
          console.log('[UserProfile.loadData] Step 5 Calling fetchUserOutfits for targetUserId:', targetUserId, 'loggedInUserId:', user?.id);
          const outfits = await fetchUserOutfits(targetUserId, user?.id || null);
          console.log('[UserProfile.loadData] Step 6 fetchUserOutfits returned', outfits?.length, 'outfits:', JSON.stringify(outfits, null, 2));
          if (isMounted) {
            setUserOutfits(outfits || []);
          }
        } catch (err) {
          console.error('[UserProfile.loadData] ERROR in fetchUserOutfits:', err);
          if (isMounted) setUserOutfits([]);
        }
      } else {
        console.warn('[UserProfile.loadData] Warning: targetUserId is null/undefined! Setting userOutfits to []');
        if (isMounted) setUserOutfits([]);
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, [isOwnProfile, user?.id, viewedUser, activeTab, refreshTrigger]);

  // Derived profile display values
  const rawUsername = isOwnProfile
    ? (user?.username ? (user.username.startsWith('@') ? user.username : `@${user.username}`) : username)
    : (fetchedProfile?.username ? `@${fetchedProfile.username.replace(/^@/, '')}` : (typeof viewedUser === 'string' ? (viewedUser.startsWith('@') ? viewedUser : `@${viewedUser}`) : (typeof username === 'string' ? username : '@creator')));
  const displayUsername = typeof rawUsername === 'string' ? rawUsername : '@creator';

  const rawAvatar = isOwnProfile
    ? (user?.avatar || avatarUrl)
    : (fetchedProfile?.avatar_url || (typeof viewedUser === 'object' && viewedUser !== null && (viewedUser.avatar || viewedUser.user_avatar)) || avatarUrl);
  const displayAvatar = typeof rawAvatar === 'string' ? rawAvatar : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&h=240&fit=crop';

  const rawCity = isOwnProfile
    ? (user?.city || city)
    : (fetchedProfile?.city || (typeof viewedUser === 'object' && viewedUser !== null && (viewedUser.city || viewedUser.location)) || city || '');
  const displayCity = typeof rawCity === 'string' ? rawCity : '';

  const rawHeight = isOwnProfile
    ? (user?.height || height)
    : (fetchedProfile?.height || height || '');
  const displayHeight = typeof rawHeight === 'string' ? rawHeight : '';

  const rawGender = isOwnProfile
    ? (user?.gender || gender)
    : (fetchedProfile?.gender || gender || '');
  const displayGender = typeof rawGender === 'string' ? rawGender : '';

  const rawInstagram = isOwnProfile
    ? (user?.instagramLink || instagramLink)
    : (fetchedProfile?.instagram_link || instagramLink || '');
  const displayInstagram = typeof rawInstagram === 'string' ? rawInstagram : '';

  const rawBio = isOwnProfile
    ? (user?.bio || (fetchedProfile?.bio) || bio)
    : (fetchedProfile?.bio || (typeof viewedUser === 'object' && viewedUser !== null && viewedUser.bio) || (bio !== 'Minimalist enthusiast. Exploring the intersection of digital precision and sartorial elegance.' ? bio : '') || '');
  const displayBio = typeof rawBio === 'string' ? rawBio : '';

  const hasFetchedOutfits = userOutfits !== null;

  const computedFitsCount = hasFetchedOutfits
    ? userOutfits.length
    : fitsCount;

  const computedAvgScore = hasFetchedOutfits
    ? (userOutfits.length > 0
        ? (userOutfits.reduce((acc, curr) => acc + (curr.overall_score || 0), 0) / userOutfits.length)
        : 0)
    : (typeof avgScore === 'number' ? avgScore : parseFloat(avgScore) || 0);

  const currentFits = hasFetchedOutfits
    ? [...userOutfits].sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0)).slice(0, 5)
    : ((profileFits && profileFits['ALL TIME']) || MOCK_FITS_BY_TIME['ALL TIME']);

  const displayedRecentPosts = hasFetchedOutfits
    ? userOutfits
    : recentPosts;

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('[UserProfile.handleFileChange] Step 1: File selected:', { name: file.name, size: file.size, type: file.type });
    const previewUrl = URL.createObjectURL(file);
    setAvatarUrl(previewUrl);

    try {
      showToast("Uploading profile picture...");
      let publicUrl = previewUrl;

      if (user?.id) {
        console.log('[UserProfile.handleFileChange] Step 2: Calling uploadAvatarImage() for userId:', user.id);
        publicUrl = await uploadAvatarImage(file, user.id);
        console.log('[UserProfile.handleFileChange] Step 3: uploadAvatarImage returned publicUrl:', publicUrl);

        console.log('[UserProfile.handleFileChange] Step 4: Calling updateProfileDetails() in AuthContext...');
        await updateProfileDetails({ avatar: publicUrl });
        console.log('[UserProfile.handleFileChange] Step 5: updateProfileDetails completed successfully.');
      } else {
        console.warn('[UserProfile.handleFileChange] Warning: User not logged in, skipping Supabase upload.');
      }

      setAvatarUrl(publicUrl);
      if (onAvatarChange) onAvatarChange(publicUrl);
      showToast("Profile picture updated!");
    } catch (err) {
      console.error("[UserProfile.handleFileChange] ERROR caught during avatar update pipeline:", {
        message: err.message,
        error: err,
        stack: err.stack
      });
      showToast(err.message || "Failed to update profile picture.");
    }
  };

  const handleEditProfile = () => {
    setIsEditing(true);
  };

  const handleLinkClick = () => {
    const handle = instagramLink ? instagramLink.replace('@', '').replace('https://instagram.com/', '') : 'minimalist_enzo';
    showToast(`Navigating to instagram.com/${handle}...`);
    window.open(`https://instagram.com/${handle}`, '_blank', 'noopener,noreferrer');
  };

  const handleMessageClick = (e) => {
    if (e) e.stopPropagation();
    openChat(displayUsername, displayAvatar);
    if (onNavigateToChat) {
      onNavigateToChat('chat');
    }
  };

  const handleFitCardClick = (fit) => {
    const fullFitObj = {
      ...fit,
      username: displayUsername,
      avatar: displayAvatar
    };
    if (onFitClick) {
      onFitClick(fullFitObj);
    }
  };

  const handleFitProductClick = (e, fit) => {
    e.stopPropagation();
    // Format so it matches PostCard structure for App.jsx modal
    const postMock = {
      ...fit,
      username: displayUsername,
      avatar: displayAvatar,
      products: fit.products ? fit.products.map((p, i) => ({
        id: p.id || `prof-p-${fit.id}-${i}`,
        name: p.name,
        price: p.price,
        brand: p.brand || fit.brands,
        image: fit.image
      })) : []
    };
    if (onShopClick) {
      onShopClick(postMock);
    }
  };

  return (
    <div className="profile-screen">
      {/* Top back navigation bar */}
      {onBackClick && (
        <div className="profile-top-bar">
          <button className="profile-back-btn" onClick={onBackClick} aria-label="Go back">
            <ArrowLeft size={20} />
          </button>
          <span className="profile-top-title">{displayUsername}</span>
        </div>
      )}

      {/* Centered Profile Header */}
      <div className="profile-header-card">
        <div className="profile-avatar-wrapper">
          <div className="profile-avatar-container" style={{ position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#27272a' }}>
            {displayAvatar && !displayAvatar.includes('placeholder') ? (
              <img 
                src={displayAvatar} 
                alt="Profile Avatar" 
                className="profile-avatar-img"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.nextElementSibling) {
                    e.currentTarget.nextElementSibling.style.display = 'flex';
                  }
                }}
              />
            ) : null}
            <span 
              className="font-bold text-lime-400"
              style={{
                display: displayAvatar && !displayAvatar.includes('placeholder') ? 'none' : 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#a6fc29',
                fontSize: '36px',
                fontWeight: 'bold',
                width: '100%',
                height: '100%'
              }}
            >
              {(displayUsername || 'R').replace(/^@/, '').charAt(0).toUpperCase()}
            </span>
          </div>
          {isOwnProfile && (
            <button 
              className="profile-avatar-camera-btn" 
              onClick={handleAvatarClick}
              aria-label="Change profile picture"
            >
              <Camera size={14} />
            </button>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            style={{ display: 'none' }} 
          />
        </div>
        <h2 className="profile-handle">{displayUsername}</h2>
        {displayBio && <p className="profile-bio">{displayBio}</p>}

        {/* Dynamic Profile Attributes (City, Height, Gender) */}
        {(displayCity || displayHeight || displayGender) && (
          <div className="profile-tags-row">
            {displayCity && (
              <span className="profile-attribute-chip">
                <MapPin size={14} />
                <span>{displayCity}</span>
              </span>
            )}
            {displayHeight && (
              <span className="profile-attribute-chip">
                <TbRuler2 size={14} />
                <span>{displayHeight}</span>
              </span>
            )}
            {displayGender && (
              <span className="profile-attribute-chip">
                <User size={14} />
                <span>{displayGender}</span>
              </span>
            )}
          </div>
        )}

        {/* Followers count */}
        <div className="profile-followers-stat">
          <span className="profile-followers-count">{followersCount}</span>
          <span className="profile-followers-label">Followers</span>
        </div>

        {/* Symmetrical profile action buttons: [ Shopping ] [ Edit Profile / Follow ] [ Instagram ] */}
        <div className="profile-buttons-row">
          {/* Left Links Button */}
          <button 
            type="button"
            className="btn-link-shopping" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsShoppingModalOpen(true);
            }} 
            aria-label="Links"
            title="Links"
          >
            <ShoppingBasket size={18} color="#a6fc29" />
          </button>

          {/* Middle: Edit Profile or Follow/Message */}
          {isOwnProfile ? (
            <button className="btn-edit-profile" onClick={handleEditProfile}>
              <Edit2 size={16} className="edit-icon" />
              <span>Edit Profile</span>
            </button>
          ) : (
            <>
              <button 
                className={`btn-follow-profile ${isFollowing ? 'following' : ''}`} 
                onClick={handleFollowClick}
              >
                <span>{isFollowing ? 'Following' : 'Follow'}</span>
              </button>
              <button className="btn-message-profile" onClick={handleMessageClick}>
                Message
              </button>
            </>
          )}

          {/* Right: Instagram Button */}
          <button className="btn-link-instagram" onClick={handleLinkClick} aria-label="Instagram" title="Instagram">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="ig-grad" cx="30%" cy="107%" r="150%">
                  <stop offset="0%" stopColor="#fdf497"/>
                  <stop offset="5%" stopColor="#fdf497"/>
                  <stop offset="45%" stopColor="#fd5949"/>
                  <stop offset="60%" stopColor="#d6249f"/>
                  <stop offset="90%" stopColor="#285AEB"/>
                </radialGradient>
              </defs>
              <rect x="2" y="2" width="20" height="20" rx="6" ry="6" fill="url(#ig-grad)"/>
              <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.8" fill="none"/>
              <circle cx="17.5" cy="6.5" r="1.2" fill="white"/>
            </svg>
          </button>
        </div>
      </div>

      {/* My Top 5 Fits Section */}
      <div className="top-fits-section">
        <div className="section-header-row">
          <h3 className="section-title">My Top 5 Fits</h3>
          <span className="profile-time-label">ALL TIME</span>
        </div>

        {/* Horizontal Carousel */}
        {currentFits.length === 0 ? (
          <div
            className="top-fits-empty"
            style={{
              padding: '32px 20px',
              textAlign: 'center',
              background: 'var(--glass-bg)',
              border: '1px dashed var(--border-color)',
              borderRadius: '16px',
              margin: '10px 0',
            }}
          >
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>No fits posted yet</h4>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Scan and publish your outfit to see your top ranked fits here!
            </p>
          </div>
        ) : (
          <div className="fits-carousel">
            {currentFits.map((fit) => (
              <div 
                key={fit.id} 
                className="fit-carousel-card"
                onClick={() => handleFitCardClick(fit)}
                style={{ cursor: 'pointer' }}
              >
                {/* Score badge top-left */}
                <div className="fit-card-score-badge">
                  <span>{fit.score}</span>
                  <FaStar size={11} style={{ color: '#facc15' }} className="text-yellow-400 star-icon" />
                </div>

                {/* Three-dot options menu */}
                {isOwnProfile && (
                  <button 
                    className="post-more-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveFitMenuId(activeFitMenuId === fit.id ? null : fit.id);
                    }}
                    aria-label="Fit options"
                  >
                    <MoreVertical size={14} />
                  </button>
                )}

                {activeFitMenuId === fit.id && (
                  <div className="post-menu-dropdown" onClick={(e) => e.stopPropagation()}>
                    <button 
                      className="post-menu-item"
                      onClick={() => {
                        setActiveFitMenuId(null);
                        if (onEditFit) onEditFit(fit);
                      }}
                    >
                      <span>Edit Caption/Tags</span>
                    </button>
                    <button 
                      className="post-menu-item delete"
                      onClick={() => {
                        setActiveFitMenuId(null);
                        if (onDeleteFit) onDeleteFit(fit);
                      }}
                    >
                      <span>Delete Post</span>
                    </button>
                  </div>
                )}

                {/* Fit Image */}
                <img src={fit.image} alt={fit.title} className="fit-card-image" />

                {/* Bottom Card details */}
                <div className="fit-card-details">
                  <div className="fit-card-text">
                    <span className="fit-card-title">{fit.title}</span>
                    <span className="fit-card-brands">{fit.brands}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Style Stats Card */}
      <div className="style-stats-container">
        <div className="style-stats-card">
          <div className="stat-col">
            <span className="stat-number">{computedFitsCount}</span>
            <span className="stat-label">FITS POSTED</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-col">
            <span className="stat-number">{typeof computedAvgScore === 'number' ? computedAvgScore.toFixed(1) : computedAvgScore}</span>
            <span className="stat-label">AVG SCORE</span>
          </div>
        </div>
      </div>

      {/* Recent Posts Section */}
      <div className="recent-posts-section">
        <div className="recent-posts-header">
          <h3 className="section-title">Recent Posts</h3>
          <span className="recent-posts-week-label">{weekLabel}</span>
        </div>

        {displayedRecentPosts.length === 0 ? (
          <div
            className="recent-posts-empty"
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              background: 'var(--glass-bg)',
              border: '1px dashed var(--border-color)',
              borderRadius: '16px',
              margin: '8px 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justify: 'center',
              gap: '6px',
            }}
          >
            <span className="recent-posts-empty-icon" style={{ fontSize: '1.6rem' }}>👕</span>
            <p className="recent-posts-empty-text" style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              No fits posted yet — get rating!
            </p>
          </div>
        ) : (
          <div className="recent-posts-grid">
            {displayedRecentPosts.map((post) => (
              <div
                key={post.id}
                className="recent-post-card"
                onClick={() => handleFitCardClick(post)}
                style={{ cursor: 'pointer' }}
              >
                {/* AI Score badge */}
                <div className="fit-card-score-badge">
                  <span>
                    {typeof post.aiScore === 'string'
                      ? post.aiScore.replace('/10', '')
                      : (post.aiScore ?? post.score ?? 'N/A')}
                  </span>
                  <FaStar size={11} style={{ color: '#facc15' }} className="text-yellow-400 star-icon" />
                </div>

                {/* Three-dot menu */}
                {isOwnProfile && (
                  <button
                    className="post-more-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveRecentMenuId(activeRecentMenuId === post.id ? null : post.id);
                    }}
                    aria-label="Post options"
                  >
                    <MoreVertical size={14} />
                  </button>
                )}

                {activeRecentMenuId === post.id && (
                  <div className="post-menu-dropdown" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="post-menu-item"
                      onClick={() => {
                        setActiveRecentMenuId(null);
                        if (onEditFit) onEditFit(post);
                      }}
                    >
                      <span>Edit Caption/Tags</span>
                    </button>
                    <button
                      className="post-menu-item delete"
                      onClick={() => {
                        setActiveRecentMenuId(null);
                        if (onDeleteFit) onDeleteFit(post);
                      }}
                    >
                      <span>Delete Post</span>
                    </button>
                  </div>
                )}

                {/* Thumbnail */}
                <img src={post.image} alt={post.caption || 'fit'} className="recent-post-img" />

                {/* Caption */}
                {post.caption && (
                  <div className="recent-post-caption-row">
                    <p className="recent-post-caption">{post.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {isEditing && (
        <EditProfileModal
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
          currentData={{
            avatar: avatarUrl || user?.avatar || avatar,
            bio: user?.bio || bio,
            city: user?.city || city,
            height: user?.height || height,
            gender: user?.gender || gender,
            instagramLink: user?.instagramLink || instagramLink
          }}
          onSave={(updatedFields) => {
            setAvatarUrl(updatedFields.avatar);
            if (onAvatarChange) onAvatarChange(updatedFields.avatar);
            updateProfileDetails(updatedFields);
            showToast("Profile updated successfully!");
            setIsEditing(false);
          }}
        />
      )}

      {/* Profile Shopping & Wardrobe Links Modal */}
      <ProfileShoppingModal
        isOpen={isShoppingModalOpen}
        onClose={() => setIsShoppingModalOpen(false)}
        isOwnProfile={isOwnProfile}
        userId={isOwnProfile ? user?.id : fetchedProfile?.id}
        username={displayUsername}
        userOutfits={userOutfits || []}
        showToast={showToast}
      />
    </div>
  );
}

function EditProfileModal({ isOpen, onClose, currentData, onSave }) {
  const [avatar, setAvatar] = useState(currentData.avatar || '');
  const [bio, setBio] = useState(currentData.bio || '');
  const [city, setCity] = useState(currentData.city || '');
  const [height, setHeight] = useState(currentData.height || '');
  const [gender, setGender] = useState(currentData.gender || '');
  const [instagramLink, setInstagramLink] = useState(currentData.instagramLink || '');

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatar(url);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      avatar,
      bio: bio.trim(),
      city: city.trim(),
      height: height.trim(),
      gender: gender,
      instagramLink: instagramLink.trim()
    });
  };

  const citiesList = [
    'Kolkata', 'Mumbai', 'Delhi NCR', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Ahmedabad',
    'Jaipur', 'Chandigarh', 'Kochi', 'Goa', 'Tokyo', 'Seoul', 'London', 'New York', 'Seattle', 'Berlin', 'Paris'
  ];

  return (
    <div className="stl-overlay" onClick={onClose}>
      <div className="edit-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="stl-drag-handle" />
        <button className="stl-close-btn" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        <h2 className="stl-title">Edit Profile</h2>

        <form onSubmit={handleSubmit} className="edit-form-scrollable">
          {/* Avatar Change */}
          <div className="edit-profile-avatar-row">
            <div className="pfp-avatar-container" onClick={() => fileInputRef.current?.click()}>
              <img src={avatar} alt="Profile Avatar" className="pfp-avatar-img" />
              <div className="pfp-camera-overlay">
                <Camera size={18} />
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="pfp-upload-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              Change Photo
            </button>
          </div>

          {/* Bio Field */}
          <div className="stl-form-row">
            <span className="edit-section-title">Bio</span>
            <textarea
              className="upload-caption-textarea"
              placeholder="Tell the community about your style..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
            />
          </div>

          {/* City Field */}
          <div className="stl-form-row">
            <span className="edit-section-title">City</span>
            <select
              className="stl-input"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              <option value="">Select your city...</option>
              {citiesList.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Height Field */}
          <div className="stl-form-row">
            <span className="edit-section-title">Height</span>
            <input
              type="text"
              className="stl-input"
              placeholder="e.g. 178 cm / 5'10&quot;"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
            />
          </div>

          {/* Gender Field */}
          <div className="stl-form-row">
            <span className="edit-section-title">Gender</span>
            <select
              className="stl-input"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="">Select gender...</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Non-Binary">Non-Binary</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>

          {/* Instagram Handle */}
          <div className="stl-form-row">
            <span className="edit-section-title">Instagram Handle</span>
            <input
              type="text"
              className="stl-input"
              placeholder="e.g. @minimalist_enzo"
              value={instagramLink}
              onChange={(e) => setInstagramLink(e.target.value)}
            />
          </div>

          {/* Form Action Buttons */}
          <div className="stl-form-buttons" style={{ marginTop: '16px' }}>
            <button type="button" className="stl-form-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="stl-form-submit">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
