import React from 'react';
import UserProfile from './UserProfile';
import { useAuth } from '../context/AuthContext';

export default function Profile(props) {
  const { user: currentUser } = useAuth();
  
  // Determine if viewing own profile or another creator's profile
  const targetUsername = props.username;
  const currentUsername = currentUser?.username 
    ? currentUser.username.replace(/^@/, '')
    : 'minimalist_enzo';
  
  const isSelf = !targetUsername || targetUsername === currentUsername || targetUsername === currentUser?.username;

  return (
    <UserProfile
      {...props}
      username={isSelf ? currentUsername : (targetUsername ? targetUsername.replace(/^@/, '') : 'creator')}
      isOwnProfile={isSelf}
    />
  );
}

export const ProfileScreen = Profile;
