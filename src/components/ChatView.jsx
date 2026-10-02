import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Send, MessageSquare, Loader, MoreVertical, Trash2 } from 'lucide-react';
import {
  FaFaceSmile,
  FaFaceGrinSquintTears,
  FaFaceGrinHearts,
  FaFaceSmileBeam,
  FaFaceGrinStars,
  FaFaceSadTear,
  FaFaceAngry,
  FaFaceSurprise,
  FaFaceKissWinkHeart,
  FaFaceLaughSquint,
  FaFaceFlushed,
  FaFaceGrimace,
  FaFire,
  FaHeart,
  FaCrown,
  FaSkull,
  FaThumbsUp,
  FaThumbsDown,
  FaHandsClapping,
  FaHandPeace,
  FaHandshake,
  FaHandFist,
  FaHandPointUp,
  FaBolt,
  FaStar,
  FaMoon,
  FaSun,
  FaGhost,
  FaPoo,
  FaEye,
  FaDroplet,
  FaExplosion,
  FaTrophy,
  FaMedal,
  FaGem,
  FaWandMagicSparkles,
} from 'react-icons/fa6';
import { BsEmojiSmileFill } from 'react-icons/bs';

// React Icons Emoji Collection for the Messages tab
const REACT_ICONS_EMOJIS = [
  // Reactions & Vibes
  { char: '🔥', label: 'Fire', Icon: FaFire, color: '#f97316' },
  { char: '❤️', label: 'Heart', Icon: FaHeart, color: '#ef4444' },
  { char: '✨', label: 'Sparkles', Icon: FaWandMagicSparkles, color: '#eab308' },
  { char: '👑', label: 'Crown', Icon: FaCrown, color: '#f59e0b' },
  { char: '💀', label: 'Skull', Icon: FaSkull, color: '#cbd5e1' },
  { char: '⚡', label: 'Lightning', Icon: FaBolt, color: '#eab308' },
  { char: '💎', label: 'Gem', Icon: FaGem, color: '#38bdf8' },
  { char: '🏆', label: 'Trophy', Icon: FaTrophy, color: '#f59e0b' },
  
  // Faces & Emotions
  { char: '😂', label: 'Laughing', Icon: FaFaceGrinSquintTears, color: '#facc15' },
  { char: '😍', label: 'Heart Eyes', Icon: FaFaceGrinHearts, color: '#f43f5e' },
  { char: '😎', label: 'Cool', Icon: FaFaceSmileBeam, color: '#38bdf8' },
  { char: '🤩', label: 'Star Eyes', Icon: FaFaceGrinStars, color: '#fbbf24' },
  { char: '😘', label: 'Kiss', Icon: FaFaceKissWinkHeart, color: '#fb7185' },
  { char: '😆', label: 'Grin', Icon: FaFaceLaughSquint, color: '#facc15' },
  { char: '😀', label: 'Smile', Icon: FaFaceSmile, color: '#facc15' },
  { char: '😬', label: 'Grimace', Icon: FaFaceGrimace, color: '#94a3b8' },
  { char: '😳', label: 'Flushed', Icon: FaFaceFlushed, color: '#fb923c' },
  { char: '😭', label: 'Crying', Icon: FaFaceSadTear, color: '#60a5fa' },
  { char: '😤', label: 'Angry', Icon: FaFaceAngry, color: '#f87171' },
  { char: '😮', label: 'Surprise', Icon: FaFaceSurprise, color: '#fb923c' },

  // Gestures & Hands
  { char: '👍', label: 'Thumbs Up', Icon: FaThumbsUp, color: '#3b82f6' },
  { char: '👎', label: 'Thumbs Down', Icon: FaThumbsDown, color: '#64748b' },
  { char: '👏', label: 'Clap', Icon: FaHandsClapping, color: '#f59e0b' },
  { char: '🤝', label: 'Handshake', Icon: FaHandshake, color: '#10b981' },
  { char: '✌️', label: 'Peace', Icon: FaHandPeace, color: '#ec4899' },
  { char: '👊', label: 'Fist', Icon: FaHandFist, color: '#f97316' },
  { char: '👆', label: 'Point Up', Icon: FaHandPointUp, color: '#3b82f6' },

  // Fun & Atmosphere
  { char: '👀', label: 'Eyes', Icon: FaEye, color: '#94a3b8' },
  { char: '👻', label: 'Ghost', Icon: FaGhost, color: '#e2e8f0' },
  { char: '💩', label: 'Poo', Icon: FaPoo, color: '#a16207' },
  { char: '💥', label: 'Explosion', Icon: FaExplosion, color: '#ef4444' },
  { char: '⭐', label: 'Star', Icon: FaStar, color: '#facc15' },
  { char: '🌙', label: 'Moon', Icon: FaMoon, color: '#93c5fd' },
  { char: '☀️', label: 'Sun', Icon: FaSun, color: '#fbbf24' },
  { char: '💧', label: 'Droplet', Icon: FaDroplet, color: '#38bdf8' },
  { char: '🥇', label: 'Medal', Icon: FaMedal, color: '#eab308' },
];

