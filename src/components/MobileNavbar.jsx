import React from 'react';
import BottomNav from './BottomNav';

export default function MobileNavbar({ activeTab = 'feed', onTabChange }) {
  return <BottomNav activeTab={activeTab || 'feed'} onTabChange={onTabChange} />;
}
