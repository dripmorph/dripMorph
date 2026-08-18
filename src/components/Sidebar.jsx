import React from 'react';
import { Layers, Trophy, PlusSquare, MessageSquare, User, Sun, Moon, MapPin, Bell, LogOut, Settings } from 'lucide-react';
import DripMorphLogo from './DripMorphLogo';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';

{/* Robust Avatar Component with Initial Fallback */}
const renderAvatar = (avatarUrl, username) => {
  const initial = (username || 'R').replace(/^@/, '').charAt(0).toUpperCase() || 'R';
  const hasValidUrl = Boolean(avatarUrl && typeof avatarUrl === 'string' && !avatarUrl.includes('placeholder'));

  return (
    <div 
      style={{
        width: '36px',
        height: '36px',
        borderRadius: '9999px',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#18181b',
        border: '1px solid rgba(166, 252, 41, 0.6)',
        flexShrink: 0
      }}
    >
      {hasValidUrl ? (
        <img 
          src={avatarUrl} 
          alt={username || 'User'} 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            if (e.currentTarget.nextElementSibling) {
              e.currentTarget.nextElementSibling.style.display = 'flex';
            }
          }}
        />
      ) : null}
      <span 
        style={{
          display: hasValidUrl ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          fontSize: '14px',
          fontWeight: 'bold',
          color: '#a6fc29'
        }}
      >
        {initial}
      </span>
    </div>
  );
};

export default function Sidebar({ activeTab, onTabChange, theme, onToggleTheme, onBellClick, hasNotifications, onChangeCity, showToast, onOpenSettings }) {
  const { user, logout } = useAuth();
  const { hasUnreadMessages } = useChat();

  const navItems = [
    { id: 'feed', name: 'Feed', icon: Layers },
    { id: 'ranks', name: 'Leaderboard', icon: Trophy },
    { id: 'post', name: 'Post Outfit', icon: PlusSquare },
    { id: 'chat', name: 'Messages', icon: MessageSquare },
    { id: 'profile', name: 'My Profile', icon: User },
  ];

  return (
    <aside className="desktop-sidebar-left">
      {/* Logo Branding */}
      <div
        className="desktop-logo-wrapper"
        onClick={() => onTabChange && onTabChange('feed')}
        style={{ cursor: 'pointer' }}
        role="button"
        tabIndex={0}
        aria-label="Go to Home"
      >
        <div className="brand-logo-badge">
          <DripMorphLogo size={28} />
          <span className="sidebar-brand-title desktop-logo-title">DRIPMORPH</span>
        </div>
      </div>

      {/* Primary Navigation Links */}
      <nav className="desktop-nav-menu">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const showDot = item.id === 'chat' && hasUnreadMessages;
          return (
            <button
              key={item.id}
              className={`desktop-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onTabChange(item.id)}
            >
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                {showDot && <span className="desktop-notif-dot" />}
              </div>
              <span>{item.name}</span>
            </button>
          );
        })}
      </nav>

      <div className="desktop-sidebar-divider" />

      {/* Utilities Section */}
      <div className="desktop-utility-section">
        {user?.city && (
          <button className="desktop-utility-btn" onClick={onChangeCity}>
            <MapPin size={18} className="utility-icon" />
            <div className="utility-text-col">
              <span className="utility-label">CITY</span>
              <span className="utility-val">{user.city}</span>
            </div>
          </button>
        )}

        <button className="desktop-utility-btn" onClick={onBellClick}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Bell size={18} className="utility-icon" />
            {hasNotifications && <span className="desktop-notif-dot" />}
          </div>
          <span>Notifications</span>
        </button>

        {onOpenSettings && (
          <button className="desktop-utility-btn" onClick={onOpenSettings}>
            <Settings size={18} className="utility-icon" />
            <span>Settings</span>
          </button>
        )}

        <button className="desktop-utility-btn" onClick={onToggleTheme}>
          {theme === 'dark' ? <Sun size={18} className="utility-icon" /> : <Moon size={18} className="utility-icon" />}
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </div>

      {/* User Profile Card at bottom */}
      {user && (
        <div className="desktop-user-footer">
          <div className="desktop-user-info" onClick={() => onTabChange('profile')}>
            {renderAvatar(user.avatar || user.avatar_url, user.username, 'w-9 h-9', 'text-sm')}
            <div className="desktop-user-meta">
              <span className="desktop-user-name">{(user.username || 'minimalist_enzo').replace(/^@/, '')}</span>
              <span className="desktop-user-sub">{user.city || 'Verified Stylist'}</span>
            </div>
          </div>
          <button 
            className="desktop-logout-btn" 
            onClick={() => {
              logout();
              if (showToast) showToast("Logged out successfully.");
            }}
            aria-label="Log out"
          >
            <LogOut size={16} />
          </button>
        </div>
      )}
    </aside>
  );
}
