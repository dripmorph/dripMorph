import React, { useState, useEffect, lazy, Suspense } from 'react';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import DesktopSidebar from './components/DesktopSidebar';
import DesktopRightSidebar from './components/DesktopRightSidebar';
import { X, Star, Sun, Moon, MapPin } from 'lucide-react';
import { useChat } from './context/ChatContext';
import { useAuth, isUserFullyOnboarded } from './context/AuthContext';
import { useNotifications } from './context/NotificationContext';
import DripMorphLogo from './components/DripMorphLogo';
import techwearImg from './assets/techwear_look.png';
import cyberpunkImg from './assets/cyberpunk_look.png';
import minimalistImg from './assets/minimalist_look.png';
import { MOCK_POSTS } from './data/mockPosts';
import { fetchFeedOutfits, deleteOutfit } from './lib/outfitService';

// Code-split major screens and modals via React.lazy()
const Feed = lazy(() => import('./components/Feed'));
const Leaderboard = lazy(() => import('./components/Leaderboard'));
const UserProfile = lazy(() => import('./components/UserProfile'));
const ShopTheLookDrawer = lazy(() => import('./components/ShopTheLookDrawer'));
const FitDetailModal = lazy(() => import('./components/FitDetailModal'));
const PostUpload = lazy(() => import('./components/PostUpload'));
const SettingsModal = lazy(() => import('./components/SettingsModal'));
const CommentsModal = lazy(() => import('./components/CommentsModal'));
const ShareModal = lazy(() => import('./components/ShareModal'));
const NotificationsScreen = lazy(() => import('./components/NotificationsScreen'));
const ChatList = lazy(() => import('./components/ChatList'));
const ChatView = lazy(() => import('./components/ChatView'));
const AuthFlow = lazy(() => import('./components/auth/AuthFlow'));
const CitySelectionScreen = lazy(() => import('./components/auth/CitySelectionScreen'));

const ScreenFallback = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '280px', width: '100%', padding: '40px' }}>
    <div style={{ width: '100px', height: '4px', background: 'rgba(166, 252, 41, 0.15)', borderRadius: '2px', overflow: 'hidden', position: 'relative' }}>
      <div style={{ width: '50%', height: '100%', background: '#A6FC29', position: 'absolute', animation: 'pulse 1s infinite alternate' }} />
    </div>
  </div>
);

// Database of profiles for other creators
const MOCK_USER_PROFILES = {
  '@streetstyle_icon': {
    username: '@streetstyle_icon',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&h=240&fit=crop',
    bio: 'Utilitarian designer. Techwear enthusiast. Tokyo street culture.',
    fitsCount: 78,
    avgScore: 8.7,
    profileFits: {
      'ALL TIME': [
        { id: 301, title: 'Tactical Bomber', brands: 'Nike ACG / Arc', score: '8.7', image: techwearImg, products: [{ name: 'Harness Bomber', price: '$189' }] }
      ]
    },
    recentPosts: [
      { id: 1, username: '@streetstyle_icon', aiScore: '8.7/10', image: techwearImg, caption: 'Tokyo nights.', postedAt: new Date().toISOString(), products: [] }
    ]
  },
  '@neon_wanderer': {
    username: '@neon_wanderer',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&h=240&fit=crop',
    bio: 'Cyberpunk explorer. Lights, camera, reflection. Seoul cyberpunk.',
    fitsCount: 104,
    avgScore: 9.2,
    profileFits: {
      'ALL TIME': [
        { id: 401, title: 'Reflective Windbreaker', brands: 'Off-White', score: '9.2', image: cyberpunkImg, products: [{ name: 'Neon Jacket', price: '$210' }] }
      ]
    },
    recentPosts: [
      { id: 2, username: '@neon_wanderer', aiScore: '9.2/10', image: cyberpunkImg, caption: 'Seoul cyber.', postedAt: new Date().toISOString(), products: [] }
    ]
  },
  '@brutal_aesthetic': {
    username: '@brutal_aesthetic',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=240&h=240&fit=crop',
    bio: 'Berlin architect. Monochromatic silhouettes only.',
    fitsCount: 52,
    avgScore: 8.5,
    profileFits: {
      'ALL TIME': [
        { id: 501, title: 'Brutalist Long Coat', brands: 'Jil Sander', score: '8.5', image: minimalistImg, products: [{ name: 'Wool Coat', price: '$340' }] }
      ]
    },
    recentPosts: [
      { id: 3, username: '@brutal_aesthetic', aiScore: '8.5/10', image: minimalistImg, caption: 'Berlin cold.', postedAt: new Date().toISOString(), products: [] }
    ]
  },
  '@cyber_ninja': {
    username: '@cyber_ninja',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=240&h=240&fit=crop',
    bio: 'Shadow stealth streetwear. Acronym / Yohji Yamamoto.',
    fitsCount: 156,
    avgScore: 9.9,
    profileFits: {
      'ALL TIME': [
        { id: 601, title: 'Shadow Coat v3', brands: 'Acronym', score: '9.9', image: techwearImg, products: [{ name: 'Shadow Coat', price: '$499' }] }
      ]
    },
    recentPosts: []
  },
  '@tokyo_tide': {
    username: '@tokyo_tide',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&h=240&fit=crop',
    bio: 'Harajuku streetwear. Colors, oversized cuts, futuristic layers.',
    fitsCount: 92,
    avgScore: 9.8,
    profileFits: {
      'ALL TIME': [
        { id: 701, title: 'Harajuku Overcoat', brands: 'Y-3', score: '9.8', image: cyberpunkImg, products: [{ name: 'Harajuku Overcoat', price: '$320' }] }
      ]
    },
    recentPosts: []
  },
  '@berlin_minimalist': {
    username: '@berlin_minimalist',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&h=240&fit=crop',
    bio: 'Industrial aesthetic. Structured techwear and brutalist tailoring.',
    fitsCount: 65,
    avgScore: 9.6,
    profileFits: {
      'ALL TIME': [
        { id: 801, title: 'Structured Blouson', brands: 'Rick Owens', score: '9.6', image: minimalistImg, products: [{ name: 'Structured Jacket', price: '$280' }] }
      ]
    },
    recentPosts: []
  }
};

