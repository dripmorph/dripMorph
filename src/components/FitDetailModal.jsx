import React, { useState, useEffect } from 'react';
import { X, Star, ShoppingBag, MapPin, Heart, MessageSquare, Share2 } from 'lucide-react';
import { FaHeart } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { toggleOutfitLike } from '../lib/outfitService';

export default function FitDetailModal({
  fit,
  onClose,
  onShopClick,
  onUserClick,
  onCommentClick,
  onShareClick,
  showToast
}) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(Boolean(fit?.user_has_liked));
  const [likeCount, setLikeCount] = useState(fit?.likes_count ?? fit?.likes ?? 0);
  const [commentCount, setCommentCount] = useState(fit?.comments_count ?? fit?.comments ?? 0);
  const [animateLike, setAnimateLike] = useState(false);
  const [showHeartAnim, setShowHeartAnim] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (fit) {
      setLiked(Boolean(fit.user_has_liked));
      setLikeCount(fit.likes_count ?? fit.likes ?? 0);
      setCommentCount(fit.comments_count ?? fit.comments ?? 0);
    }
  }, [fit?.user_has_liked, fit?.likes_count, fit?.likes, fit?.comments_count, fit?.comments]);

  if (!fit) return null;

  const username = (fit.username || 'streetwear_creator').replace(/^@/, '');
  const title = fit.title || fit.caption || 'Streetwear Look';
  const score = fit.score || (fit.aiScore ? fit.aiScore.replace('/10', '') : '8.9');
  const hasProducts = Array.isArray(fit.products) && fit.products.length > 0;
  const fitImage = fit.image || fit.image_url || fit.outfit_image;
  const avatarUrl = fit.avatar || fit.user_avatar || fit.avatar_url;

  const toggleLike = async () => {
    if (!user?.id) {
      if (showToast) showToast('Please sign in to like fits.');
      return;
    }

    const previousLiked = liked;
    const previousCount = likeCount;
    const nextLiked = !previousLiked;
    const nextCount = nextLiked ? previousCount + 1 : Math.max(0, previousCount - 1);

    // Optimistic UI update
    setLiked(nextLiked);
    setLikeCount(nextCount);
    setAnimateLike(true);
    setTimeout(() => setAnimateLike(false), 300);

    if (nextLiked && showToast) {
      showToast('Added to Liked Outfits!');
    }

    try {
      await toggleOutfitLike(fit.id, user.id);
    } catch (err) {
      console.error('[FitDetailModal] toggleLike error:', err);
      // Rollback
      setLiked(previousLiked);
      setLikeCount(previousCount);
      if (showToast) showToast('Failed to update like. Please try again.');
    }
  };

  const handleImageClick = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (e.detail >= 2) {
      if (!liked) {
        toggleLike();
      }
      setShowHeartAnim(true);
      setTimeout(() => setShowHeartAnim(false), 800);
    }
  };

  const handleShare = async (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (onShareClick) {
      onShareClick(fit);
      return;
    }

    const shareUrl = `${window.location.origin}/?post=${fit.id}`;
    const shareData = {
      title: `Check out ${username}'s fit on DripMorph!`,
      text: `Rate this fit on DripMorph! AI Score: ${score}/10`,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if (err.name !== 'AbortError') console.error('Error sharing:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        if (showToast) showToast('Link copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy link:', err);
      }
    }
  };

  const handleProfileClick = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (onUserClick) {
      if (onClose) onClose();
      const validPosterId = (fit.poster_id || fit.user_id || fit.creator_id) && 
        (fit.poster_id || fit.user_id || fit.creator_id) !== fit.id && 
        (fit.poster_id || fit.user_id || fit.creator_id) !== fit.outfit_id
          ? (fit.poster_id || fit.user_id || fit.creator_id)
          : null;

      const userObj = {
        id: validPosterId,
        user_id: validPosterId,
        poster_id: validPosterId,
        username: username,
        avatar: avatarUrl,
        avatar_url: avatarUrl,
        city: fit.location || fit.city
      };
      onUserClick(userObj);
    }
  };

  return (
    <div className="fit-detail-overlay" onClick={onClose}>
      <div className="fit-detail-modal" onClick={(e) => e.stopPropagation()}>
        {/* Creator Info & Header Actions */}
        <div className="fit-detail-header">
          <div 
            className="fit-detail-user-row"
            onClick={handleProfileClick}
            style={{ cursor: onUserClick ? 'pointer' : 'default' }}
            title={`View ${username}'s profile`}
          >
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
        <div className="fit-detail-image-container" onClick={handleImageClick}>
          <img src={fitImage} alt={title} className="fit-detail-image" />
          {showHeartAnim && (
            <div className="heart-pop-overlay">
              <FaHeart className="heart-pop-icon" />
            </div>
          )}
        </div>

        {/* Fit Breakdown & Interactive Actions */}
        <div className="fit-detail-body">
          <div className="fit-detail-title-section">
            <h3 className="fit-detail-title">{title}</h3>
            {fit.brands && <p className="fit-detail-brands">{fit.brands}</p>}
          </div>

          {/* Aesthetic Action Row: Like, Comment, Share, Shop */}
          <div className="fit-detail-actions-bar">
            {/* Like Button */}
            <button
              type="button"
              className={`fit-detail-action-pill like-pill ${liked ? 'liked' : ''} ${animateLike ? 'pulse' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                toggleLike();
              }}
              aria-label={liked ? 'Unlike' : 'Like'}
            >
              <Heart
                size={18}
                fill={liked ? 'var(--accent-solid, #a6fc29)' : 'none'}
                stroke={liked ? 'var(--accent-solid, #a6fc29)' : 'currentColor'}
                strokeWidth={liked ? 0 : 2}
              />
              <span className="fit-pill-count">{likeCount}</span>
            </button>

            {/* Comment Button */}
            <button
              type="button"
              className="fit-detail-action-pill comment-pill"
              onClick={(e) => {
                e.stopPropagation();
                if (onCommentClick) onCommentClick(fit);
              }}
              aria-label="Comments"
            >
              <MessageSquare size={18} strokeWidth={2} />
              <span className="fit-pill-count">{commentCount}</span>
            </button>

            {/* Share Button */}
            <button
              type="button"
              className="fit-detail-action-pill share-pill icon-only-pill"
              onClick={handleShare}
              aria-label="Share"
              title="Share fit"
            >
              <Share2 size={18} strokeWidth={2} />
            </button>

            {/* Shop button if available */}
            {hasProducts && onShopClick && (
              <button 
                type="button"
                className="fit-detail-shop-pill"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                  onShopClick(fit);
                }}
              >
                <ShoppingBag size={18} />
                <span>Shop Look</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