function formatMessageDateDivider(dateString) {
  if (!dateString) return 'Today';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Today';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const messageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  const diffDays = Math.round((today - messageDay) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
  });
}

function getDateKey(dateString) {
  if (!dateString) return 'today';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return 'today';
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export default function ChatView({ onBack, onUserClick }) {
  const {
    conversations = [],
    activeChatId,
    sendMessage,
    deleteChatMessages,
    loadingMessages,
    acceptConversation,
    declineConversation,
  } = useChat() || {};
  const { user } = useAuth() || {};

  const convList = Array.isArray(conversations) ? conversations : [];
  const conv = convList.find(c => c?.id === activeChatId);
  const [input, setInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const chatContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const optionsMenuRef = useRef(null);
  const prevMsgCountRef = useRef(0);
  const prevChatIdRef = useRef(null);

  const scrollToBottom = (smooth = false) => {
    const container = chatContainerRef.current;
    if (container) {
      if (smooth) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      } else {
        container.scrollTop = container.scrollHeight;
      }
    }
    if (messagesEndRef.current) {
      try {
        messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'end' });
      } catch (e) {
        // fallback
      }
    }
  };

  // Scroll to bottom whenever messages load, change, or when switching chats
  useEffect(() => {
    const currentMsgCount = conv?.messages?.length || 0;
    const isNewChat = prevChatIdRef.current !== activeChatId;
    const hasNewMessage = currentMsgCount > prevMsgCountRef.current;

    if (isNewChat) {
      // Immediate snap to bottom on chat open / switch
      scrollToBottom(false);
      const raf1 = requestAnimationFrame(() => scrollToBottom(false));
      const t1 = setTimeout(() => scrollToBottom(false), 50);
      const t2 = setTimeout(() => scrollToBottom(false), 200);

      prevChatIdRef.current = activeChatId;
      prevMsgCountRef.current = currentMsgCount;

      return () => {
        cancelAnimationFrame(raf1);
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }

    if (!loadingMessages && currentMsgCount > 0) {
      if (hasNewMessage && prevMsgCountRef.current > 0) {
        // Smooth scroll when a new message is appended to existing chat
        scrollToBottom(true);
      } else {
        // Initial load of messages for the active chat
        scrollToBottom(false);
        const raf = requestAnimationFrame(() => scrollToBottom(false));
        const t = setTimeout(() => scrollToBottom(false), 60);
        return () => {
          cancelAnimationFrame(raf);
          clearTimeout(t);
        };
      }
    }

    prevMsgCountRef.current = currentMsgCount;
  }, [conv?.messages, activeChatId, loadingMessages]);

  // Keep scrolled to bottom when container resizes or becomes visible
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleResize = () => {
      if (container.clientHeight > 0 && (conv?.messages?.length || 0) > 0) {
        scrollToBottom(false);
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [activeChatId, conv?.messages?.length]);

  // Close emoji picker and options dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(e.target)) {
        setShowOptionsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // When keyboard opens on mobile, scroll input into view
  const handleInputFocus = () => {
    setShowEmojiPicker(false);
    setTimeout(() => {
      scrollToBottom(true);
      textInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 350);
  };

  const handleSend = () => {
    if (!input.trim() || !activeChatId || !sendMessage) return;
    sendMessage(activeChatId, input.trim(), 'text');
    setInput('');
    setShowEmojiPicker(false);
  };

  const handleEmojiClick = (emoji) => {
    setInput(prev => prev + emoji);
    textInputRef.current?.focus();
  };

  const handleDeleteChat = () => {
    if (deleteChatMessages && activeChatId) {
      deleteChatMessages(activeChatId);
    }
    setShowOptionsMenu(false);
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

  const userObj = conv.user || {};
  const convUsername = (userObj.username || 'user').replace(/^@/, '');
  const convAvatar = userObj.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&h=240&fit=crop';
  const isPending = conv.status === 'pending';
  const isRecipient = user && userObj.id === user.id;
  const isInitiator = !isRecipient;
  const msgList = Array.isArray(conv.messages) ? conv.messages : [];

  return (
    <div className="chat-view">
      {/* Header */}
      <div className="chat-header">
        <button className="chat-back-btn" onClick={onBack} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <div 
          className="chat-header-user-info"
          onClick={() => onUserClick && onUserClick(convUsername)}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
          title={`View ${convUsername}'s profile`}
        >
          <div className="chat-header-avatar-wrapper">
            <img
              src={convAvatar}
              alt={convUsername}
              className="chat-header-avatar"
              onError={(e) => {
                e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&h=240&fit=crop';
              }}
            />
          </div>
          <div className="chat-header-meta">
            <span className="chat-header-username">{convUsername}</span>
          </div>
        </div>

        {/* Right side Settings / Options Menu */}
        <div className="chat-header-actions" ref={optionsMenuRef} style={{ marginLeft: 'auto', position: 'relative' }}>
          <button
            type="button"
            className="chat-options-btn"
            onClick={() => setShowOptionsMenu(prev => !prev)}
            aria-label="Chat options"
            style={{
              background: 'none',
              border: 'none',
              color: showOptionsMenu ? '#a6fc29' : '#9ca3af',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = showOptionsMenu ? '#a6fc29' : '#9ca3af'; e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <MoreVertical size={20} />
          </button>

          {showOptionsMenu && (
            <div
              className="chat-options-dropdown"
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 6px)',
                backgroundColor: '#1c1c1e',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '12px',
                padding: '4px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                zIndex: 100,
                minWidth: '150px'
              }}
            >
              <button
                type="button"
                onClick={handleDeleteChat}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#ef4444',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Trash2 size={16} />
                <span>Delete Chat</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Pending request banner */}
      {isPending && isRecipient && (
        <div className="chat-request-banner">
          <span>Do you want to chat with {convUsername}?</span>
          <div className="chat-request-actions">
            <button
              className="btn-accept-chat"
              onClick={() => acceptConversation && acceptConversation(activeChatId)}
            >
              Accept
            </button>
            <button
              className="btn-decline-chat"
              onClick={() => declineConversation && declineConversation(activeChatId)}
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* Messages Feed */}
      <div className="chat-messages" ref={chatContainerRef}>
        {loadingMessages ? (
          <div className="chat-loading">
            <Loader size={24} className="chat-loading-spinner" />
          </div>
        ) : msgList.length === 0 ? (
          <div className="chat-no-messages">
            <img
              src={convAvatar}
              alt={convUsername}
              className="chat-no-messages-avatar"
              onError={(e) => {
                e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&h=240&fit=crop';
              }}
            />
            <h4>Say hi to {convUsername}!</h4>
            <p>Start the conversation with a message.</p>
          </div>
        ) : (
          (() => {
            let lastDateKey = null;
            return msgList.map((msg, index) => {
              if (!msg) return null;
              const isSent = user
                ? msg.sender_id === user.id || msg.sender === user.username
                : false;

              const ts = msg.created_at || msg.timestamp;
              const timeStr = ts
                ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';

              const currentDateKey = getDateKey(ts);
              const showDateDivider = currentDateKey !== lastDateKey;
              lastDateKey = currentDateKey;
              const dateDividerText = showDateDivider ? formatMessageDateDivider(ts) : null;

              return (
                <React.Fragment key={msg.id || `msg-${index}-${ts}`}>
                  {showDateDivider && (
                    <div className="chat-date-divider-wrapper" style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      width: '100%',
                      margin: '18px 0 12px 0'
                    }}>
                      <span className="chat-date-divider-pill" style={{
                        backgroundColor: 'rgba(30, 32, 34, 0.9)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#d4d4d8',
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '4px 14px',
                        borderRadius: '9999px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.35)',
                        letterSpacing: '0.03em',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)'
                      }}>
                        {dateDividerText}
                      </span>
                    </div>
                  )}
                  <div
                    className={`chat-bubble-wrapper ${isSent ? 'sent-wrapper' : 'received-wrapper'}`}
                  >
                    <div className={`chat-bubble ${isSent ? 'sent' : 'received'}`}>
                      {msg.type === 'image' ? (
                        <img 
                          src={msg.content} 
                          alt="Sent image" 
                          className="chat-image" 
                          onLoad={() => scrollToBottom(false)}
                        />
                      ) : (
                        <span>{msg.content}</span>
                      )}
                    </div>
                    {timeStr && (
                      <span className="chat-bubble-timestamp">{timeStr}</span>
                    )}
                  </div>
                </React.Fragment>
              );
            });
          })()
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* React Icons Emoji Picker */}
      {showEmojiPicker && (
        <div className="emoji-picker" ref={emojiPickerRef}>
          <div className="emoji-picker-header">
            <span className="emoji-picker-title">REACT EMOJIS</span>
            <span className="emoji-picker-count">{REACT_ICONS_EMOJIS.length} icons</span>
          </div>
          <div className="emoji-picker-grid">
            {REACT_ICONS_EMOJIS.map(({ char, label, Icon, color }) => (
              <button
                key={char + label}
                className="emoji-btn react-icon-emoji-btn"
                onClick={() => handleEmojiClick(char)}
                type="button"
                title={label}
                aria-label={label}
              >
                <Icon size={20} color={color} className="react-emoji-icon" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Bar */}
      <div className="chat-input-bar">
        <button
          type="button"
          className={`chat-action-btn${showEmojiPicker ? ' active' : ''}`}
          aria-label="Emoji"
          onClick={() => setShowEmojiPicker(v => !v)}
        >
          <BsEmojiSmileFill size={20} />
        </button>
        <input
          ref={textInputRef}
          type="text"
          inputMode="text"
          className="chat-text-input"
          placeholder={
            isPending && isInitiator ? 'Message request sent...' : 'Type a message...'
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