// ── Week utility ───────────────────────────────────────────
function getWeekBounds(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun … 6=Sat
  const diffToMon = (day === 0 ? -6 : 1 - day);
  const monday = new Date(d);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(d.getDate() + diffToMon);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

function isThisWeek(isoString) {
  if (!isoString) return false;
  const { monday, sunday } = getWeekBounds();
  const d = new Date(isoString);
  return d >= monday && d <= sunday;
}

function weekRangeLabel() {
  const { monday, sunday } = getWeekBounds();
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}
// ────────────────────────────────────────────────────────────

export default function App() {
  const { user } = useAuth();
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const [activeTab, setActiveTab] = useState('feed');
  const [posts, setPosts] = useState([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(() => Date.now());
  const [lastDeletedOutfitId, setLastDeletedOutfitId] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadFeed() {
      setIsLoadingFeed(true);
      try {
        const fetchedPosts = await fetchFeedOutfits(user?.id);
        if (isMounted) {
          setPosts(fetchedPosts || []);
        }
      } catch (err) {
        console.error('[App] Failed to fetch feed from Supabase:', err);
        if (isMounted) {
          setPosts([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingFeed(false);
        }
      }
    }
    loadFeed();
    return () => { isMounted = false; };
  }, [user?.id, refreshTrigger]);

  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedPostForShop, setSelectedPostForShop] = useState(null);
  const [isShopModalOpen, setIsShopModalOpen] = useState(false);
  const [selectedFitForDetail, setSelectedFitForDetail] = useState(null);

  const handleOpenShopModal = (post) => {
    setSelectedPost(post);
    setSelectedPostForShop(post);
    setIsShopModalOpen(true);
  };

  const handleCloseShopModal = () => {
    setSelectedPost(null);
    setSelectedPostForShop(null);
    setIsShopModalOpen(false);
  };

  // Viewed creator profile states
  const [viewedProfileUser, setViewedProfileUser] = useState(null);
  const [profileBackStack, setProfileBackStack] = useState([]);
  const [enzoAvatar, setEnzoAvatar] = useState("https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&h=240&fit=crop");
  const [toast, setToast] = useState('');
  const { hasNotifications } = useNotifications();

  // Hamburger, Settings and Notifications states
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Comments states
  const [selectedPostForComments, setSelectedPostForComments] = useState(null);
  const [postComments, setPostComments] = useState({
    1: [
      { id: 1, username: 'tech_ninja', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop', text: 'Where did you get that tactical harness coat? Insane look!' },
      { id: 2, username: 'cyber_vibe', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop', text: '10/10 silhouette. The cargo straps are perfect.' },
      { id: 3, username: 'minimalist_enzo', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop', text: 'Love the high-collar turtleneck layer underneath.' }
    ],
    2: [
      { id: 1, username: 'street_specter', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&h=100&fit=crop', text: 'Reflective windbreaker goes so hard under neon lights.' },
      { id: 2, username: 'seoul_runner', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop', text: 'Platform boots link please!' }
    ],
    3: [
      { id: 1, username: 'darkwear_cult', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop', text: 'Berlin vibes all the way. The raw indigo denim fits perfectly.' }
    ],
    101: [
      { id: 1, username: 'acronym_fan', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&h=100&fit=crop', text: 'Great coat styling Enzo. Fits perfectly in Seattle rain.' }
    ],
    102: [
      { id: 1, username: 'minimal_layer', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop', text: 'Nike ACG vest is a grail item.' }
    ]
  });

  // Lifted Profile Fits state
  const [profileFits, setProfileFits] = useState({
    'ALL TIME': [
      {
        id: 1,
        title: 'Cyberpunk Tailoring',
        brands: 'Acronym / Yohji',
        score: '8.9',
        image: cyberpunkImg,
        postedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        products: [
          { id: 'p1-1', name: 'Cyberpunk Tailored Coat', price: '$299.00', brand: 'Yohji Yamamoto', image: cyberpunkImg },
          { id: 'p1-2', name: 'Pleated Tactical Skirt/Pants', price: '$180.00', brand: 'Acronym', image: cyberpunkImg }
        ]
      },
      {
        id: 2,
        title: 'Brutalist Winter',
        brands: 'Jil Sander / Rick',
        score: '8.7',
        image: minimalistImg,
        postedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        products: [
          { id: 'p2-1', name: 'Brutalist Long Coat', price: '$420.00', brand: 'Jil Sander', image: minimalistImg },
          { id: 'p2-2', name: 'Structured Boots', price: '$350.00', brand: 'Rick Owens', image: minimalistImg }
        ]
      },
      {
        id: 3,
        title: 'Tactical Techwear',
        brands: 'Nike ACG / Arc',
        score: '8.5',
        image: techwearImg,
        postedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        products: [
          { id: 'p3-1', name: 'Modular Tactical Vest', price: '$220.00', brand: 'Nike ACG', image: techwearImg }
        ]
      },
      {
        id: 4,
        title: 'Oversized Streetwear',
        brands: 'Y-3 / Essentials',
        score: '8.4',
        image: minimalistImg,
        postedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        products: [
          { id: 'p4-1', name: 'Oversized Hoodie', price: '$130.00', brand: 'Y-3', image: minimalistImg }
        ]
      },
      {
        id: 5,
        title: 'Neon Wanderer',
        brands: 'Cav Empt / Off',
        score: '8.1',
        image: cyberpunkImg,
        postedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        products: [
          { id: 'p5-1', name: 'Reflective Bomber Jacket', price: '$240.00', brand: 'Cav Empt', image: cyberpunkImg }
        ]
      }
    ],
    'THIS WEEK': [
      {
        id: 2,
        title: 'Brutalist Winter',
        brands: 'Jil Sander / Rick',
        score: '8.7',
        image: minimalistImg,
        postedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        products: [
          { id: 'p2-1', name: 'Brutalist Long Coat', price: '$420.00', brand: 'Jil Sander', image: minimalistImg },
          { id: 'p2-2', name: 'Structured Boots', price: '$350.00', brand: 'Rick Owens', image: minimalistImg }
        ]
      },
      {
        id: 3,
        title: 'Tactical Techwear',
        brands: 'Nike ACG / Arc',
        score: '8.5',
        image: techwearImg,
        postedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        products: [
          { id: 'p3-1', name: 'Modular Tactical Vest', price: '$220.00', brand: 'Nike ACG', image: techwearImg }
        ]
      },
      {
        id: 4,
        title: 'Oversized Streetwear',
        brands: 'Y-3 / Essentials',
        score: '8.4',
        image: minimalistImg,
        postedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        products: [
          { id: 'p4-1', name: 'Oversized Hoodie', price: '$130.00', brand: 'Y-3', image: minimalistImg }
        ]
      },
      {
        id: 5,
        title: 'Neon Wanderer',
        brands: 'Cav Empt / Off',
        score: '8.1',
        image: cyberpunkImg,
        postedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        products: [
          { id: 'p5-1', name: 'Reflective Bomber Jacket', price: '$240.00', brand: 'Cav Empt', image: cyberpunkImg }
        ]
      },
      {
        id: 1,
        title: 'Cyberpunk Tailoring',
        brands: 'Acronym / Yohji',
        score: '7.9',
        image: techwearImg,
        postedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        products: [
          { id: 'p1-1', name: 'Cyberpunk Tailored Coat', price: '$299.00', brand: 'Yohji Yamamoto', image: techwearImg }
        ]
      }
    ]
  });

  // Profile Statistics state
  const [fitsCount, setFitsCount] = useState(42);
  const [totalScoreSum, setTotalScoreSum] = useState(42 * 8.4);
  const avgScore = fitsCount > 0 ? totalScoreSum / fitsCount : 0;

  // Derived: current user's posts from THIS week (for Recent Posts section)
  const recentPosts = posts
    .filter(p => p.username === '@minimalist_enzo' && isThisWeek(p.postedAt))
    .sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));

  const currentWeekLabel = weekRangeLabel();

  // Edit/Delete/Share Management state
  const [editingPost, setEditingPost] = useState(null);
  const [deletingPost, setDeletingPost] = useState(null);
  const [sharingPost, setSharingPost] = useState(null);

  // Auto-hide toast after 2.5 seconds
  const [debugError, setDebugError] = useState(null);

  // Global unhandled rejection listener for mobile error capture
  useEffect(() => {
    const handleUnhandledRejection = (e) => {
      console.error('[UnhandledRejection]:', e.reason);
      const msg = e.reason?.message || (typeof e.reason === 'string' ? e.reason : JSON.stringify(e.reason));
      if (msg && !msg.includes('ResizeObserver')) {
        setDebugError({ message: msg, timestamp: new Date().toLocaleTimeString() });
      }
    };
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  }, []);

  // Chat context hook
  const { activeChatId, closeChat } = useChat();

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(''), 2500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message) => {
    setToast(message);
    if (typeof message === 'string' && (message.toLowerCase().includes('fail') || message.toLowerCase().includes('error') || message.toLowerCase().includes('could not'))) {
      setDebugError({ message, timestamp: new Date().toLocaleTimeString() });
    }
  };

  const handleShare = (post) => {
    setSharingPost(post);
  };

  const handleMenuClick = () => {
    setIsMenuOpen(true);
  };

  const handleBellClick = () => {
    setShowNotifications(true);
  };

  const handleAddComment = (postId, text, newComment) => {
    if (newComment) {
      setPostComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newComment]
      }));
    }

    setPosts(prevPosts => prevPosts.map(p => {
      if (p.id === postId) {
        const count = (p.comments_count ?? p.comments ?? 0) + 1;
        return {
          ...p,
          comments: count,
          comments_count: count,
          comment_count: count
        };
      }
      return p;
    }));
  };

  const handleDeleteComment = (postId, commentId) => {
    setPostComments(prev => ({
      ...prev,
      [postId]: (prev[postId] || []).filter(c => c.id !== commentId)
    }));

    setPosts(prevPosts => prevPosts.map(p => {
      if (p.id === postId) {
        const count = Math.max(0, (p.comments_count ?? p.comments ?? 1) - 1);
        return {
          ...p,
          comments: count,
          comments_count: count,
          comment_count: count
        };
      }
      return p;
    }));
  };

  const isUserSelf = (target) => {
    if (!target) return true;

    if (!user) {
      return target === '@minimalist_enzo' || target === 'minimalist_enzo';
    }

    if (typeof target === 'object' && target !== null) {
      if (target.user_id && target.user_id === user.id) return true;
      if (target.poster_id && target.poster_id === user.id) return true;
      if (target.id && target.id === user.id) return true;
      target = target.username || target.name || '';
    }

    if (typeof target === 'string') {
      if (target === user.id) return true;

      const cleanTarget = target.trim().replace(/^@/, '').toLowerCase();
      const cleanUserUsername = user.username ? user.username.trim().replace(/^@/, '').toLowerCase() : '';
      const cleanUserEmail = user.email ? user.email.split('@')[0].trim().toLowerCase() : '';

      if (cleanTarget === 'minimalist_enzo') return true;
      if (cleanUserUsername && cleanTarget === cleanUserUsername) return true;
      if (cleanUserEmail && cleanTarget === cleanUserEmail) return true;
    }

    return false;
  };

  const getProfileForUser = (uname) => {
    const isSelf = isUserSelf(uname);
    const currentUsername = user?.username 
      ? user.username.replace(/^@/, '')
      : 'minimalist_enzo';

    if (isSelf) {
      return {
        username: currentUsername,
        avatar: user?.avatar || enzoAvatar,
        city: user?.city || '',
        height: user?.height || '',
        gender: user?.gender || '',
        instagramLink: user?.instagramLink || '',
        bio: 'Minimalist enthusiast. Exploring the intersection of digital precision and sartorial elegance.',
        fitsCount: fitsCount,
        avgScore: avgScore,
        profileFits: profileFits,
        recentPosts: recentPosts,
        isOwnProfile: true
      };
    }

    let targetUsername = typeof uname === 'string' ? uname : (uname?.username || '@creator');
    if (typeof targetUsername !== 'string') {
      targetUsername = '@creator';
    } else if (!targetUsername.startsWith('@')) {
      targetUsername = `@${targetUsername}`;
    }

    const baseProfile = typeof uname === 'object' && uname !== null ? {
      username: targetUsername,
      avatar: (typeof uname.avatar === 'string' ? uname.avatar : null) || (typeof uname.user_avatar === 'string' ? uname.user_avatar : null) || (typeof uname.avatar_url === 'string' ? uname.avatar_url : null) || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&h=240&fit=crop',
      city: uname.city || uname.location || '',
      height: uname.height || '',
      gender: uname.gender || '',
      instagramLink: uname.instagramLink || uname.instagram_link || '',
      bio: uname.bio || '',
      fitsCount: 0,
      avgScore: 0,
      profileFits: { 'ALL TIME': [] },
      recentPosts: []
    } : ((typeof MOCK_USER_PROFILES !== 'undefined' && MOCK_USER_PROFILES[targetUsername]) || (typeof MOCK_USER_PROFILES !== 'undefined' && MOCK_USER_PROFILES[targetUsername?.toLowerCase()]) || {
      username: targetUsername,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&h=240&fit=crop',
      city: '',
      height: '',
      gender: '',
      instagramLink: '',
      bio: '',
      fitsCount: 0,
      avgScore: 0,
      profileFits: { 'ALL TIME': [] },
      recentPosts: []
    });

    return {
      ...baseProfile,
      isOwnProfile: false
    };
  };

  const handleNavigateToProfile = (uname) => {
    if (!uname) return;

    const selectedProfileData = typeof uname === 'object' && uname !== null ? {
      ...uname,
      id: uname.id || uname.user_id || uname.poster_id || uname.creator_id,
      user_id: uname.id || uname.user_id || uname.poster_id || uname.creator_id,
      username: uname.username || uname.handle || uname.name || uname.poster_username || 'Ris',
      avatar_url: uname.avatar_url || uname.image_url || uname.avatar,
      city: uname.city || uname.location
    } : uname;

    setProfileBackStack(prev => [...prev, { tab: activeTab, user: viewedProfileUser }]);
    setViewedProfileUser(selectedProfileData);
    setActiveTab('profile');
  };

  const handleBackNavigation = () => {
    if (profileBackStack.length > 0) {
      const previous = profileBackStack[profileBackStack.length - 1];
      setProfileBackStack(prev => prev.slice(0, -1));
      setViewedProfileUser(previous.user);
      setActiveTab(previous.tab);
    } else {
      setViewedProfileUser(null);
      setActiveTab('feed');
    }
  };

  const handleTabChange = (tab) => {
    setViewedProfileUser(null);
    setProfileBackStack([]);
    setActiveTab(tab);
  };

  const handleAvatarChange = (newAvatarUrl) => {
    setEnzoAvatar(newAvatarUrl);
    setRefreshTrigger(Date.now());
  };

  const handlePostCreated = (newPostData) => {
    const rawAuthor = newPostData.username || user?.username || user?.email?.split('@')[0] || 'minimalist_enzo';
    const authorUsername = rawAuthor.replace(/^@/, '');
    const authorAvatar = newPostData.user_avatar || newPostData.avatar || user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop';
    const authorLocation = newPostData.location || user?.city || 'Kolkata';

    const newPost = {
      id: newPostData.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now()),
      user_id: newPostData.user_id || user?.id,
      username: authorUsername,
      user_avatar: authorAvatar,
      avatar: authorAvatar,
      location: authorLocation,
      aiScore: newPostData.aiScore || newPostData.score || 'N/A',
      image: newPostData.image || newPostData.image_url,
      image_url: newPostData.image || newPostData.image_url,
      likes: newPostData.likes || newPostData.likes_count || 0,
      comments: newPostData.comments || newPostData.comments_count || 0,
      caption: newPostData.caption || 'New streetwear fit check.',
      postedAt: newPostData.created_at || new Date().toISOString(),
      created_at: newPostData.created_at || new Date().toISOString(),
      products: Array.isArray(newPostData.products) ? newPostData.products : []
    };

    // Prepend to feed posts
    setPosts([newPost, ...posts]);

    // Parse the score value
    const parsedScore = parseFloat(newPostData.overall_score ?? newPostData.score ?? newPostData.aiScore) || 0;

    // Create a new profile fit
    const newFit = {
      id: newPost.id,
      title: newPost.caption,
      brands: Array.isArray(newPost.products) && newPost.products.length > 0 ? newPost.products.map(p => p.brand || p.name).join(' / ') : 'DripMorph Fit',
      score: parsedScore.toFixed(1),
      image: newPost.image,
      postedAt: newPost.postedAt,
      products: newPost.products
    };

    // Prepend to profile fits lists
    setProfileFits(prev => ({
      'ALL TIME': [newFit, ...prev['ALL TIME']],
      'THIS WEEK': [newFit, ...prev['THIS WEEK']]
    }));

    // Update stats
    setFitsCount(prev => prev + 1);
    setTotalScoreSum(prev => prev + parsedScore);
    setRefreshTrigger(Date.now());

    setActiveTab('feed');
  };

  const handleSaveEditedPost = (updatedPost) => {
    // 1. Update Feed posts state
    setPosts(prevPosts => prevPosts.map(p => {
      if (p.id === updatedPost.id) {
        return {
          ...p,
          caption: updatedPost.caption,
          products: updatedPost.products
        };
      }
      return p;
    }));

    // 2. Update Profile fits state
    setProfileFits(prevFits => {
      const updateList = (list) => list.map(f => {
        if (f.id === updatedPost.id) {
          return {
            ...f,
            title: updatedPost.caption,
            brands: updatedPost.products.map(p => p.brand || p.name).join(' / '),
            products: updatedPost.products
          };
        }
        return f;
      });
      return {
        'ALL TIME': updateList(prevFits['ALL TIME']),
        'THIS WEEK': updateList(prevFits['THIS WEEK'])
      };
    });

    setEditingPost(null);
    showToast("Changes saved!");
  };

  const handleConfirmDeletePost = async () => {
    if (!deletingPost) return;

    const targetId = deletingPost.id;
    const rawScore = deletingPost.aiScore || deletingPost.score || '8.4';
    const scoreVal = parseFloat(rawScore) || 8.4;

    // 1. Remove from Feed posts
    setPosts(prevPosts => prevPosts.filter(p => p.id !== targetId));

    // 2. Remove from Profile fits
    setProfileFits(prevFits => {
      const filterList = (list) => list.filter(f => f.id !== targetId);
      return {
        'ALL TIME': filterList(prevFits['ALL TIME']),
        'THIS WEEK': filterList(prevFits['THIS WEEK'])
      };
    });

    // 3. Update stats & trigger refresh
    setFitsCount(prev => Math.max(0, prev - 1));
    setTotalScoreSum(prev => Math.max(0, prev - scoreVal));
    setLastDeletedOutfitId(targetId);
    setRefreshTrigger(Date.now());

    setDeletingPost(null);

    try {
      await deleteOutfit(targetId);
      showToast("Post deleted successfully.");
    } catch (err) {
      console.error('[App] Failed to delete outfit from Supabase:', err);
      showToast(err.message || "Failed to delete post.");
    }
  };

  const [isAuthCompleted, setIsAuthCompleted] = useState(false);
  const [showCitySelectionModal, setShowCitySelectionModal] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsAuthCompleted(false);
    }
  }, [user]);

  const isAuthReady = Boolean(user && (isUserFullyOnboarded(user) || isAuthCompleted));

  if (!isAuthReady) {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <AuthFlow onAuthComplete={() => setIsAuthCompleted(true)} />
      </Suspense>
    );
  }

  if (showCitySelectionModal) {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <CitySelectionScreen
          onCitySelected={(city) => {
            setShowCitySelectionModal(false);
            showToast(`City updated to ${city}`);
          }}
        />
      </Suspense>
    );
  }

  return (
    <div className="app-root-wrapper">
      {/* Mobile Sticky Header (hidden on desktop screens >=1024px) */}
      <Header 
        onMenuClick={handleMenuClick} 
        onBellClick={handleBellClick} 
        hasNotifications={hasNotifications}
        onTabChange={handleTabChange}
      />

      {/* Main Responsive 3-Column Container */}
      <div className="desktop-layout-container">
        {/* Left Column (240px fixed width sidebar on desktop) */}
        <DesktopSidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          theme={theme}
          onToggleTheme={toggleTheme}
          onBellClick={handleBellClick}
          hasNotifications={hasNotifications}
          onChangeCity={() => setShowCitySelectionModal(true)}
          showToast={showToast}
          onOpenSettings={() => setShowSettingsModal(true)}
        />

        {/* Center Column (Max-width 680px main content area) */}
        <main className="desktop-center-content">
          <Suspense fallback={<ScreenFallback />}>
            <div style={{ display: activeTab === 'feed' ? 'flex' : 'none', flex: 1, flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
              <Feed
                posts={posts}
                isLoading={isLoadingFeed}
                onShopClick={handleOpenShopModal}
                onFitClick={(fit) => setSelectedFitForDetail(fit)}
                onShareClick={handleShare}
                showToast={showToast}
                onEditPost={(post) => setEditingPost(post)}
                onDeletePost={(post) => setDeletingPost(post)}
                onCommentClick={(post) => setSelectedPostForComments(post)}
                onUserClick={handleNavigateToProfile}
                onUploadClick={() => handleTabChange('post')}
              />
            </div>

            <div style={{ display: activeTab === 'ranks' ? 'flex' : 'none', flex: 1, flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
              <Leaderboard showToast={showToast} onUserClick={handleNavigateToProfile} onFitClick={(fit) => setSelectedFitForDetail(fit)} refreshTrigger={refreshTrigger} />
            </div>

            <div style={{ display: activeTab === 'post' ? 'flex' : 'none', flex: 1, flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
              <PostUpload 
                showToast={showToast} 
                onPostCreated={handlePostCreated}
              />
            </div>

            <div style={{ display: activeTab === 'profile' ? 'flex' : 'none', flex: 1, flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
              <UserProfile 
                showToast={showToast} 
                viewedUser={viewedProfileUser}
                isOwnProfile={isUserSelf(viewedProfileUser)}
                onShopClick={handleOpenShopModal} 
                onFitClick={(fit) => setSelectedFitForDetail(fit)}
                onEditFit={(fit) => setEditingPost(fit)}
                onDeleteFit={(fit) => setDeletingPost(fit)}
                onBackClick={profileBackStack.length > 0 ? handleBackNavigation : null}
                onAvatarChange={handleAvatarChange}
                onNavigateToChat={handleTabChange}
                activeTab={activeTab}
                refreshTrigger={refreshTrigger}
                lastDeletedOutfitId={lastDeletedOutfitId}
              />
            </div>

            <div style={{ display: activeTab === 'chat' ? 'flex' : 'none', flex: 1, flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
              <div className={`messages-container ${activeChatId ? 'has-active-chat' : ''}`}>
                <ChatList />
                <ChatView onBack={closeChat} onUserClick={handleNavigateToProfile} />
              </div>
            </div>
          </Suspense>
        </main>

        {/* Right Column (320px fixed width sidebar on desktop) */}
        <DesktopRightSidebar
          userCity={user?.city || 'Seattle'}
          onUserClick={handleNavigateToProfile}
          onFitClick={(fit) => setSelectedFitForDetail(fit)}
          refreshTrigger={refreshTrigger}
        />
      </div>

      {/* Floating Action Toast Banner */}
      {toast && (
        <div className="toast">
          {toast}
        </div>
      )}

      {/* On-Screen Mobile Debug Error Overlay */}
      {debugError && (
        <div className="debug-error-banner" style={{
          position: 'fixed',
          bottom: '80px',
          left: '16px',
          right: '16px',
          backgroundColor: '#1f1315',
          border: '1px solid #ff4d4d',
          borderRadius: '12px',
          padding: '12px 16px',
          zIndex: 99999,
          color: '#ff8080',
          fontSize: '13px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
          fontFamily: 'monospace',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
            <span>⚠️ Mobile Debug Error [{debugError.timestamp}]</span>
            <button 
              onClick={() => setDebugError(null)} 
              style={{ background: 'none', border: 'none', color: '#ff8080', cursor: 'pointer', fontSize: '14px', padding: '2px 6px' }}
            >
              ✕
            </button>
          </div>
          <div style={{ wordBreak: 'break-word', userSelect: 'text', maxHeight: '120px', overflowY: 'auto' }}>
            {debugError.message}
          </div>
        </div>
      )}

      <Suspense fallback={null}>
        {/* FULL FIT DETAIL MODAL */}
        {selectedFitForDetail && (
          <FitDetailModal 
            fit={selectedFitForDetail} 
            onClose={() => {
              setSelectedFitForDetail(null);
              setActiveTab('feed');
            }} 
            onShopClick={(fit) => {
              setSelectedFitForDetail(null);
              handleOpenShopModal(fit);
            }}
          />
        )}

        {/* SHOP THE LOOK Modal (Root React Portal) */}
        {(selectedPost || selectedPostForShop || isShopModalOpen) && (
          <ShopTheLookDrawer 
            post={selectedPost || selectedPostForShop} 
            onClose={handleCloseShopModal} 
            showToast={showToast}
          />
        )}

        {/* EDIT POST Modal */}
        {editingPost && (
          <EditPostModal
            post={editingPost}
            onClose={() => setEditingPost(null)}
            onSave={handleSaveEditedPost}
          />
        )}

        {/* DELETE CONFIRMATION Dialog */}
        {deletingPost && (
          <DeleteConfirmDialog
            onClose={() => setDeletingPost(null)}
            onConfirm={handleConfirmDeletePost}
          />
        )}

        {isMenuOpen && (
          <MenuDrawer
            isOpen={isMenuOpen}
            onClose={() => setIsMenuOpen(false)}
            onNavigateToNotifications={() => {
              setIsMenuOpen(false);
              setShowNotifications(true);
            }}
            hasNotifications={hasNotifications}
            showToast={showToast}
            theme={theme}
            onToggleTheme={toggleTheme}
            onChangeCity={() => setShowCitySelectionModal(true)}
            onOpenSettings={() => {
              setIsMenuOpen(false);
              setShowSettingsModal(true);
            }}
          />
        )}

        {showNotifications && (
          <NotificationsScreen
            isOpen={showNotifications}
            onClose={() => setShowNotifications(false)}
            onUserClick={handleNavigateToProfile}
            onNavigateToChat={(target) => {
              if (target && target !== 'chat') {
                openChat(target);
              }
              handleTabChange('chat');
            }}
            onFitClick={(fit) => setSelectedFitForDetail(fit)}
          />
        )}

        {showSettingsModal && (
          <SettingsModal
            isOpen={showSettingsModal}
            onClose={() => setShowSettingsModal(false)}
            showToast={showToast}
            onProfileUpdate={() => setRefreshTrigger(Date.now())}
          />
        )}

        {selectedPostForComments && (
          <CommentsModal
            post={selectedPostForComments}
            isOpen={!!selectedPostForComments}
            onClose={() => setSelectedPostForComments(null)}
            comments={postComments[selectedPostForComments.id] || []}
            onAddComment={handleAddComment}
            onDeleteComment={handleDeleteComment}
            onUserClick={handleNavigateToProfile}
            showToast={showToast}
          />
        )}

        {sharingPost && (
          <ShareModal
            post={sharingPost}
            isOpen={!!sharingPost}
            onClose={() => setSharingPost(null)}
            showToast={showToast}
          />
        )}
      </Suspense>

      {/* Mobile Bottom Navigation (hidden on desktop screens >=1024px) */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} hiddenOnMobile={!!activeChatId} />
    </div>
  );
}

// ================= Auxiliary Modal Components =================

function EditPostModal({ post, onClose, onSave }) {
  const [caption, setCaption] = useState(post.caption || post.title || '');
  const [enableTagging, setEnableTagging] = useState(
    Array.isArray(post.products) && post.products.length > 0
  );
  const [products, setProducts] = useState(
    post.products ? post.products.map(p => ({ ...p })) : []
  );

  const toggleTagging = () => {
    if (!enableTagging && products.length === 0) {
      setProducts([{
        id: `p-edit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: '',
        brand: '',
        price: '',
        image: post.image
      }]);
    }
    setEnableTagging(!enableTagging);
  };

  const handleProductChange = (id, field, value) => {
    setProducts(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  const handleRemoveProduct = (id) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const handleAddProduct = () => {
    const newProduct = {
      id: `p-edit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: '',
      brand: '',
      price: '',
      image: post.image
    };
    setProducts(prev => [...prev, newProduct]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validProducts = enableTagging 
      ? products.filter(p => p && p.name && p.name.trim() !== '')
      : [];
    onSave({
      ...post,
      caption,
      products: validProducts
    });
  };

  const scoreText = post.aiScore || (post.score ? `${post.score}/10` : '8.5/10');

  return (
    <div className="stl-overlay" onClick={onClose}>
      <div className="edit-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="stl-drag-handle" />
        
        <button className="stl-close-btn" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        <h2 className="stl-title">Edit Post</h2>

        {/* Locked Image & Score Preview */}
        <div className="edit-modal-locked-section">
          <img src={post.image} alt="Outfit Thumbnail" className="edit-modal-thumbnail" />
          <div className="edit-modal-locked-info">
            <span className="edit-modal-locked-label">AI RATING (LOCKED)</span>
            <div className="edit-modal-locked-value">
              <span>{scoreText}</span>
              <Star size={12} className="star-icon" />
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="edit-form-scrollable">
          {/* Caption field */}
          <div className="stl-form-row">
            <span className="edit-section-title">Caption / Title</span>
            <textarea
              className="upload-caption-textarea"
              placeholder="Caption text..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              required
            />
          </div>

          {/* Tagged Products Section (Optional) */}
          <div className="stl-form-row">
            <div className="tag-items-section-header" style={{ marginBottom: '10px' }}>
              <span className="edit-section-title" style={{ margin: 0 }}>Shop the Look Items</span>
              <button
                type="button"
                className={`tag-toggle-btn ${enableTagging ? 'active' : ''}`}
                onClick={toggleTagging}
              >
                {enableTagging ? "✕ Don't Tag Items" : '+ Tag Items'}
              </button>
            </div>

            {enableTagging && (
              <div className="tag-items-dropdown-container">
                <div className="edit-tagged-list">
                  {products.map((prod, idx) => (
                    <div key={prod.id} className="edit-tagged-item-card">
                      <span className="edit-modal-locked-label">ITEM #{idx + 1}</span>
                      
                      {products.length > 1 && (
                        <button 
                          type="button" 
                          className="btn-remove-tagged"
                          onClick={() => handleRemoveProduct(prod.id)}
                          aria-label="Remove item"
                        >
                          <X size={14} />
                        </button>
                      )}

                      <div className="edit-tagged-row-inputs">
                        <input
                          type="text"
                          className="stl-input"
                          placeholder="Item Name"
                          value={prod.name}
                          onChange={(e) => handleProductChange(prod.id, 'name', e.target.value)}
                        />
                        <div className="edit-tagged-input-group">
                          <input
                            type="text"
                            className="stl-input"
                            placeholder="Brand"
                            value={prod.brand}
                            onChange={(e) => handleProductChange(prod.id, 'brand', e.target.value)}
                          />
                          <input
                            type="text"
                            className="stl-input"
                            placeholder="Price"
                            value={prod.price}
                            onChange={(e) => handleProductChange(prod.id, 'price', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  type="button" 
                  className="btn-add-tagged-dashed"
                  onClick={handleAddProduct}
                >
                  <span>+ Tag Another Item</span>
                </button>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="stl-form-buttons" style={{ marginTop: '10px' }}>
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

function DeleteConfirmDialog({ onClose, onConfirm }) {
  return (
    <div className="delete-confirm-overlay" onClick={onClose}>
      <div className="delete-confirm-content" onClick={(e) => e.stopPropagation()}>
        <div className="delete-confirm-icon-wrapper">
          <X size={28} strokeWidth={2.5} />
        </div>
        
        <div className="delete-confirm-text-section">
          <h3 className="delete-confirm-title">Delete this post?</h3>
          <p className="delete-confirm-subtitle">This action cannot be undone. It will be removed from your feed and profile.</p>
        </div>

        <div className="delete-confirm-buttons">
          <button className="btn-confirm-delete" onClick={onConfirm}>
            Delete Post
          </button>
          <button className="btn-cancel-delete" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function MenuDrawer({ isOpen, onClose, onNavigateToNotifications, showToast, theme, onToggleTheme, onChangeCity, onOpenSettings, hasNotifications }) {
  const { user, logout } = useAuth();
  if (!isOpen) return null;
  return (
    <div className="menu-drawer-overlay" onClick={onClose}>
      <div className="menu-drawer-content" onClick={(e) => e.stopPropagation()}>
        <div className="menu-drawer-header">
          <div className="brand-logo-badge">
            <DripMorphLogo size={24} />
            <span className="sidebar-brand-title">DRIPMORPH</span>
          </div>
          <button className="menu-drawer-close-btn" onClick={onClose} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>
        <div className="menu-drawer-items">
          {user?.city && (
            <button
              className="menu-drawer-item"
              onClick={() => {
                onClose();
                onChangeCity();
              }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={18} style={{ color: 'var(--accent-solid)' }} />
                <span>City: <strong>{user.city}</strong></span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-solid)', fontWeight: '700' }}>Change</span>
            </button>
          )}
          <button className="menu-drawer-item" onClick={() => { onClose(); if (onOpenSettings) onOpenSettings(); }}>
            Settings
          </button>
          <button className="menu-drawer-item" onClick={() => { onClose(); onNavigateToNotifications(); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span>Notifications</span>
            {hasNotifications && (
              <span style={{
                width: '8px',
                height: '8px',
                backgroundColor: 'var(--accent-solid)',
                borderRadius: '50%',
                display: 'inline-block'
              }} />
            )}
          </button>
          <button className="menu-drawer-item" onClick={() => { onClose(); showToast("Report submitted successfully."); }}>
            Report a Problem
          </button>
          <div className="menu-drawer-divider" />
          <button 
            className="menu-drawer-item" 
            onClick={onToggleTheme} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              width: '100%' 
            }}
          >
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className="menu-drawer-divider" />
          <button
            className="menu-drawer-item logout"
            onClick={() => {
              onClose();
              logout();
              showToast("Logged out successfully.");
            }}
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}


