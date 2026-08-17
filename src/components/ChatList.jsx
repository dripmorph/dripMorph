import React, { useState } from 'react';
import { useChat } from '../context/ChatContext';
import { MessageSquare, Search } from 'lucide-react';

export default function ChatList({ onSelectChat }) {
  const { conversations = [], activeChatId, openChat } = useChat();
  const [search, setSearch] = useState('');

  const convList = Array.isArray(conversations) ? conversations : [];

  const filtered = convList.filter(c => {
    if (!c) return false;
    const uname = c.user?.username || '';
    return uname.toLowerCase().includes(search.toLowerCase());
  });

  const handleOpen = (chatId) => {
    if (openChat) openChat(chatId);
    if (onSelectChat) onSelectChat();
  };

  return (
    <div className="chat-list">
      <div className="chat-list-header">
        <div className="chat-title-group">
          <MessageSquare size={20} className="chat-header-icon" />
          <h2 className="chat-list-title">Messages</h2>
        </div>
      </div>
      <div className="chat-search-wrapper">
        <div className="chat-search-input-container">
          <Search size={15} className="chat-search-icon" />
          <input
            type="text"
            className="chat-search-input"
            placeholder="Search contacts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="chat-conversations">
        {filtered.length === 0 && (
          <div className="chat-no-convs">
            <p>No messages yet. Message someone from their profile!</p>
          </div>
        )}
        {filtered.map(conv => {
          if (!conv) return null;
          const userObj = conv.user || {};
          const username = userObj.username || '@user';
          const avatar = userObj.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&h=240&fit=crop';

          // Use lastMessage (from DB summary) or fall back to last in messages array
          const msgList = Array.isArray(conv.messages) ? conv.messages : [];
          const lastMsg = conv.lastMessage || (msgList.length > 0 ? msgList[msgList.length - 1] : null);

          const snippet = lastMsg
            ? (lastMsg.type === 'image' ? '📷 Image' : (lastMsg.content || ''))
            : 'Start a conversation';

          const ts = lastMsg?.created_at || lastMsg?.timestamp;
          const time = ts
            ? new Date(ts).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : '';

          const isActive = conv.id === activeChatId;

          return (
            <div
              key={conv.id || username}
              className={`chat-item ${isActive ? 'active' : ''}`}
              onClick={() => handleOpen(conv.id)}
            >
              <div className="chat-avatar-container">
                <img
                  src={avatar}
                  alt={username}
                  className="chat-avatar"
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&h=240&fit=crop';
                  }}
                />
                <span className="online-indicator-dot" />
              </div>
              <div className="chat-info">
                <div className="chat-item-top-row">
                  <span className="chat-username">{username}</span>
                  {time && <span className="chat-time">{time}</span>}
                </div>
                <div className="chat-item-bottom-row">
                  <span className="chat-snippet">{snippet}</span>
                  {conv.unreadCount > 0 && (
                    <span className="chat-unread">{conv.unreadCount}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
