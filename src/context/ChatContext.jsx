import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import * as messageService from '../lib/messageService';

const ChatContext = createContext();
export const useChat = () => useContext(ChatContext);

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&h=240&fit=crop';

// Helper: Get timestamp when this user cleared the chat with a specific partner (checks cloud user_metadata + localStorage)
const getChatClearedCutoff = (userId, partnerId, userMetadata) => {
  if (!userId || !partnerId) return 0;
  let cloudMs = 0;
  let localMs = 0;

  // 1. Check cloud user metadata synced via Supabase Auth
  if (userMetadata?.chat_cleared && userMetadata.chat_cleared[partnerId]) {
    const ms = new Date(userMetadata.chat_cleared[partnerId]).getTime();
    if (!isNaN(ms)) cloudMs = ms;
  }

  // 2. Check localStorage on current device
  try {
    const str = localStorage.getItem(`dripmorph_chat_cleared_${userId}_${partnerId}`);
    if (str) {
      const ms = new Date(str).getTime();
      if (!isNaN(ms)) localMs = ms;
    }
  } catch (e) {
    // Ignore storage read error
  }

  return Math.max(cloudMs, localMs);
};

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const currentUserId = user?.id || null;
  const userMetadata = user?.userMetadata || {};

  const [conversations, setConversations] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null); // partner's UUID
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Refs to access latest values inside async callbacks without stale closures
  const activeChatIdRef = useRef(null);
  const currentUserIdRef = useRef(null);
  const userMetadataRef = useRef(userMetadata);
  const channelRef = useRef(null);

  useEffect(() => { activeChatIdRef.current = activeChatId; }, [activeChatId]);
  useEffect(() => { currentUserIdRef.current = currentUserId; }, [currentUserId]);
  useEffect(() => { userMetadataRef.current = userMetadata; }, [userMetadata]);

  // Sync cloud chat_cleared metadata to localStorage on mount / user change
  useEffect(() => {
    if (currentUserId && userMetadata?.chat_cleared) {
      try {
        Object.entries(userMetadata.chat_cleared).forEach(([partnerId, isoDate]) => {
          if (partnerId && isoDate) {
            localStorage.setItem(`dripmorph_chat_cleared_${currentUserId}_${partnerId}`, isoDate);
          }
        });
      } catch (e) {
        console.warn('[Chat] Failed to sync cloud cleared map to localStorage:', e);
      }
    }
  }, [currentUserId, userMetadata]);

  // ── Load conversations + subscribe to realtime when user logs in ────────────
  useEffect(() => {
    if (!currentUserId) {
      setConversations([]);
      setActiveChatId(null);
      cleanupChannel();
      return;
    }
    loadConversations(currentUserId);
    setupRealtimeSubscription(currentUserId);

    const pollInterval = setInterval(() => {
      loadConversations(currentUserId);
    }, 10000);

    return () => {
      clearInterval(pollInterval);
      cleanupChannel();
    };
  }, [currentUserId]);

  const cleanupChannel = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };

  // ── Load all conversations from Supabase ────────────────────────────────────
  const loadConversations = async (userId) => {
    try {
      const convData = await messageService.fetchConversations(userId);
      if (convData.length === 0) { setConversations([]); return; }

      const partnerIds = convData.map(c => c.partnerId);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', partnerIds);

      const profileMap = {};
      for (const p of (profiles || [])) profileMap[p.id] = p;

      setConversations(
        convData.map(c => {
          const profile = profileMap[c.partnerId];
          const clearedCutoff = getChatClearedCutoff(userId, c.partnerId, userMetadataRef.current);
          let lastMsg = c.lastMessage;
          if (lastMsg && clearedCutoff > 0) {
            const ts = new Date(lastMsg.created_at || lastMsg.timestamp || Date.now()).getTime();
            if (isNaN(ts) || ts <= clearedCutoff) {
              lastMsg = null;
            }
          }

          return {
            id: c.partnerId,
            partnerId: c.partnerId,
            user: {
              id: c.partnerId,
              username: profile?.username ? `@${profile.username}` : '...',
              avatar: profile?.avatar_url || DEFAULT_AVATAR,
            },
            messages: [],          // lazy-loaded when chat is opened
            lastMessage: lastMsg,
            unreadCount: lastMsg ? c.unreadCount : 0,
            status: 'accepted',
          };
        })
      );
    } catch (err) {
      console.error('[Chat] loadConversations error:', err);
    }
  };

  // ── Supabase Realtime subscription for incoming messages ────────────────────
  const setupRealtimeSubscription = (userId) => {
    cleanupChannel();
    channelRef.current = supabase
      .channel(`inbox:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${userId}` },
        handleIncomingMessage
      )
      .subscribe();
  };

  const handleIncomingMessage = async (payload) => {
    const newMsg = payload.new || payload;
    const partnerId = newMsg.sender_id;
    const isActive = activeChatIdRef.current === partnerId;

    setConversations(prev => {
      const exists = prev.find(c => c.partnerId === partnerId);
      if (exists) {
        return prev.map(c => {
          if (c.partnerId !== partnerId) return c;
          return {
            ...c,
            // Only append to messages array if it was already loaded (length > 0)
            messages: c.messages.length > 0 ? [...c.messages, newMsg] : c.messages,
            lastMessage: newMsg,
            unreadCount: isActive ? 0 : c.unreadCount + 1,
          };
        });
      } else {
        // New conversation from someone new — load their profile asynchronously
        loadNewConversation(partnerId, newMsg);
        return prev;
      }
    });

    // Mark as read immediately if we're currently in that chat
    if (isActive && currentUserIdRef.current) {
      await messageService.markMessagesRead(currentUserIdRef.current, partnerId);
    }
  };

  const loadNewConversation = async (partnerId, firstMsg) => {
    const profile = await messageService.fetchProfile(partnerId);
    const newConv = {
      id: partnerId,
      partnerId,
      user: {
        id: partnerId,
        username: profile?.username ? `@${profile.username}` : '...',
        avatar: profile?.avatar_url || DEFAULT_AVATAR,
      },
      messages: [firstMsg],
      lastMessage: firstMsg,
      unreadCount: activeChatIdRef.current === partnerId ? 0 : 1,
      status: 'accepted',
    };
    setConversations(prev => {
      if (prev.find(c => c.partnerId === partnerId)) return prev;
      return [newConv, ...prev];
    });
  };

  // ── Open a chat ─────────────────────────────────────────────────────────────
  const openChat = async (target, avatarUrl = null) => {
    const userId = currentUserIdRef.current;
    if (!userId) return;

    let partnerId = null;
    let partnerUsername = null;
    let partnerAvatar = avatarUrl;

    // Resolve target → partnerId
    if (typeof target === 'string' && conversations.some(c => c.id === target)) {
      // Already a partnerId UUID (from ChatList)
      partnerId = target;
    } else if (typeof target === 'object' && target?.id && String(target.id).includes('-')) {
      // User object with UUID id
      partnerId = target.id;
      partnerUsername = target.username;
      partnerAvatar = target.avatar || avatarUrl;
    } else {
      // Look up by username
      const uname = typeof target === 'string' ? target : target?.username;
      partnerUsername = uname;
      partnerAvatar = target?.avatar || avatarUrl;
      if (!uname) return;

      const profile = await messageService.findUserByUsername(uname);
      if (!profile) {
        console.warn('[Chat] User not found:', uname);
        return;
      }
      partnerId = profile.id;
      partnerAvatar = partnerAvatar || profile.avatar_url;
      partnerUsername = partnerUsername || `@${profile.username}`;
    }

    if (!partnerId) return;

    setActiveChatId(partnerId);

    // Ensure conversation entry exists in local state
    const exists = conversations.find(c => c.id === partnerId);
    if (!exists) {
      setConversations(prev => [
        {
          id: partnerId,
          partnerId,
          user: {
            id: partnerId,
            username: partnerUsername || '...',
            avatar: partnerAvatar || DEFAULT_AVATAR,
          },
          messages: [],
          lastMessage: null,
          unreadCount: 0,
          status: 'accepted',
        },
        ...prev,
      ]);
    }

    // Fetch messages from Supabase
    setLoadingMessages(true);
    try {
      const msgs = await messageService.fetchMessages(userId, partnerId);
      const clearedCutoff = getChatClearedCutoff(userId, partnerId, userMetadataRef.current);
      const visibleMsgs = clearedCutoff > 0
        ? (msgs || []).filter(m => {
            const ts = new Date(m.created_at || m.timestamp || Date.now()).getTime();
            return !isNaN(ts) && ts > clearedCutoff;
          })
        : (msgs || []);

      setConversations(prev =>
        prev.map(c => c.id === partnerId ? { ...c, messages: visibleMsgs, unreadCount: 0 } : c)
      );
      await messageService.markMessagesRead(userId, partnerId);
    } catch (err) {
      console.error('[Chat] fetchMessages error:', err);
    } finally {
      setLoadingMessages(false);
    }

    return partnerId;
  };

  // ── Send a message ──────────────────────────────────────────────────────────
  const sendMessage = async (partnerId, content, type = 'text') => {
    const userId = currentUserIdRef.current;
    if (!userId || !partnerId || !String(content || '').trim()) return;

    const tempId = `temp-${Date.now()}`;
    const tempMsg = {
      id: tempId,
      sender_id: userId,
      recipient_id: partnerId,
      content: String(content).trim(),
      type,
      read: false,
      created_at: new Date().toISOString(),
    };

    // Optimistic update
    setConversations(prev =>
      prev.map(c =>
        c.id === partnerId
          ? { ...c, messages: [...c.messages, tempMsg], lastMessage: tempMsg }
          : c
      )
    );

    try {
      const saved = await messageService.sendMessage(userId, partnerId, String(content).trim(), type);
      // Replace temp with real DB record
      setConversations(prev =>
        prev.map(c => {
          if (c.id !== partnerId) return c;
          return {
            ...c,
            messages: c.messages.map(m => m.id === tempId ? saved : m),
            lastMessage: saved,
          };
        })
      );
    } catch (err) {
      console.error('[Chat] sendMessage error:', err);
      // Remove failed optimistic message
      setConversations(prev =>
        prev.map(c => {
          if (c.id !== partnerId) return c;
          return { ...c, messages: c.messages.filter(m => m.id !== tempId) };
        })
      );
    }
  };

  // ── Delete all messages in a chat (synced across Web & Mobile) ─────────────
  const deleteChatMessages = async (partnerId) => {
    const userId = currentUserIdRef.current;
    if (!userId || !partnerId) return;

    const nowIso = new Date().toISOString();

    // 1. Save locally for instantaneous response
    try {
      localStorage.setItem(`dripmorph_chat_cleared_${userId}_${partnerId}`, nowIso);
    } catch (e) {
      console.warn('[Chat] Failed to set cleared timestamp locally:', e);
    }

    // 2. Sync to Supabase cloud user_metadata so Mobile & Web stay 100% in sync
    try {
      const existingMeta = userMetadataRef.current || {};
      const existingCleared = existingMeta.chat_cleared || {};
      const updatedCleared = { ...existingCleared, [partnerId]: nowIso };
      userMetadataRef.current = { ...existingMeta, chat_cleared: updatedCleared };

      await supabase.auth.updateUser({
        data: {
          chat_cleared: updatedCleared,
        }
      });
    } catch (cloudErr) {
      console.warn('[Chat] Failed to sync cleared timestamp to Supabase:', cloudErr);
    }

    // 3. Clear messages in active local state
    setConversations(prev =>
      prev.map(c =>
        c.id === partnerId
          ? { ...c, messages: [], lastMessage: null, unreadCount: 0 }
          : c
      )
    );
  };

  const closeChat = () => setActiveChatId(null);

  const totalUnreadMessages = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  const hasUnreadMessages = totalUnreadMessages > 0;

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeChatId,
        loadingMessages,
        unreadCount: totalUnreadMessages,
        unreadMessagesCount: totalUnreadMessages,
        hasUnreadMessages,
        openChat,
        sendMessage,
        deleteChatMessages,
        clearChatMessages: deleteChatMessages,
        closeChat,
        // Legacy compatibility for any existing call sites
        addConversation: (user) => openChat(user),
        acceptConversation: () => {},
        declineConversation: (id) =>
          setConversations(prev => prev.filter(c => c.id !== id)),
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
