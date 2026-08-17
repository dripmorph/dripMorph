import React, { useState, useRef } from 'react';
import { Camera, Ruler, AtSign, ArrowRight, Check, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const GENDER_OPTIONS = [
  'Male',
  'Female',
  'Non-Binary',
  'Prefer not to say'
];

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&h=240&fit=crop';

export default function ProfileDetailsScreen({ onFinishOnboarding, onSkip }) {
  const { user, updateProfileDetails } = useAuth();
  const fileInputRef = useRef(null);

  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || DEFAULT_AVATAR);
  const [avatarError, setAvatarError] = useState(false);
  const [height, setHeight] = useState(user?.height || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [instagramLink, setInstagramLink] = useState(user?.instagramLink || '');
  const [error, setError] = useState('');

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatarUrl(url);
      setAvatarError(false);
      if (error === 'Please upload a profile photo to continue') {
        setError('');
      }
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const finalAvatar = avatarUrl || user?.avatar || DEFAULT_AVATAR;
      await updateProfileDetails({
        avatar: finalAvatar,
        height: height.trim(),
        gender: gender,
        instagramLink: instagramLink.trim(),
        hasCompletedOnboarding: true
      });
      onFinishOnboarding();
    } catch (err) {
      setError(err.message || 'Could not save profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-screen profile-details-screen">
      <div className="auth-card profile-details-card">
        {/* Step Indicator */}
        <div className="onboarding-step-badge">
          <Sparkles size={14} />
          <span>STEP 3 OF 3 • OPTIONAL</span>
        </div>

        <div className="auth-header" style={{ textAlign: 'center' }}>
          <h2 className="auth-title">Customize Your Profile</h2>
          <p className="auth-subtitle">
            Add your stats and social link so others can connect with you. You can always fill these in later from your profile settings.
          </p>
        </div>

        {error && (
          <div className="auth-error-banner">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="auth-form">
          {/* Avatar Upload Preview */}
          <div className="pfp-upload-section">
            <div 
              className={`pfp-avatar-container ${avatarError ? 'has-error' : ''}`}
              style={avatarError ? { border: '2px solid #ff4d4d', boxShadow: '0 0 12px rgba(255, 77, 77, 0.4)' } : {}}
              onClick={handleAvatarClick}
            >
              <img src={avatarUrl || DEFAULT_AVATAR} alt="Avatar Preview" className="pfp-avatar-img" />
              <div className="pfp-camera-overlay">
                <Camera size={18} />
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="pfp-upload-btn"
              onClick={handleAvatarClick}
            >
              Upload Photo
            </button>
            {avatarError && (
              <span className="pfp-error-text" style={{ color: '#ff4d4d', fontSize: '13px', marginTop: '6px', display: 'block', fontWeight: '500' }}>
                Please upload a profile photo to continue
              </span>
            )}
          </div>

          {/* Height Field */}
          <div className="auth-field-group">
            <label className="auth-label">Height</label>
            <div className="auth-input-wrapper">
              <Ruler size={18} className="auth-input-icon" />
              <input
                type="text"
                className="auth-input"
                placeholder="e.g. 178 cm / 5'10&quot;"
                value={height}
                onChange={(e) => {
                  setHeight(e.target.value);
                  if (error) setError('');
                }}
              />
            </div>
          </div>

          {/* Gender Pill Selector */}
          <div className="auth-field-group">
            <label className="auth-label">Gender</label>
            <div className="gender-pills-grid">
              {GENDER_OPTIONS.map((opt) => {
                const isSelected = gender === opt;
                return (
                  <button
                    type="button"
                    key={opt}
                    className={`gender-pill ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      setGender(opt);
                      if (error) setError('');
                    }}
                  >
                    <span>{opt}</span>
                    {isSelected && <Check size={14} strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Instagram Handle */}
          <div className="auth-field-group">
            <label className="auth-label">Instagram Handle</label>
            <div className="auth-input-wrapper">
              <AtSign size={18} className="auth-input-icon" />
              <input
                type="text"
                className="auth-input"
                placeholder="e.g. @minimalist_enzo"
                value={instagramLink}
                onChange={(e) => {
                  setInstagramLink(e.target.value);
                  if (error) setError('');
                }}
              />
            </div>
          </div>

          {/* Action Bar */}
          <div className="profile-details-actions">
            <button
              type="submit"
              className="auth-btn-primary"
              disabled={isSubmitting}
            >
              <span>{isSubmitting ? 'Saving...' : 'Complete Profile'}</span>
              <ArrowRight size={18} />
            </button>
            {onSkip && (
              <button
                type="button"
                className="profile-skip-btn"
                onClick={onSkip}
                disabled={isSubmitting}
              >
                Skip for now
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
