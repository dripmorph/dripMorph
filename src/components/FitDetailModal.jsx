import React, { useEffect } from 'react';
import { X, Star, ShoppingBag, MapPin, Tag } from 'lucide-react';

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

  const username = fit.username || '@streetwear_creator';
  const title = fit.title || fit.caption || 'Streetwear Look';
  const score = fit.score || (fit.aiScore ? fit.aiScore.replace('/10', '') : '8.9');
  const products = fit.products && fit.products.length > 0 ? fit.products : [
    { name: 'Featured Streetwear Outerwear', brand: fit.brands || 'DripMorph', price: '$180.00' }
  ];

  return (
    <div className="stl-overlay fit-detail-overlay" onClick={onClose}>
      <div className="fit-detail-modal" onClick={(e) => e.stopPropagation()}>
        {/* Drag handle / Header decoration */}
        <div className="stl-drag-handle" />

        {/* Top Close Button */}
        <button className="fit-detail-close-btn" onClick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>

        {/* Creator Info Header */}
        <div className="fit-detail-header">
          <div className="fit-detail-user-row">
            <div className="fit-detail-avatar">
              {fit.avatar ? (
                <img src={fit.avatar} alt={username} className="fit-avatar-img" />
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

          {/* AI Score Badge */}
          <div className="fit-card-score-badge fit-modal-score-badge">
            <span>{score}</span>
            <Star size={12} className="star-icon" fill="currentColor" />
          </div>
        </div>

        {/* Unobscured Full Fit Image Display */}
        <div className="fit-detail-image-container">
          <img src={fit.image} alt={title} className="fit-detail-image" />
        </div>

        {/* Fit Breakdown & Description */}
        <div className="fit-detail-body">
          <div className="fit-detail-title-section">
            <h3 className="fit-detail-title">{title}</h3>
            {fit.brands && <p className="fit-detail-brands">{fit.brands}</p>}
          </div>

          {/* Tagged Items List */}
          <div className="fit-detail-tagged-section">
            <div className="fit-detail-section-header">
              <Tag size={15} className="tag-icon" />
              <span>Tagged Items ({products.length})</span>
            </div>
            <div className="fit-detail-products-list">
              {products.map((item, idx) => (
                <div key={item.id || `fit-item-${idx}`} className="fit-detail-item-chip">
                  <div className="fit-item-info">
                    <span className="fit-item-name">{item.name}</span>
                    {item.brand && <span className="fit-item-brand">{item.brand}</span>}
                  </div>
                  {item.price && <span className="fit-item-price">{item.price}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Shop the look trigger button */}
          {onShopClick && (
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
