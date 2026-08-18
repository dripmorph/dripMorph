import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Helper: Get active cutoff (considering 24 hours and user clear action)
const getCutoffMs = (uid) => {
  const oneDayAgo = Date.now() - ONE_DAY_MS;
  try {
    const clearedStr = localStorage.getItem(`dripmorph_notifications_cleared_${uid || 'guest'}`);
    if (clearedStr) {
      const clearedMs = new Date(clearedStr).getTime();
      if (!isNaN(clearedMs)) {
        return Math.max(oneDayAgo, clearedMs);
      }
    }
  } catch (e) {
    // Ignore storage read error
  }
  return oneDayAgo;
};

// Helper: Filter notifications to only valid ones (within 24 hours and after last clear)
const filterValidNotifications = (items, uid) => {
  if (!Array.isArray(items)) return [];
  const cutoff = getCutoffMs(uid);
  return items.filter((item) => {
    const ts = new Date(item.created_at || item.timestamp || Date.now()).getTime();
    return !isNaN(ts) && ts > cutoff;
  });
};

// Helper: Format relative timestamp
export const formatRelativeTime = (isoString) => {
  if (!isoString) return 'Just now';
  const diff = Date.now() - new Date(isoString).getTime();
  if (diff < 60 * 1000) return 'Just now';
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}m ago`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}h ago`;
  return '1d ago';
};

