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

// Helper: Get active cutoff (considering 24 hours, cloud user_metadata, and user clear action)
const getCutoffMs = (uid, userMetadata) => {
  const oneDayAgo = Date.now() - ONE_DAY_MS;
  let cloudMs = 0;
  let localMs = 0;

  if (userMetadata?.notifications_cleared_at) {
    const ms = new Date(userMetadata.notifications_cleared_at).getTime();
    if (!isNaN(ms)) cloudMs = ms;
  }

  try {
    const clearedStr = localStorage.getItem(`dripmorph_notifications_cleared_${uid || 'guest'}`);
    if (clearedStr) {
      const ms = new Date(clearedStr).getTime();
      if (!isNaN(ms)) localMs = ms;
    }
  } catch (e) {
    // Ignore storage read error
  }
  return Math.max(oneDayAgo, cloudMs, localMs);
};

// Helper: Filter notifications to only valid ones (within 24 hours and after last clear)
const filterValidNotifications = (items, uid, userMetadata) => {
  if (!Array.isArray(items)) return [];
  const cutoff = getCutoffMs(uid, userMetadata);
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

// Helper: Format message notification text (bundled like Instagram)
const formatMessageNotificationText = (uname, count = 1) => {
  if (count <= 1) {
    return `${uname} sent you a message.`;
  }
  return `${uname} sent you ${count} messages.`;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id;
  const userMetadata = user?.userMetadata || {};

  const storageKey = `dripmorph_notifications_${userId || 'guest'}`;
  const clearedKey = `dripmorph_notifications_cleared_${userId || 'guest'}`;

  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return filterValidNotifications(JSON.parse(saved), userId, userMetadata);
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
      const filtered = filterValidNotifications(notifications, userId, userMetadata);
      localStorage.setItem(storageKey, JSON.stringify(filtered));
    } catch (e) {
      console.warn('[NotificationContext] Failed to persist notifications:', e);
    }
  }, [notifications, storageKey, userId, userMetadata]);

  // Periodic 24-hour cleanup (runs every 60 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setNotifications((prev) => {
        const fresh = filterValidNotifications(prev, userId, userMetadata);
        if (fresh.length !== prev.length) return fresh;
        return prev;
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [userId, userMetadata]);

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
        return filterValidNotifications(updated, userId, userMetadata);
      }
      return [item, ...filterValidNotifications(prev, userId, userMetadata)];
    });
  }, [userId, userMetadata]);

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

      // 2. Fetch recent follows on current user after cutoff (table has no 'id' column)
      const { data: recentFollows } = await supabase
        .from('follows')
        .select('follower_id, following_id, created_at')
        .eq('following_id', currentUid)
        .gt('created_at', cutoff)
        .order('created_at', { ascending: false });

      // 3. Fetch user's outfits to find likes on them after cutoff (outfits has no 'title' column)
      const { data: myOutfits } = await supabase
        .from('outfits')
        .select('id')
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

      // 1. Group recent UNREAD messages by sender_id (bulge onto one another like Instagram)
      const msgGroupsBySender = {};
      (recentMsgs || []).forEach((m) => {
        // Only include UNREAD messages in notification counts
        if (m.read) return;

        if (!msgGroupsBySender[m.sender_id]) {
          msgGroupsBySender[m.sender_id] = {
            sender_id: m.sender_id,
            messages: [],
            latest_created_at: m.created_at,
            hasUnread: true
          };
        }
        msgGroupsBySender[m.sender_id].messages.push(m);
        if (new Date(m.created_at).getTime() > new Date(msgGroupsBySender[m.sender_id].latest_created_at).getTime()) {
          msgGroupsBySender[m.sender_id].latest_created_at = m.created_at;
        }
      });

      // Format bundled message notifications
      Object.values(msgGroupsBySender).forEach((group) => {
        const actor = actorMap[group.sender_id];
        const rawName = actor?.username || 'user';
        const uname = rawName.replace(/^@/, '');
        const count = group.messages.length;
        const notifText = formatMessageNotificationText(uname, count);

        fetchedList.push({
          id: `msg-group-${group.sender_id}`,
          type: 'message',
          actorUsername: uname,
          actorAvatar: actor?.avatar_url || null,
          title: uname,
          text: notifText,
          created_at: group.latest_created_at,
          unread: true,
          count: count,
          data: { senderId: group.sender_id, username: uname, count }
        });
      });

      // Format follows
      (recentFollows || []).forEach((f) => {
        const actor = actorMap[f.follower_id];
        const rawName = actor?.username || 'user';
        const uname = rawName.replace(/^@/, '');
        fetchedList.push({
          id: `follow-${f.follower_id}-${f.following_id}`,
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

      // Format likes
      recentLikes.forEach((l) => {
        const actor = actorMap[l.user_id];
        const rawName = actor?.username || 'user';
        const uname = rawName.replace(/^@/, '');
        fetchedList.push({
          id: `like-${l.id || l.user_id + '-' + l.outfit_id}`,
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
        
        // Add fresh database unread message notifications, follows, likes
        fetchedList.forEach((n) => {
          map.set(n.id, n);
        });

        // Retain non-message notifications from previous state
        prev.forEach((n) => {
          if (n.type !== 'message') {
            if (!map.has(n.id)) {
              map.set(n.id, n);
            }
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

  // Dismiss / clear message notifications for a specific sender (e.g. when their chat is read)
  const dismissMessageNotification = useCallback((senderId) => {
    if (!senderId) return;
    setNotifications((prev) => {
      const filtered = prev.filter(
        (n) => !(n.type === 'message' && (n.data?.senderId === senderId || n.id === `msg-group-${senderId}`))
      );
      return filtered;
    });
  }, []);

  // Listen for custom event when any chat is opened or messages read
  useEffect(() => {
    const handleDismissEvent = (e) => {
      const senderId = e.detail?.senderId;
      if (senderId) {
        dismissMessageNotification(senderId);
      }
    };
    window.addEventListener('dripmorph:dismiss-message-notif', handleDismissEvent);
    return () => window.removeEventListener('dripmorph:dismiss-message-notif', handleDismissEvent);
  }, [dismissMessageNotification]);

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

  // Clear all notifications completely and permanently (synced across Web & Mobile)
  const clearAll = useCallback(async () => {
    const nowIso = new Date().toISOString();
    try {
      localStorage.setItem(clearedKey, nowIso);
      localStorage.setItem(storageKey, JSON.stringify([]));
    } catch (e) {
      console.warn('[NotificationContext] Failed to clear notifications locally:', e);
    }

    try {
      await supabase.auth.updateUser({
        data: {
          notifications_cleared_at: nowIso,
        }
      });
    } catch (cloudErr) {
      console.warn('[NotificationContext] Failed to sync clear to Supabase:', cloudErr);
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
          const username = rawName.replace(/^@/, '');

          addNotification({
            id: `follow-${followerId}-${userId}`,
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
          const username = rawName.replace(/^@/, '');
          const createdAt = payload.new?.created_at || new Date().toISOString();

          setNotifications((prev) => {
            const existingIdx = prev.findIndex(
              (n) => n.id === `msg-group-${senderId}` || (n.type === 'message' && n.data?.senderId === senderId)
            );

            if (existingIdx >= 0) {
              const existing = prev[existingIdx];
              // If previous notification was unread, increment; if already read/opened, start fresh at 1
              const newCount = existing.unread ? (existing.count || 0) + 1 : 1;
              const updatedItem = {
                ...existing,
                id: `msg-group-${senderId}`,
                type: 'message',
                actorUsername: username,
                actorAvatar: profile?.avatar_url || existing.actorAvatar,
                title: username,
                text: formatMessageNotificationText(username, newCount),
                created_at: createdAt,
                unread: true,
                count: newCount,
                data: { senderId, username, count: newCount }
              };
              const remaining = prev.filter((_, idx) => idx !== existingIdx);
              return filterValidNotifications([updatedItem, ...remaining], userId, userMetadata);
            } else {
              const newItem = {
                id: `msg-group-${senderId}`,
                type: 'message',
                actorUsername: username,
                actorAvatar: profile?.avatar_url || null,
                title: username,
                text: formatMessageNotificationText(username, 1),
                created_at: createdAt,
                unread: true,
                count: 1,
                data: { senderId, username, count: 1 }
              };
              return filterValidNotifications([newItem, ...prev], userId, userMetadata);
            }
          });
        }
      )
      .subscribe();

    // 3. Messages Read UPDATE Channel (when messages are marked read in DB)
    const messageReadChannel = supabase
      .channel(`notifs-messages-read:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${userId}`
        },
        (payload) => {
          if (payload.new?.read) {
            const senderId = payload.new?.sender_id;
            if (senderId) {
              dismissMessageNotification(senderId);
            }
          }
        }
      )
      .subscribe();

    // 4. Outfit Likes Channel (strictly "@user liked your post.")
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
              const username = rawName.replace(/^@/, '');

              addNotification({
                id: `like-${payload.new.id || likerId + '-' + outfitId}`,
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

    channelsRef.current = [followChannel, messageChannel, messageReadChannel, likeChannel];

    // Background sync every 10 seconds for real-time guarantee across all tables
    const pollInterval = setInterval(() => {
      fetch24hNotifications(userId);
    }, 10000);

    return () => {
      clearInterval(pollInterval);
      channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
      channelsRef.current = [];
    };
  }, [userId, addNotification, fetch24hNotifications, dismissMessageNotification]);

  const active24hNotifications = filterValidNotifications(notifications, userId, userMetadata);
  const unreadCount = active24hNotifications.filter((n) => n.unread).length;
  const hasNotifications = unreadCount > 0;

  return (
    <NotificationContext.Provider
      value={{
        notifications: active24hNotifications,
        unreadCount,
        hasNotifications,
        addNotification,
        dismissMessageNotification,
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
