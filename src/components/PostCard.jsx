import React, { useState, useEffect, useRef } from 'react';
import { Heart, Star } from 'lucide-react';
import { FaHeart } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { toggleOutfitLike } from '../lib/outfitService';

export default function PostCard({
  post,
  onShopClick,
  onFitClick,
  onShareClick,
  showToast,
  onEditPost,
  onDeletePost,
  onCommentClick,
  onUserClick,
  onToggleLike,
  currentUsername = 'minimalist_enzo'
}) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(Boolean(post.user_has_liked));
  const [likeCount, setLikeCount] = useState(post.likes_count ?? post.likes ?? 0);
  const [animateLike, setAnimateLike] = useState(false);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    setLiked(Boolean(post.user_has_liked));
    setLikeCount(post.likes_count ?? post.likes ?? 0);
  }, [post.user_has_liked, post.likes_count, post.likes]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

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

    if (onToggleLike) {
      onToggleLike(post.id, nextLiked, nextCount);
    }

    if (nextLiked && showToast) {
      showToast('Added to Liked Outfits!');
    }

    try {
      await toggleOutfitLike(post.id, user.id);
    } catch (err) {
      console.error('[PostCard] toggleLike error:', err);
      // Rollback on write error
      setLiked(previousLiked);
      setLikeCount(previousCount);
      if (onToggleLike) {
        onToggleLike(post.id, previousLiked, previousCount);
      }
      const displayMsg = err?.message || 'Failed to update like. Please try again.';
      if (showToast) showToast(displayMsg);
    }
  };

  const handleLike = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    toggleLike();
  };

  const handleCardClick = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();

    if (e.detail === 1) {
      // Single Tap: Wait 250ms to see if a second tap follows
      timerRef.current = setTimeout(() => {
        if (onFitClick) {
          onFitClick({
            ...post,
            user_has_liked: liked,
            likes: likeCount,
            likes_count: likeCount,
          });
        }
      }, 250);
    } else if (e.detail >= 2) {
      // Double Tap: Clear single tap timer immediately
      if (timerRef.current) clearTimeout(timerRef.current);

      if (!liked) {
        toggleLike();
      }

      setShowHeartAnim(true);
      setTimeout(() => setShowHeartAnim(false), 800);
    }
  };

  const formatCount = (num) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num;
  };

  const username = (post.username || 'user').replace(/^@/, '');
  const avatarUrl = post.avatar || post.user_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop';
  const scoreVal = post.aiScore || (post.overall_score ? `${post.overall_score}/10` : (post.score ? `${post.score}/10` : '8.0/10'));

  return (
    <div
      className="pinterest-pin post-card"
      onClick={handleCardClick}
      title="Click to view fit details"
    >
      {/* Pin Image Container */}
      <div className="pinterest-pin-image-wrapper">
        <img
          src={post.image}
          alt={`${username}'s outfit`}
          className="pinterest-pin-img post-image"
          loading="lazy"
        />

        {/* Double-tap Floating Heart Pop */}
        {showHeartAnim && (
          <div className="heart-pop-overlay">
            <FaHeart className="heart-pop-icon" />
          </div>
        )}

        {/* Top Badges Bar: Clean AI Score Badge only */}
        <div className="pinterest-top-bar" onClick={(e) => e.stopPropagation()}>
          <div className="pinterest-score-badge">
            <Star size={10} className="star-icon" fill="#fbbf24" color="#fbbf24" />
            <span className="score-text">{scoreVal}</span>
            <span className="ai-label">AI</span>
          </div>
        </div>

        {/* Bottom Vignette Overlay: User PFP + Name on left, Like Button on right */}
        <div className="pinterest-bottom-overlay">
          <div className="pinterest-bottom-row">
            {/* Left: Creator Profile */}
            <div
              className="pinterest-user-row"
              onClick={(e) => {
                e.stopPropagation();
                if (onUserClick) onUserClick(post);
              }}
              title={`View @${username}'s profile`}
            >
              <img
                src={avatarUrl}
                alt={username}
                className="pinterest-user-avatar"
                onError={(e) => {
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop';
                }}
              />
              <span className="pinterest-username">@{username}</span>
            </div>

            {/* Right: Like Button */}
            <button
              type="button"
              className={`pinterest-action-btn ${liked ? 'liked' : ''} ${animateLike ? 'pulse' : ''}`}
              onClick={handleLike}
              aria-label="Like fit"
            >
              <Heart
                size={14}
                fill={liked ? '#a6fc29' : 'none'}
                stroke={liked ? '#a6fc29' : 'currentColor'}
                strokeWidth={liked ? 0 : 2}
              />
              <span className="action-count">{formatCount(likeCount)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
