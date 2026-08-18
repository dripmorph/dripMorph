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

// Helper: Filter notifications to only those received in the last 24 hours
const filterLast24Hours = (items) => {
  if (!Array.isArray(items)) return [];
  const cutoff = Date.now() - ONE_DAY_MS;
  return items.filter((item) => {
    const ts = new Date(item.created_at || item.timestamp || Date.now()).getTime();
    return !isNaN(ts) && ts >= cutoff;
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

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id;

  const storageKey = `dripmorph_notifications_${userId || 'guest'}`;

  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return filterLast24Hours(JSON.parse(saved));
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
      const filtered = filterLast24Hours(notifications);
      localStorage.setItem(storageKey, JSON.stringify(filtered));
    } catch (e) {
      console.warn('[NotificationContext] Failed to persist notifications:', e);
    }
  }, [notifications, storageKey]);

  // Periodic 24-hour cleanup (runs every 60 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setNotifications((prev) => {
        const fresh = filterLast24Hours(prev);
        if (fresh.length !== prev.length) return fresh;
        return prev;
      });
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Method to add a new real-time notification
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
      unread: true,
      data: newNotif.data || null
    };

    setNotifications((prev) => {
      const existing = prev.find((n) => n.id === item.id);
      if (existing) return prev;
      return [item, ...filterLast24Hours(prev)];
    });
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

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {
      console.warn('[NotificationContext] Failed to clear notifications:', e);
    }
  }, [storageKey]);

  // Real-time Supabase Subscriptions for Follows, Messages, and Likes
  useEffect(() => {
    if (!userId) {
      // Clean up channels if logged out
      channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
      channelsRef.current = [];
      return;
    }

    // Clean up existing channels before establishing new ones
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
          const username = profile?.username ? `@${profile.username}` : 'Someone';

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
          const username = profile?.username ? `@${profile.username}` : 'Someone';
          const content = payload.new?.content || '';
          const snippet = content.length > 50 ? `${content.slice(0, 50)}...` : content;

          addNotification({
            id: `msg-${payload.new.id || Date.now()}`,
            type: 'message',
            actorUsername: username,
            actorAvatar: profile?.avatar_url,
            title: username,
            text: snippet ? `${username}: "${snippet}"` : `${username} sent you a message.`,
            created_at: payload.new.created_at || new Date().toISOString(),
            data: { senderId, username, content }
          });
        }
      )
      .subscribe();

    // 3. Outfit Likes Channel
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
            // Verify if this outfit belongs to the current user
            const { data: outfitData } = await supabase
              .from('outfits')
              .select('id, user_id, title')
              .eq('id', outfitId)
              .single();

            if (outfitData && outfitData.user_id === userId) {
              const profile = await fetchUserProfile(likerId);
              const username = profile?.username ? `@${profile.username}` : 'Someone';
              const outfitTitle = outfitData.title ? `"${outfitData.title}"` : 'your fit check';

              addNotification({
                id: `like-${payload.new.id || Date.now()}`,
                type: 'like',
                actorUsername: username,
                actorAvatar: profile?.avatar_url,
                title: username,
                text: `${username} liked ${outfitTitle}.`,
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
  }, [userId, addNotification]);

  const active24hNotifications = filterLast24Hours(notifications);
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
        clearAll
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
export default NotificationContext;
