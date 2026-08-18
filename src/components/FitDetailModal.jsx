import React, { useEffect } from 'react';
import { X, Star, ShoppingBag, MapPin } from 'lucide-react';

export default function FitDetailModal({ fit, onClose, onShopClick }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!fit) return null;

  const username = (fit.username || 'streetwear_creator').replace(/^@/, '');
  const title = fit.title || fit.caption || 'Streetwear Look';
  const score = fit.score || (fit.aiScore ? fit.aiScore.replace('/10', '') : '8.9');
  const hasProducts = Array.isArray(fit.products) && fit.products.length > 0;
  const fitImage = fit.image || fit.image_url || fit.outfit_image;
  const avatarUrl = fit.avatar || fit.user_avatar || fit.avatar_url;

  return (
    <div className="fit-detail-overlay" onClick={onClose}>
      <div className="fit-detail-modal" onClick={(e) => e.stopPropagation()}>
        {/* Creator Info & Header Actions */}
        <div className="fit-detail-header">
          <div className="fit-detail-user-row">
            <div className="fit-detail-avatar">
              {avatarUrl ? (
                <img src={avatarUrl} alt={username} className="fit-avatar-img" />
              ) : (
                <div className="fit-avatar-fallback">
                  {username.replace('@', '').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="fit-detail-user-meta">
              <span className="fit-detail-username">{username}</span>
              {fit.location && (
                <span className="fit-detail-location">
                  <MapPin size={12} /> {fit.location}
                </span>
              )}
            </div>
          </div>

          {/* Header Actions: AI Score Badge + Close Button */}
          <div className="fit-detail-header-actions">
            <div className="fit-modal-score-badge">
              <span>{score}</span>
              <Star size={12} className="star-icon" fill="currentColor" />
            </div>
            <button className="fit-detail-close-btn" onClick={onClose} aria-label="Close modal">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Unobscured Full Fit Image Display */}
        <div className="fit-detail-image-container">
          <img src={fitImage} alt={title} className="fit-detail-image" />
        </div>

        {/* Fit Breakdown & Description */}
        <div className="fit-detail-body">
          <div className="fit-detail-title-section">
            <h3 className="fit-detail-title">{title}</h3>
            {fit.brands && <p className="fit-detail-brands">{fit.brands}</p>}
          </div>

          {/* Shop the look trigger button: only shown for posts that have tagged items */}
          {hasProducts && onShopClick && (
            <button 
              className="fit-detail-shop-btn"
              onClick={() => {
                onClose();
                onShopClick(fit);
              }}
            >
              <ShoppingBag size={18} />
              <span>Shop this Look</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
