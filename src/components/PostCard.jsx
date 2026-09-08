import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageSquare, Share2, Star, MoreVertical, ShoppingBag } from 'lucide-react';
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
  const [showMenu, setShowMenu] = useState(false);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    setLiked(Boolean(post.user_has_liked));
    setLikeCount(post.likes_count ?? post.likes ?? 0);
  }, [post.user_has_liked, post.likes_count, post.likes]);

  useEffect(() => {
    if (!showMenu) return;
    const closeMenu = () => setShowMenu(false);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, [showMenu]);

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

  const handleSharePost = async (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (onShareClick) {
      onShareClick(post);
      return;
    }

    const shareUrl = `${window.location.origin}/?post=${post.id}`;
    const shareData = {
      title: `Check out ${post.username || 'this'} fit on DripMorph!`,
      text: `Rate this fit on DripMorph! AI Score: ${post.overall_score || post.score || '8.0'}/10`,
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
        if (showToast) {
          showToast('Link copied to clipboard!');
        }
      } catch (err) {
        console.error('Failed to copy link:', err);
      }
    }
  };

  const formatCount = (num) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num;
  };

  const isOwner = user?.username && (post.username === user.username || post.username === `@${user.username}` || post.poster_id === user.id);
  const hasProducts = Array.isArray(post.products) && post.products.length > 0;
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

        {/* Top Badges Bar */}
        <div className="pinterest-top-bar" onClick={(e) => e.stopPropagation()}>
          {/* AI Score Badge */}
          <div className="pinterest-score-badge">
            <Star size={11} className="star-icon" fill="#fbbf24" color="#fbbf24" />
            <span className="score-text">{scoreVal}</span>
            <span className="ai-label">AI</span>
          </div>

          {/* Right side: Shop badge / Owner More Menu */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {hasProducts && (
              <button
                type="button"
                className="pinterest-shop-badge"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onShopClick) onShopClick(post);
                }}
                title="Shop the look"
              >
                <ShoppingBag size={12} />
                <span>Shop</span>
              </button>
            )}

            {isOwner && (
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="pinterest-more-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                  }}
                  aria-label="More options"
                >
                  <MoreVertical size={16} />
                </button>

                {showMenu && (
                  <div className="post-menu-dropdown" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="post-menu-item"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        if (onEditPost) onEditPost(post);
                      }}
                    >
                      <span>Edit Caption/Tags</span>
                    </button>
                    <button
                      type="button"
                      className="post-menu-item delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        if (onDeletePost) onDeletePost(post);
                      }}
                    >
                      <span>Delete Post</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Vignette Overlay & Actions */}
        <div className="pinterest-bottom-overlay">
          {/* Creator Profile Row */}
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
            <div className="pinterest-user-meta">
              <span className="pinterest-username">{username}</span>
              {post.location && (
                <span className="pinterest-location">{post.location}</span>
              )}
            </div>
          </div>

          {/* Caption (if available) */}
          {post.caption && (
            <p className="pinterest-caption">{post.caption}</p>
          )}

          {/* Interactive Action Icons Row */}
          <div className="pinterest-actions-row" onClick={(e) => e.stopPropagation()}>
            {/* Like Button */}
            <button
              type="button"
              className={`pinterest-action-btn ${liked ? 'liked' : ''} ${animateLike ? 'pulse' : ''}`}
              onClick={handleLike}
              aria-label="Like fit"
            >
              <Heart
                size={16}
                fill={liked ? '#a6fc29' : 'none'}
                stroke={liked ? '#a6fc29' : 'currentColor'}
                strokeWidth={liked ? 0 : 2}
              />
              <span className="action-count">{formatCount(likeCount)}</span>
            </button>

            {/* Comment Button */}
            <button
              type="button"
              className="pinterest-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (onCommentClick) onCommentClick(post);
              }}
              aria-label="Comments"
            >
              <MessageSquare size={16} strokeWidth={2} />
              <span className="action-count">{formatCount(post.comments_count ?? post.comments ?? 0)}</span>
            </button>

            {/* Share Button */}
            <button
              type="button"
              className="pinterest-action-btn icon-only"
              onClick={handleSharePost}
              aria-label="Share fit"
              style={{ marginLeft: 'auto' }}
            >
              <Share2 size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
