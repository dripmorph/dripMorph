import React, { createContext, useContext, useState, useEffect } from 'react';

// Message format: { id, sender (username), content, type: 'text'|'image', timestamp }
// Conversation format: { id, user: { username, avatar }, messages: [], unreadCount }

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const [conversations, setConversations] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);

  // Load mock data from localStorage or initialize defaults
  useEffect(() => {
    const stored = localStorage.getItem('chatData');
    if (stored) {
      const data = JSON.parse(stored);
      setConversations(data.conversations || []);
      setActiveChatId(data.activeChatId || null);
    } else {
      // Initialize with some mock conversations
      const mock = [
        {
          id: 'c1',
          user: { username: '@streetstyle_icon', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&h=240&fit=crop' },
          messages: [
            { id: 'm1', sender: '@streetstyle_icon', content: 'Hey! Love your latest post.', type: 'text', timestamp: new Date().toISOString() },
            { id: 'm2', sender: '@minimalist_enzo', content: 'Thanks! Appreciate the feedback.', type: 'text', timestamp: new Date().toISOString() }
          ],
          unreadCount: 0,
          status: 'accepted'
        },
        {
          id: 'c2',
          user: { username: '@neon_wanderer', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&h=240&fit=crop' },
          messages: [],
          unreadCount: 0,
          status: 'accepted'
        }
      ];
      setConversations(mock);
    }
  }, []);

  // Persist to localStorage on changes
  useEffect(() => {
    const data = { conversations, activeChatId };
    localStorage.setItem('chatData', JSON.stringify(data));
  }, [conversations, activeChatId]);

  const openChat = (target, avatarUrl = null) => {
    let targetId = null;
    let targetUsername = null;
    let targetAvatar = avatarUrl;

    if (typeof target === 'object' && target !== null) {
      targetUsername = target.username;
      targetId = target.id;
      if (target.avatar) targetAvatar = target.avatar;
    } else if (typeof target === 'string') {
      if (target.startsWith('c') && conversations.some(c => c.id === target)) {
        targetId = target;
      } else {
        targetUsername = target;
      }
    }

    // 1. If targetId matches an existing conversation
    if (targetId) {
      setActiveChatId(targetId);
      setConversations(prev => prev.map(c => c.id === targetId ? { ...c, unreadCount: 0 } : c));
      return targetId;
    }

    // 2. If targetUsername matches an existing conversation
    if (targetUsername) {
      const existing = conversations.find(c => c.user.username.toLowerCase() === targetUsername.toLowerCase());
      if (existing) {
        setActiveChatId(existing.id);
        setConversations(prev => prev.map(c => c.id === existing.id ? { ...c, unreadCount: 0 } : c));
        return existing.id;
      }

      // 3. Create new conversation if not found
      const newId = `c${Date.now()}`;
      const newConv = {
        id: newId,
        user: {
          username: targetUsername,
          avatar: targetAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&h=240&fit=crop'
        },
        messages: [],
        unreadCount: 0,
        status: 'accepted'
      };
      setConversations(prev => [newConv, ...prev]);
      setActiveChatId(newId);
      return newId;
    }
  };

  const sendMessage = (chatId, message) => {
    const newMsg = { ...message, id: `m${Date.now()}`, timestamp: new Date().toISOString() };
    setConversations(prev => prev.map(c => {
      if (c.id === chatId) {
        return { ...c, messages: [...c.messages, newMsg] };
      }
      return c;
    }));
  };

  const addConversation = (user) => {
    // Avoid duplicate chats
    if (conversations.find(c => c.user.username === user.username)) return;
    const newConv = {
      id: `c${Date.now()}`,
      user,
      messages: [],
      unreadCount: 0,
      status: 'pending'
    };
    setConversations(prev => [newConv, ...prev]);
    setActiveChatId(newConv.id);
  };

  const acceptConversation = (chatId) => {
    setConversations(prev => prev.map(c => c.id === chatId ? { ...c, status: 'accepted' } : c));
  };

  const declineConversation = (chatId) => {
    // Remove the conversation entirely
    setConversations(prev => prev.filter(c => c.id !== chatId));
    if (activeChatId === chatId) setActiveChatId(null);
  };

  const closeChat = () => {
    setActiveChatId(null);
  };

  return (
    <ChatContext.Provider value={{ conversations, activeChatId, openChat, sendMessage, addConversation, acceptConversation, declineConversation, closeChat }}>
      {children}
    </ChatContext.Provider>
  );
};
