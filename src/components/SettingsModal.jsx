import React, { useState, useEffect } from 'react';
import { ArrowLeft, X, User, Shield, Bell, Lock, CheckCircle2, ChevronRight, Sliders, Globe, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ChangePasswordModal from './ChangePasswordModal';
import DeleteAccountModal from './DeleteAccountModal';

export default function SettingsModal({ isOpen, onClose, showToast, onProfileUpdate }) {
  const { user, updateUsername, updateProfileDetails, updateCity } = useAuth();

  // Local settings state initialized from user/defaults
  const [username, setUsername] = useState('');
  const [instagram, setInstagram] = useState('');
  const [primaryCity, setPrimaryCity] = useState('Kolkata');
  
  const [usernameError, setUsernameError] = useState('');
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [isSavingInstagram, setIsSavingInstagram] = useState(false);

  // Sync state when user profile changes or modal opens
  useEffect(() => {
    if (user) {
      const rawUserUname = user.username ? user.username.replace(/^@/, '') : '';
      setUsername(rawUserUname);
      setInstagram(user.instagramLink || user.instagram || '');
      setPrimaryCity(user.city || 'Kolkata');
    }
  }, [user, isOpen]);

  // Notification Toggles
  const [leaderboardAlerts, setLeaderboardAlerts] = useState(true);
  const [likeCommentAlerts, setLikeCommentAlerts] = useState(true);

  // Modals inside settings
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Delete Account Modal state
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);

  if (!isOpen) return null;

  const handleSaveUsername = async () => {
    const clean = username.trim().replace(/^@/, '');
    
    // Client-side validation
    if (!clean) {
      const msg = 'Username cannot be empty.';
      setUsernameError(msg);
      if (showToast) showToast(msg);
      return;
    }
    if (clean.length < 3) {
      const msg = 'Username must be at least 3 characters long.';
      setUsernameError(msg);
      if (showToast) showToast(msg);
      return;
    }
    if (clean.length > 30) {
      const msg = 'Username must be 30 characters or less.';
      setUsernameError(msg);
      if (showToast) showToast(msg);
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
      const msg = 'Username can only contain letters, numbers, and underscores.';
      setUsernameError(msg);
      if (showToast) showToast(msg);
      return;
    }

    setIsSavingUsername(true);
    setUsernameError('');

    try {
      await updateUsername(clean);
      if (showToast) {
        showToast('Username updated successfully!');
      }
      if (onProfileUpdate) {
        onProfileUpdate();
      }
    } catch (err) {
      const errorMsg = err.message || 'Failed to update username.';
      setUsernameError(errorMsg);
      if (showToast) {
        showToast(errorMsg);
      }
    } finally {
      setIsSavingUsername(false);
    }
  };

  const handleSaveInstagram = async () => {
    setIsSavingInstagram(true);
    const cleanIg = instagram.trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/$/, '');
    const finalIg = cleanIg ? `@${cleanIg}` : '';
    try {
      if (updateProfileDetails) {
        await updateProfileDetails({ instagramLink: finalIg });
      }
      setInstagram(finalIg);
      if (showToast) {
        showToast(finalIg ? `Linked Instagram saved: ${finalIg}` : 'Instagram handle removed.');
      }
      if (onProfileUpdate) {
        onProfileUpdate();
      }
    } catch (err) {
      if (showToast) {
        showToast(err.message || 'Failed to save Instagram handle.');
      }
    } finally {
      setIsSavingInstagram(false);
    }
  };

  const handleCityChange = async (e) => {
    const newCity = e.target.value;
    setPrimaryCity(newCity);
    try {
      if (updateCity) {
        await updateCity(newCity);
      }
      if (showToast) {
        showToast(`Primary city updated to ${newCity}`);
      }
      if (onProfileUpdate) {
        onProfileUpdate();
      }
    } catch (err) {
      if (showToast) {
        showToast(err.message || 'Failed to update city');
      }
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      if (showToast) showToast('Please enter both current and new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      if (showToast) showToast('Passwords do not match.');
      return;
    }
    setShowPasswordForm(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    if (showToast) showToast('Password updated successfully.');
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Top Header with Back button */}
        <div className="settings-modal-header">
          <button className="settings-back-btn" onClick={onClose} aria-label="Go Back">
            <ArrowLeft size={20} />
            <span>Settings</span>
          </button>
          <button className="settings-close-btn" onClick={onClose} aria-label="Close settings">
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="settings-modal-body">
          {/* Section 1: Account & Profile */}
          <div className="settings-section-card">
            <div className="settings-section-title">
              <User size={16} />
              <span>Account & Profile</span>
            </div>

            {/* Username Row */}
            <div className="settings-item-row" style={{ flexWrap: 'wrap', gap: '10px' }}>
              <div className="settings-item-info">
                <span className="settings-item-label">Username</span>
                <span className="settings-item-sub">Your public handle on DripMorph</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexGrow: 1, justifyContent: 'flex-end' }}>
                <input
                  type="text"
                  className="settings-input"
                  style={{
                    borderColor: usernameError ? '#ff4d4d' : undefined,
                    outlineColor: usernameError ? '#ff4d4d' : undefined
                  }}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (usernameError) setUsernameError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveUsername();
                  }}
                  disabled={isSavingUsername}
                  placeholder="username"
                />
                <button
                  className="settings-action-btn"
                  onClick={handleSaveUsername}
                  disabled={isSavingUsername}
                  style={{ minWidth: '60px' }}
                >
                  {isSavingUsername ? 'Saving...' : 'Save'}
                </button>
              </div>
              {usernameError && (
                <div style={{ width: '100%', color: '#ff4d4d', fontSize: '0.8rem', fontWeight: '600', marginTop: '-2px' }}>
                  {usernameError}
                </div>
              )}
            </div>

            {/* Email Address Row */}
            <div className="settings-item-row">
              <div className="settings-item-info">
                <span className="settings-item-label">Email Address</span>
                <span className="settings-item-sub">{user?.email || 'stylist@dripmorph.com'}</span>
              </div>
              <span className="settings-badge-verified">
                <CheckCircle2 size={13} /> Verified
              </span>
            </div>

            {/* Instagram Handle Row */}
            <div className="settings-item-row" style={{ flexWrap: 'wrap', gap: '10px' }}>
              <div className="settings-item-info">
                <span className="settings-item-label">Linked Instagram</span>
                <span className="settings-item-sub">Show on your stylist card</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexGrow: 1, justifyContent: 'flex-end' }}>
                <input
                  type="text"
                  className="settings-input"
                  value={instagram}
                  placeholder="@instagram"
                  onChange={(e) => setInstagram(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveInstagram();
                  }}
                  disabled={isSavingInstagram}
                />
                <button
                  className="settings-action-btn"
                  onClick={handleSaveInstagram}
                  disabled={isSavingInstagram}
                  style={{ minWidth: '60px' }}
                >
                  {isSavingInstagram ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>

            {/* Change Password Row */}
            <div className="settings-item-row">
              <div className="settings-item-info">
                <span className="settings-item-label">Password & Security</span>
                <span className="settings-item-sub">Update your security credentials</span>
              </div>
              <button
                className="settings-action-btn"
                onClick={() => setShowPasswordForm(true)}
              >
                Change Password
              </button>
            </div>

            {/* Change Password Modal */}
            <ChangePasswordModal
              isOpen={showPasswordForm}
              onClose={() => setShowPasswordForm(false)}
              showToast={showToast}
            />
          </div>

          {/* Section 2: Regional & Feed Preferences */}
          <div className="settings-section-card">
            <div className="settings-section-title">
              <Globe size={16} />
              <span>Regional & Feed Preferences</span>
            </div>

            {/* Primary City Selector */}
            <div className="settings-item-row">
              <div className="settings-item-info">
                <span className="settings-item-label">Default Primary City</span>
                <span className="settings-item-sub">Filters local feed & leaderboard fits</span>
              </div>
              <select
                className="settings-select"
                value={primaryCity}
                onChange={handleCityChange}
              >
                <option value="Kolkata">Kolkata</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Delhi NCR">Delhi NCR</option>
                <option value="Bangalore">Bangalore</option>
              </select>
            </div>
          </div>

          {/* Section 3: Push Notifications */}
          <div className="settings-section-card">
            <div className="settings-section-title">
              <Bell size={16} />
              <span>Push Notifications</span>
            </div>

            {/* Weekly Leaderboard Reset Alerts */}
            <div className="settings-item-row">
              <div className="settings-item-info">
                <span className="settings-item-label">Weekly Leaderboard Reset Alerts</span>
                <span className="settings-item-sub">Notify when new weekly rankings drop</span>
              </div>
              <label className="settings-toggle-switch">
                <input
                  type="checkbox"
                  checked={leaderboardAlerts}
                  onChange={(e) => {
                    setLeaderboardAlerts(e.target.checked);
                    if (showToast) showToast(e.target.checked ? 'Leaderboard alerts enabled' : 'Leaderboard alerts disabled');
                  }}
                />
                <span className="settings-toggle-slider" />
              </label>
            </div>

            {/* Outfit Likes & Comment Alerts */}
            <div className="settings-item-row">
              <div className="settings-item-info">
                <span className="settings-item-label">Outfit Likes & Comment Alerts</span>
                <span className="settings-item-sub">Get notified when someone interacts with your fits</span>
              </div>
              <label className="settings-toggle-switch">
                <input
                  type="checkbox"
                  checked={likeCommentAlerts}
                  onChange={(e) => {
                    setLikeCommentAlerts(e.target.checked);
                    if (showToast) showToast(e.target.checked ? 'Likes & comment alerts enabled' : 'Likes & comment alerts disabled');
                  }}
                />
                <span className="settings-toggle-slider" />
              </label>
            </div>
          </div>

          {/* Section 4: Safety & Legal */}
          <div className="settings-section-card">
            <div className="settings-section-title">
              <Shield size={16} />
              <span>Safety & Legal</span>
            </div>

            {/* Privacy Policy */}
            <div className="settings-item-row">
              <div className="settings-item-info">
                <span className="settings-item-label">Privacy Policy</span>
                <span className="settings-item-sub">How we handle your style & profile data</span>
              </div>
              <button
                className="settings-action-btn"
                onClick={() => showToast && showToast('Opening Privacy Policy...')}
              >
                View
              </button>
            </div>

            {/* Terms of Service */}
            <div className="settings-item-row">
              <div className="settings-item-info">
                <span className="settings-item-label">Terms of Service</span>
                <span className="settings-item-sub">Community guidelines & usage terms</span>
              </div>
              <button
                className="settings-action-btn"
                onClick={() => showToast && showToast('Opening Terms of Service...')}
              >
                View
              </button>
            </div>
          </div>

          {/* Danger Zone Section */}
          <div className="settings-section-card danger-zone">
            <div className="settings-section-title danger">
              <AlertTriangle size={16} />
              <span>Danger Zone</span>
            </div>

            <div className="settings-item-row">
              <div className="settings-item-info">
                <span className="settings-item-label danger">Delete Account</span>
                <span className="settings-item-sub">Permanently erase your account and all associated data</span>
              </div>
              <button
                className="settings-action-btn danger"
                onClick={() => setShowDeleteAccountModal(true)}
              >
                Delete Account
              </button>
            </div>
          </div>

          {/* Delete Account Modal */}
          <DeleteAccountModal
            isOpen={showDeleteAccountModal}
            onClose={() => setShowDeleteAccountModal(false)}
            showToast={showToast}
          />

          {/* App Version Badge */}
          <div className="settings-version-badge">
            DripMorph v1.0.0
          </div>
        </div>
      </div>
    </div>
  );
}
