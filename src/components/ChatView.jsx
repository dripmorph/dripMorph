import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Send, Image, Smile, MessageSquare, Loader } from 'lucide-react';

export default function ChatView({ onBack }) {
  const {
    conversations,
    activeChatId,
    sendMessage,
    loadingMessages,
    acceptConversation,
    declineConversation,
  } = useChat();
  const { user } = useAuth();

  const conv = conversations.find(c => c.id === activeChatId);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textInputRef = useRef(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conv?.messages]);

  // When keyboard opens on mobile, scroll input into view
  const handleInputFocus = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      textInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 350);
  };

  const handleSend = () => {
    if (!input.trim() || !activeChatId) return;
    sendMessage(activeChatId, input.trim(), 'text');
    setInput('');
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file && activeChatId) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        sendMessage(activeChatId, uploadEvent.target.result, 'image');
      };
      reader.readAsDataURL(file);
    }
  };

  // ── Empty state when no conversation is selected ───────────────────────────
  if (!conv) {
    return (
      <div className="chat-view chat-empty-container">
        <div className="chat-empty-state">
          <div className="chat-empty-icon-wrapper">
            <MessageSquare size={36} className="chat-empty-icon" />
          </div>
          <h3 className="chat-empty-title">Your Messages</h3>
          <p className="chat-empty-subtitle">
            Select a conversation from the list to start messaging
          </p>
        </div>
      </div>
    );
  }

  const isPending = conv.status === 'pending';
  const isRecipient = user && conv.user.id === user.id;
  const isInitiator = !isRecipient;

  return (
    <div className="chat-view">
      {/* Header */}
      <div className="chat-header">
        <button className="chat-back-btn" onClick={onBack} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <div className="chat-header-user-info">
          <div className="chat-header-avatar-wrapper">
            <img
              src={conv.user.avatar}
              alt={conv.user.username}
              className="chat-header-avatar"
            />
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
            <button
              className="btn-accept-chat"
              onClick={() => acceptConversation(activeChatId)}
            >
              Accept
            </button>
            <button
              className="btn-decline-chat"
              onClick={() => declineConversation(activeChatId)}
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* Messages Feed */}
      <div className="chat-messages">
        {loadingMessages ? (
          <div className="chat-loading">
            <Loader size={24} className="chat-loading-spinner" />
          </div>
        ) : conv.messages.length === 0 ? (
          <div className="chat-no-messages">
            <img
              src={conv.user.avatar}
              alt={conv.user.username}
              className="chat-no-messages-avatar"
            />
            <h4>Say hi to {conv.user.username}!</h4>
            <p>Start the conversation with a message or fit check.</p>
          </div>
        ) : (
          conv.messages.map(msg => {
            // Support both new Supabase format (sender_id) and legacy format (sender)
            const isSent = user
              ? msg.sender_id === user.id || msg.sender === user.username
              : false;

            const ts = msg.created_at || msg.timestamp;
            const timeStr = ts
              ? new Date(ts).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '';

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
                {timeStr && (
                  <span className="chat-bubble-timestamp">{timeStr}</span>
                )}
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
          placeholder={
            isPending && isInitiator
              ? 'Message request sent...'
              : 'Type a message...'
          }
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
