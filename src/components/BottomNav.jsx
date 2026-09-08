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
    <nav
      className={`app-bottom-nav bottom-nav-dock${hiddenOnMobile ? ' nav-hidden-mobile' : ''}`}
      aria-label="Navigation Dock"
    >
      {tabs.map((tab) => {
        const IconComponent = tab.icon;
        const isActive = currentTab === tab.id;
        const showDot = tab.id === 'chat' && hasUnreadMessages;
        return (
          <button
            key={tab.id}
            className={`nav-tab nav-item ${isActive ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
            aria-label={tab.name}
            title={tab.name}
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconComponent size={22} strokeWidth={isActive ? 2.5 : 2} />
              {showDot && (
                <span style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#EF4444',
                  borderRadius: '50%',
                  border: '1.5px solid currentColor'
                }} />
              )}
            </div>
          </button>
        );
      })}
    </nav>
  );
}
