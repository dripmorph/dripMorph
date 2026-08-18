import React from 'react';
import { Layers, Trophy, PlusSquare, MessageSquare, User } from 'lucide-react';
import { useChat } from '../context/ChatContext';

export default function BottomNav({ activeTab = 'feed', onTabChange, hiddenOnMobile = false }) {
  const currentTab = activeTab || 'feed';
  const { hasUnreadMessages } = useChat();

  const tabs = [
    { id: 'feed', name: 'Feed', icon: Layers },
    { id: 'ranks', name: 'Ranks', icon: Trophy },
    { id: 'post', name: 'Post', icon: PlusSquare },
    { id: 'chat', name: 'Chat', icon: MessageSquare },
    { id: 'profile', name: 'Profile', icon: User },
  ];

  return (
    <nav className={`app-bottom-nav bottom-nav-dock${hiddenOnMobile ? ' nav-hidden-mobile' : ''}`}>
      {tabs.map((tab) => {
        const IconComponent = tab.icon;
        const isActive = currentTab === tab.id;
        const showDot = tab.id === 'chat' && hasUnreadMessages;
        return (
          <button
            key={tab.id}
            className={`nav-tab nav-item ${isActive ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconComponent size={22} strokeWidth={isActive ? 2.5 : 2} />
              {showDot && (
                <span style={{
                  position: 'absolute',
                  top: '-1px',
                  right: '-3px',
                  width: '8px',
                  height: '8px',
                  backgroundColor: 'var(--accent-solid, #a6fc29)',
                  borderRadius: '50%',
                  border: '1.5px solid var(--bg-color, #09090b)'
                }} />
              )}
            </div>
            <span>{tab.name}</span>
          </button>
        );
      })}
    </nav>
  );
}
