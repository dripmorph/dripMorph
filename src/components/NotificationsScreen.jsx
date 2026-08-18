import React, { useEffect } from 'react';
import { X, Bell, UserPlus, MessageSquare, Heart, MessageCircle, Trash2, CheckCheck } from 'lucide-react';
import { useNotifications, formatRelativeTime } from '../context/NotificationContext';

export default function NotificationsScreen({
  isOpen,
  onClose,
  onUserClick,
  onNavigateToChat,
  onFitClick
}) {
  const {
    notifications,
    unreadCount,
    markAllAsRead,
    clearAll
  } = useNotifications();

  // Automatically mark notifications as read when the user views the screen
  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      markAllAsRead();
    }
  }, [isOpen, unreadCount, markAllAsRead]);

  if (!isOpen) return null;

  const handleNotificationClick = (item) => {
    if (item.type === 'follow' && item.actorUsername && onUserClick) {
      onClose();
      onUserClick(item.actorUsername);
    } else if (item.type === 'message' && onNavigateToChat) {
      onClose();
      onNavigateToChat(item.actorUsername || 'chat');
    } else if (item.type === 'like' && item.data?.outfitId && onFitClick) {
      onClose();
      onFitClick({ id: item.data.outfitId });
    }
  };

  const getNotificationIcon = (item) => {
    if (item.actorAvatar) {
      return (
        <img
          src={item.actorAvatar}
          alt={item.actorUsername || 'User'}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            objectFit: 'cover',
            border: '1.5px solid rgba(166, 252, 41, 0.4)'
          }}
        />
      );
    }

    switch (item.type) {
      case 'follow':
        return (
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'rgba(168, 85, 247, 0.15)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#c084fc'
          }}>
            <UserPlus size={18} />
          </div>
        );
      case 'message':
        return (
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'rgba(166, 252, 41, 0.15)',
            border: '1px solid rgba(166, 252, 41, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#a6fc29'
          }}>
            <MessageSquare size={18} />
          </div>
        );
      case 'like':
        return (
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f87171'
          }}>
            <Heart size={18} />
          </div>
        );
      case 'comment':
        return (
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#38bdf8'
          }}>
            <MessageCircle size={18} />
          </div>
        );
      default:
        return (
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}>
            <Bell size={18} />
          </div>
        );
    }
  };

  return (
    <div className="stl-overlay" onClick={onClose}>
      <div 
        className="notifications-screen-content" 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '480px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div className="stl-drag-handle" />

        {/* Modal Top Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 0 16px 0',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div>
            <h2 className="stl-title" style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>
              Notifications
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                title="Clear all notifications"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#71717a',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  transition: 'color 0.15s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#71717a')}
              >
                <Trash2 size={15} />
                <span>Clear</span>
              </button>
            )}
            <button
              className="stl-close-btn"
              onClick={onClose}
              aria-label="Close"
              style={{ position: 'static', transform: 'none' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div 
          className="notifications-list" 
          style={{ 
            flex: 1, 
            overflowY: 'auto', 
            marginTop: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          {notifications.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '48px 16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#71717a'
              }}>
                <Bell size={26} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#ffffff' }}>
                  All caught up!
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#71717a' }}>
                  No new notifications.
                </p>
              </div>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                className={`notification-item ${item.unread ? 'unread' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '14px',
                  backgroundColor: item.unread ? 'rgba(166, 252, 41, 0.06)' : 'rgba(255, 255, 255, 0.03)',
                  border: item.unread ? '1px solid rgba(166, 252, 41, 0.25)' : '1px solid rgba(255, 255, 255, 0.06)',
                  cursor: (item.type === 'follow' || item.type === 'message' || item.type === 'like') ? 'pointer' : 'default',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ flexShrink: 0 }}>
                  {getNotificationIcon(item)}
                </div>

                <div className="notification-details" style={{ flex: 1, minWidth: 0 }}>
                  <p className="notification-text" style={{ margin: 0, fontSize: '13px', color: '#ffffff', wordBreak: 'break-word' }}>
                    {item.text}
                  </p>
                  <span className="notification-time" style={{ fontSize: '11px', color: '#71717a', marginTop: '2px', display: 'block' }}>
                    {formatRelativeTime(item.created_at)}
                  </span>
                </div>

                {item.unread && (
                  <span 
                    className="notification-unread-dot"
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#a6fc29',
                      boxShadow: '0 0 8px rgba(166, 252, 41, 0.6)',
                      flexShrink: 0
                    }} 
                  />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
