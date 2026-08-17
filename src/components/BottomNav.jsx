import React from 'react';
import { Layers, Trophy, PlusSquare, MessageSquare, User } from 'lucide-react';

export default function BottomNav({ activeTab = 'feed', onTabChange, hiddenOnMobile = false }) {
  const currentTab = activeTab || 'feed';
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
        return (
          <button
            key={tab.id}
            className={`nav-tab nav-item ${isActive ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <IconComponent size={22} strokeWidth={isActive ? 2.5 : 2} />
            <span>{tab.name}</span>
          </button>
        );
      })}
    </nav>
  );
}