// Helper: Format message notification text cleanly (handles photos and text)
const formatMessageNotificationText = (uname, content, type) => {
  if (type === 'image' || (typeof content === 'string' && (content.startsWith('data:image') || content.startsWith('http')))) {
    return `${uname} sent you a photo.`;
  }
  if (!content || !content.trim()) {
    return `${uname} sent you a message.`;
  }
  const trimmed = content.trim();
  const snippet = trimmed.length > 40 ? `${trimmed.slice(0, 40)}...` : trimmed;
  return `${uname}: "${snippet}"`;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id;

  const storageKey = `dripmorph_notifications_${userId || 'guest'}`;
  const clearedKey = `dripmorph_notifications_cleared_${userId || 'guest'}`;

  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return filterValidNotifications(JSON.parse(saved), userId);
      }
    } catch (e) {
      console.warn('[NotificationContext] Failed to load saved notifications:', e);
    }
    return [];
  });

  const channelsRef = useRef([]);

  // Save to localStorage whenever notifications change
  useEffect(() => {
    try {
      const filtered = filterValidNotifications(notifications, userId);
      localStorage.setItem(storageKey, JSON.stringify(filtered));
    } catch (e) {
      console.warn('[NotificationContext] Failed to persist notifications:', e);
    }
  }, [notifications, storageKey, userId]);

  // Periodic 24-hour cleanup (runs every 60 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setNotifications((prev) => {
        const fresh = filterValidNotifications(prev, userId);
        if (fresh.length !== prev.length) return fresh;
        return prev;
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [userId]);

  // Method to add or merge a real-time notification
  const addNotification = useCallback((newNotif) => {
    const created_at = newNotif.created_at || new Date().toISOString();
    const item = {
      id: newNotif.id || `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: newNotif.type || 'system',
      title: newNotif.title || 'DripMorph',
      text: newNotif.text || '',
      actorUsername: newNotif.actorUsername || '',
      actorAvatar: newNotif.actorAvatar || null,
      created_at,
      unread: newNotif.unread !== undefined ? newNotif.unread : true,
      data: newNotif.data || null
    };

    setNotifications((prev) => {
      const existingIdx = prev.findIndex((n) => n.id === item.id);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], ...item };
        return filterValidNotifications(updated, userId);
      }
      return [item, ...filterValidNotifications(prev, userId)];
    });
  }, [userId]);

  // Initial 24-hour query to fetch all recent database activity (messages, likes, follows)
  const fetch24hNotifications = useCallback(async (currentUid) => {
    if (!currentUid) return;
    try {
      const cutoffMs = getCutoffMs(currentUid);
      const cutoff = new Date(cutoffMs).toISOString();

      // 1. Fetch recent messages sent to current user after cutoff
      const { data: recentMsgs } = await supabase
        .from('messages')
        .select('id, sender_id, content, type, created_at, read')
        .eq('recipient_id', currentUid)
        .gt('created_at', cutoff)
        .order('created_at', { ascending: false });

      // 2. Fetch recent follows on current user after cutoff
      const { data: recentFollows } = await supabase
        .from('follows')
        .select('id, follower_id, created_at')
        .eq('following_id', currentUid)
        .gt('created_at', cutoff)
        .order('created_at', { ascending: false });

      // 3. Fetch user's outfits to find likes on them after cutoff
      const { data: myOutfits } = await supabase
        .from('outfits')
        .select('id, title')
        .eq('poster_id', currentUid);

      let recentLikes = [];
      if (myOutfits && myOutfits.length > 0) {
        const outfitIds = myOutfits.map((o) => o.id);

        const { data: likesData } = await supabase
          .from('outfit_likes')
          .select('id, outfit_id, user_id, created_at')
          .in('outfit_id', outfitIds)
          .neq('user_id', currentUid)
          .gt('created_at', cutoff)
          .order('created_at', { ascending: false });

        recentLikes = likesData || [];
      }

      // Collect all distinct actor IDs
      const actorIds = new Set();
      (recentMsgs || []).forEach((m) => actorIds.add(m.sender_id));
      (recentFollows || []).forEach((f) => actorIds.add(f.follower_id));
      recentLikes.forEach((l) => actorIds.add(l.user_id));

      const actorMap = {};
      if (actorIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', Array.from(actorIds));

        (profiles || []).forEach((p) => {
          actorMap[p.id] = p;
        });
      }

      const fetchedList = [];

      // Format messages
      (recentMsgs || []).forEach((m) => {
        const actor = actorMap[m.sender_id];
        const rawName = actor?.username || 'user';
        const uname = rawName.startsWith('@') ? rawName : `@${rawName}`;
        const notifText = formatMessageNotificationText(uname, m.content, m.type);
        fetchedList.push({
          id: `msg-${m.id}`,
          type: 'message',
          actorUsername: uname,
          actorAvatar: actor?.avatar_url || null,
          title: uname,
          text: notifText,
          created_at: m.created_at,
          unread: !m.read,
          data: { senderId: m.sender_id, username: uname, content: m.content }
        });
      });

      // Format follows
      (recentFollows || []).forEach((f) => {
        const actor = actorMap[f.follower_id];
        const rawName = actor?.username || 'user';
        const uname = rawName.startsWith('@') ? rawName : `@${rawName}`;
        fetchedList.push({
          id: `follow-${f.id}`,
          type: 'follow',
          actorUsername: uname,
          actorAvatar: actor?.avatar_url || null,
          title: uname,
          text: `${uname} started following you.`,
          created_at: f.created_at,
          unread: true,
          data: { followerId: f.follower_id, username: uname }
        });
      });

      // Format likes (strictly "@user liked your post.")
      recentLikes.forEach((l) => {
        const actor = actorMap[l.user_id];
        const rawName = actor?.username || 'user';
        const uname = rawName.startsWith('@') ? rawName : `@${rawName}`;
        fetchedList.push({
          id: `like-${l.id}`,
          type: 'like',
          actorUsername: uname,
          actorAvatar: actor?.avatar_url || null,
          title: uname,
          text: `${uname} liked your post.`,
          created_at: l.created_at,
          unread: true,
          data: { likerId: l.user_id, outfitId: l.outfit_id, username: uname }
        });
      });

      setNotifications((prev) => {
        const map = new Map();
        // Keep existing read states if already marked
        prev.forEach((n) => map.set(n.id, n));
        fetchedList.forEach((n) => {
          if (!map.has(n.id)) {
            map.set(n.id, n);
          }
        });
        const combined = Array.from(map.values());
        combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return filterValidNotifications(combined, currentUid);
      });
    } catch (err) {
      console.warn('[NotificationContext] fetch24hNotifications error:', err);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, unread: false }))
    );
  }, []);

  // Mark single notification as read
  const markAsRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );
  }, []);

  // Clear all notifications completely and permanently
  const clearAll = useCallback(() => {
    const nowIso = new Date().toISOString();
    try {
      localStorage.setItem(clearedKey, nowIso);
      localStorage.setItem(storageKey, JSON.stringify([]));
    } catch (e) {
      console.warn('[NotificationContext] Failed to clear notifications:', e);
    }
    setNotifications([]);
  }, [clearedKey, storageKey]);

  // Real-time Supabase Subscriptions for Follows, Messages, and Likes
  useEffect(() => {
    if (!userId) {
      channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
      channelsRef.current = [];
      return;
    }

    // 1. Initial 24h sync from database
    fetch24hNotifications(userId);

    // 2. Clean up existing channels before establishing new ones
    channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
    channelsRef.current = [];

    // Helper to fetch user profile details
    const fetchUserProfile = async (actorId) => {
      if (!actorId) return { username: 'someone', avatar_url: null };
      try {
        const { data } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', actorId)
          .single();
        return data || { username: 'someone', avatar_url: null };
      } catch {
        return { username: 'someone', avatar_url: null };
      }
    };

    // 1. Follows Channel (when someone follows current user)
    const followChannel = supabase
      .channel(`notifs-follows:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'follows',
          filter: `following_id=eq.${userId}`
        },
        async (payload) => {
          const followerId = payload.new?.follower_id;
          if (!followerId || followerId === userId) return;

          const profile = await fetchUserProfile(followerId);
          const rawName = profile?.username || 'user';
          const username = rawName.startsWith('@') ? rawName : `@${rawName}`;

          addNotification({
            id: `follow-${payload.new.id || Date.now()}`,
            type: 'follow',
            actorUsername: username,
            actorAvatar: profile?.avatar_url,
            title: username,
            text: `${username} started following you.`,
            created_at: payload.new.created_at || new Date().toISOString(),
            data: { followerId, username }
          });
        }
      )
      .subscribe();

    // 2. Messages Channel (when someone sends a direct message to current user)
    const messageChannel = supabase
      .channel(`notifs-messages:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${userId}`
        },
        async (payload) => {
          const senderId = payload.new?.sender_id;
          if (!senderId || senderId === userId) return;

          const profile = await fetchUserProfile(senderId);
          const rawName = profile?.username || 'user';
          const username = rawName.startsWith('@') ? rawName : `@${rawName}`;
          const content = payload.new?.content || '';
          const msgType = payload.new?.type || 'text';
          const notifText = formatMessageNotificationText(username, content, msgType);

          addNotification({
            id: `msg-${payload.new.id || Date.now()}`,
            type: 'message',
            actorUsername: username,
            actorAvatar: profile?.avatar_url,
            title: username,
            text: notifText,
            created_at: payload.new.created_at || new Date().toISOString(),
            data: { senderId, username, content }
          });
        }
      )
      .subscribe();

    // 3. Outfit Likes Channel (strictly "@user liked your post.")
    const likeChannel = supabase
      .channel(`notifs-likes:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'outfit_likes'
        },
        async (payload) => {
          const likerId = payload.new?.user_id;
          const outfitId = payload.new?.outfit_id;
          if (!likerId || likerId === userId || !outfitId) return;

          try {
            // Verify if this outfit belongs to the current user (using poster_id!)
            const { data: outfitData } = await supabase
              .from('outfits')
              .select('id, poster_id')
              .eq('id', outfitId)
              .single();

            if (outfitData && outfitData.poster_id === userId) {
              const profile = await fetchUserProfile(likerId);
              const rawName = profile?.username || 'user';
              const username = rawName.startsWith('@') ? rawName : `@${rawName}`;

              addNotification({
                id: `like-${payload.new.id || Date.now()}`,
                type: 'like',
                actorUsername: username,
                actorAvatar: profile?.avatar_url,
                title: username,
                text: `${username} liked your post.`,
                created_at: payload.new.created_at || new Date().toISOString(),
                data: { likerId, outfitId, username }
              });
            }
          } catch (err) {
            console.warn('[NotificationContext] outfit like check skipped:', err);
          }
        }
      )
      .subscribe();

    channelsRef.current = [followChannel, messageChannel, likeChannel];

    return () => {
      channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
      channelsRef.current = [];
    };
  }, [userId, addNotification, fetch24hNotifications]);

  const active24hNotifications = filterValidNotifications(notifications, userId);
  const unreadCount = active24hNotifications.filter((n) => n.unread).length;
  const hasNotifications = unreadCount > 0;

  return (
    <NotificationContext.Provider
      value={{
        notifications: active24hNotifications,
        unreadCount,
        hasNotifications,
        addNotification,
        markAllAsRead,
        markAsRead,
        clearAll,
        refreshNotifications: () => fetch24hNotifications(userId)
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
export default NotificationContext;
