import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageSquare, Share2, Star, MoreVertical } from 'lucide-react';
import { FaHeart } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { toggleOutfitLike } from '../lib/outfitService';

export default function PostCard({ post, onShopClick, onFitClick, onShareClick, showToast, onEditPost, onDeletePost, onCommentClick, onUserClick, currentUsername = 'minimalist_enzo' }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(Boolean(post.user_has_liked));
  const [likeCount, setLikeCount] = useState(post.likes_count ?? post.likes ?? 0);
  const [animateLike, setAnimateLike] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showHeartAnim, setShowHeartAnim] = useState(false);

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
      showToast("Added to Liked Outfits!");
    }

    try {
      console.log('[PostCard] Triggering toggleOutfitLike for post.id:', post?.id, 'user.id:', user?.id);
      await toggleOutfitLike(post.id, user.id);
      console.log('[PostCard] toggleOutfitLike succeeded!');
    } catch (err) {
      console.error('[PostCard] toggleLike error caught:', {
        message: err?.message,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
        rawError: err
      });
      // Rollback on write error
      setLiked(previousLiked);
      setLikeCount(previousCount);
      const displayMsg = err?.message || 'Failed to update like. Please try again.';
      if (showToast) showToast(displayMsg);
    }
  };

  const handleLike = (e) => {
    if (e) e.stopPropagation();
    toggleLike();
  };

  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleCardClick = (e) => {
    if (e) e.stopPropagation();

    if (e.detail === 1) {
      // Single Tap: Wait 250ms to see if a second tap follows
      timerRef.current = setTimeout(() => {
        if (onFitClick) {
          onFitClick(post);
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
    if (e) e.stopPropagation();
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
          showToast("Link copied to clipboard!");
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

  const isOwner = post.username === currentUsername;

  return (
    <div className="post-card feed-card-mobile" onClick={handleCardClick} style={{ cursor: 'pointer' }}>
      {/* Background Outfit Image */}
      <img src={post.image} alt={post.username + "'s outfit"} className="post-image" />

      {/* Floating Heart Pop Animation */}
      {showHeartAnim && (
        <div className="heart-pop-overlay">
          <FaHeart className="heart-pop-icon" />
        </div>
      )}

      {/* Top vignette overlay */}
      <div className="overlay-gradient-top" />

      {/* Bottom vignette overlay */}
      <div className="overlay-gradient-bottom" />

      {/* Owner Post Options Menu */}
      {isOwner && (
        <>
          <button 
            className="post-more-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            aria-label="More options"
          >
            <MoreVertical size={20} />
          </button>
          
          {showMenu && (
            <div className="post-menu-dropdown" onClick={(e) => e.stopPropagation()}>
              <button 
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
        </>
      )}

      {/* Right Action Icons Stack */}
      <div className="right-actions-stack" onClick={(e) => e.stopPropagation()}>
        {/* Like Button */}
        <div className="action-item">
          <button 
            className={`action-btn ${liked ? 'active' : ''} ${animateLike ? 'pulse' : ''}`}
            onClick={handleLike}
            aria-label="Like post"
          >
            <Heart 
              size={24} 
              fill={liked ? '#a6fc29' : 'none'} 
              strokeWidth={liked ? 0 : 2} 
            />
          </button>
          <span className="action-label">{formatCount(likeCount)}</span>
        </div>

        {/* Comment Button */}
        <div className="action-item">
          <button 
            className="action-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (onCommentClick) onCommentClick(post);
            }}
            aria-label="Comments"
          >
            <MessageSquare size={24} strokeWidth={2} />
          </button>
          <span className="action-label">{formatCount(post.comments_count ?? post.comments ?? 0)}</span>
        </div>

        {/* Share Button */}
        <div className="action-item">
          <button 
            className="action-btn"
            onClick={handleSharePost}
            aria-label="Share post"
          >
            <Share2 size={24} strokeWidth={2} />
          </button>
          <span className="action-label">Share</span>
        </div>
      </div>

      {/* Bottom Left Info and Bottom Action Buttons */}
      <div className="post-overlay">
        {/* Profile info and AI Score Row */}
        <div className="profile-row">
          <div 
            className="user-info" 
            onClick={(e) => {
              e.stopPropagation();
              if (onUserClick) onUserClick(post);
            }} 
            style={{ cursor: 'pointer' }}
          >
            <div className="avatar-wrapper">
              <img src={post.avatar || post.user_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop'} alt={post.username} className="avatar-img" />
            </div>
            <div className="user-text">
              <span className="username">{post.username ? post.username.replace(/^@/, '') : 'User'}</span>
              <span className="location">{post.location}</span>
            </div>
          </div>
          
          {/* AI Fit Score Badge */}
          <div className="ai-badge" onClick={(e) => e.stopPropagation()}>
            <span className="score-value">{post.aiScore || (post.overall_score ? `${post.overall_score}/10` : (post.score ? `${post.score}/10` : '8.0/10'))}</span>
            <Star size={11} className="star-icon" />
            <span className="label">AI</span>
          </div>
        </div>

        {/* Post Caption */}
        {post.caption && (
          <p className="post-caption">{post.caption}</p>
        )}

        {/* Action Buttons */}
        {(() => {
          const hasProducts = Array.isArray(post.products) && post.products.length > 0;
          if (!hasProducts) return null;
          return (
            <div className="buttons-container" onClick={(e) => e.stopPropagation()}>
              <button 
                className="btn-primary" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onShopClick) onShopClick(post);
                }}
              >
                SHOP THE LOOK
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
