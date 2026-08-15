import React, { useState } from 'react';
import { useChat } from '../context/ChatContext';
import { MessageSquare, Search } from 'lucide-react';

export default function ChatList({ onSelectChat }) {
  const { conversations, activeChatId, openChat } = useChat();
  const [search, setSearch] = useState('');

  const filtered = conversations.filter(c =>
    c.user.username.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpen = (chatId) => {
    openChat(chatId);
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
        {filtered.map(conv => {
          const lastMsg = conv.messages[conv.messages.length - 1];
          const snippet = lastMsg ? (lastMsg.type === 'image' ? '📷 Image' : lastMsg.content) : 'Started a conversation';
          const time = lastMsg && lastMsg.timestamp ? new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
          const isActive = conv.id === activeChatId;

          return (
            <div
              key={conv.id}
              className={`chat-item ${isActive ? 'active' : ''}`}
              onClick={() => handleOpen(conv.id)}
            >
              <div className="chat-avatar-container">
                <img src={conv.user.avatar} alt={conv.user.username} className="chat-avatar" />
                <span className="online-indicator-dot" />
              </div>
              <div className="chat-info">
                <div className="chat-item-top-row">
                  <span className="chat-username">{conv.user.username}</span>
                  {time && <span className="chat-time">{time}</span>}
                </div>
                <div className="chat-item-bottom-row">
                  <span className="chat-snippet">{snippet}</span>
                  {conv.unreadCount > 0 && <span className="chat-unread">{conv.unreadCount}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
