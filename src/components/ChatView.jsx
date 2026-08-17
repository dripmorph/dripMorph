import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Send, Image, Smile, MessageSquare } from 'lucide-react';

export default function ChatView({ onBack }) {
  const { conversations, activeChatId, sendMessage, acceptConversation, declineConversation } = useChat();
  const { user } = useAuth();
  const conv = conversations.find(c => c.id === activeChatId);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textInputRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conv?.messages]);

  // When keyboard opens on mobile, scroll so the input bar stays visible
  const handleInputFocus = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      textInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 350);
  };

  const handleSend = () => {
    if (!input.trim() || !activeChatId) return;
    const msg = {
      sender: user?.username || '@minimalist_enzo',
      content: input.trim(),
      type: 'text',
      timestamp: new Date().toISOString()
    };
    sendMessage(activeChatId, msg);
    setInput('');
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file && activeChatId) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const msg = {
          sender: user?.username || '@minimalist_enzo',
          content: uploadEvent.target.result,
          type: 'image',
          timestamp: new Date().toISOString()
        };
        sendMessage(activeChatId, msg);
      };
      reader.readAsDataURL(file);
    }
  };

  // Empty state when no conversation is selected
  if (!conv) {
    return (
      <div className="chat-view chat-empty-container">
        <div className="chat-empty-state">
          <div className="chat-empty-icon-wrapper">
            <MessageSquare size={36} className="chat-empty-icon" />
          </div>
          <h3 className="chat-empty-title">Your Messages</h3>
          <p className="chat-empty-subtitle">Select a conversation from the list to start messaging</p>
        </div>
      </div>
    );
  }

  const isPending = conv.status === 'pending';
  const isRecipient = user && conv.user.username === user.username;
  const isInitiator = !isRecipient;

  return (
    <div className="chat-view">
      {/* Header Bar */}
      <div className="chat-header">
        <button className="chat-back-btn" onClick={onBack} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <div className="chat-header-user-info">
          <div className="chat-header-avatar-wrapper">
            <img src={conv.user.avatar} alt={conv.user.username} className="chat-header-avatar" />
            <span className="online-indicator-dot" />
          </div>
          <div className="chat-header-meta">
            <span className="chat-header-username">{conv.user.username}</span>
            <span className="chat-header-status">
              <span className="status-dot">●</span> Active now
            </span>
          </div>
        </div>
      </div>

      {/* Pending request banner */}
      {isPending && isRecipient && (
        <div className="chat-request-banner">
          <span>Do you want to chat with {conv.user.username}?</span>
          <div className="chat-request-actions">
            <button className="btn-accept-chat" onClick={() => acceptConversation(activeChatId)}>Accept</button>
            <button className="btn-decline-chat" onClick={() => declineConversation(activeChatId)}>Decline</button>
          </div>
        </div>
      )}

      {/* Messages Feed */}
      <div className="chat-messages">
        {conv.messages.length === 0 ? (
          <div className="chat-no-messages">
            <img src={conv.user.avatar} alt={conv.user.username} className="chat-no-messages-avatar" />
            <h4>Say hi to {conv.user.username}!</h4>
            <p>Start the conversation with a message or fit check.</p>
          </div>
        ) : (
          conv.messages.map(msg => {
            const isSent = msg.sender === (user?.username || '@minimalist_enzo');
            const timeStr = msg.timestamp
              ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '11:45 AM';

            return (
              <div
                key={msg.id}
                className={`chat-bubble-wrapper ${isSent ? 'sent-wrapper' : 'received-wrapper'}`}
              >
                <div className={`chat-bubble ${isSent ? 'sent' : 'received'}`}>
                  {msg.type === 'image' ? (
                    <img src={msg.content} alt="Sent fit" className="chat-image" />
                  ) : (
                    <span>{msg.content}</span>
                  )}
                </div>
                <span className="chat-bubble-timestamp">{timeStr}</span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="chat-input-bar">
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleImageUpload}
          style={{ display: 'none' }}
        />
        <button type="button" className="chat-action-btn" aria-label="Emoji">
          <Smile size={20} />
        </button>
        <button
          type="button"
          className="chat-action-btn"
          aria-label="Attach Image"
          onClick={() => fileInputRef.current?.click()}
        >
          <Image size={20} />
        </button>
        <input
          ref={textInputRef}
          type="text"
          inputMode="text"
          className="chat-text-input"
          placeholder={isPending && isInitiator ? "Message request sent..." : "Type a message..."}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          onFocus={handleInputFocus}
          disabled={isPending && isInitiator}
        />
        <button
          type="button"
          className="chat-send-btn"
          onClick={handleSend}
          aria-label="Send"
          disabled={!input.trim()}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
