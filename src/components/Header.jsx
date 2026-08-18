import React from 'react';
import { Menu, Bell, MessageSquare } from 'lucide-react';
import DripMorphLogo from './DripMorphLogo';
import { useChat } from '../context/ChatContext';

export default function Header({ onMenuClick, onBellClick, hasNotifications, onTabChange }) {
  const { hasUnreadMessages } = useChat();

  return (
    <header className="app-header">
      <button className="header-btn" onClick={onMenuClick} aria-label="Menu">
        <Menu size={22} strokeWidth={2} />
      </button>
      <div
        className="brand-logo-badge"
        onClick={() => onTabChange && onTabChange('feed')}
        style={{ cursor: 'pointer' }}
        role="button"
        tabIndex={0}
        aria-label="Go to Home"
      >
        <DripMorphLogo size={24} />
        <span className="sidebar-brand-title">DRIPMORPH</span>
      </div>
      <button className="header-btn" onClick={onBellClick} aria-label="Notifications">
        <div style={{ position: 'relative' }}>
          <Bell size={22} strokeWidth={2} />
          {hasNotifications && (
            <span style={{
              position: 'absolute',
              top: '1px',
              right: '1px',
              width: '8px',
              height: '8px',
              backgroundColor: 'var(--accent-solid)',
              borderRadius: '50%',
              border: '1.5px solid var(--bg-color)'
            }} />
          )}
        </div>
      </button>
      <button className="header-btn" onClick={() => onTabChange('chat')} aria-label="Messages">
        <div style={{ position: 'relative' }}>
          <MessageSquare size={22} strokeWidth={2} />
          {hasUnreadMessages && (
            <span style={{
              position: 'absolute',
              top: '1px',
              right: '1px',
              width: '8px',
              height: '8px',
              backgroundColor: 'var(--accent-solid)',
              borderRadius: '50%',
              border: '1.5px solid var(--bg-color)'
            }} />
          )}
        </div>
      </button>
    </header>
  );
}
