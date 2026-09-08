import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Star, ShoppingBag, MapPin, Heart, MessageSquare, Share2, ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react';
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
  onToggleLike,
  showToast
}) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(Boolean(fit?.user_has_liked));
  const [likeCount, setLikeCount] = useState(fit?.likes_count ?? fit?.likes ?? 0);
  const [commentCount, setCommentCount] = useState(fit?.comments_count ?? fit?.comments ?? 0);
  const [animateLike, setAnimateLike] = useState(false);
  const [showHeartAnim, setShowHeartAnim] = useState(false);

  // Enlarged fullscreen lightbox state (for PC click & mobile enlarge)
  const [isEnlarged, setIsEnlarged] = useState(false);

  // In-modal Zoom & Pan State (Phone scroll/pinch + PC wheel)
  const [modalScale, setModalScale] = useState(1);
  const [modalPos, setModalPos] = useState({ x: 0, y: 0 });
  const [isModalDragging, setIsModalDragging] = useState(false);
  const modalDragStart = useRef({ x: 0, y: 0 });
  const modalTouchDist = useRef(0);
  const modalImageContainerRef = useRef(null);

  // Lightbox Zoom & Pan State
  const [lightboxScale, setLightboxScale] = useState(1);
  const [lightboxPos, setLightboxPos] = useState({ x: 0, y: 0 });
  const [isLightboxDragging, setIsLightboxDragging] = useState(false);
  const lightboxDragStart = useRef({ x: 0, y: 0 });
  const lightboxTouchDist = useRef(0);
  const lastClickTime = useRef(0);

  // Reset zoom states when modal opens or fit changes
  useEffect(() => {
    setModalScale(1);
    setModalPos({ x: 0, y: 0 });
    setLightboxScale(1);
    setLightboxPos({ x: 0, y: 0 });
    setIsEnlarged(false);
  }, [fit?.id]);

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isEnlarged) {
          setIsEnlarged(false);
          setLightboxScale(1);
          setLightboxPos({ x: 0, y: 0 });
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isEnlarged]);

  useEffect(() => {
    if (fit) {
      setLiked(Boolean(fit.user_has_liked));
      setLikeCount(fit.likes_count ?? fit.likes ?? 0);
      setCommentCount(fit.comments_count ?? fit.comments ?? 0);
    }
  }, [fit?.id, fit?.user_has_liked, fit?.likes_count, fit?.likes, fit?.comments_count, fit?.comments]);

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

    setLiked(nextLiked);
    setLikeCount(nextCount);
    setAnimateLike(true);
    setTimeout(() => setAnimateLike(false), 300);

    if (onToggleLike) {
      onToggleLike(fit.id, nextLiked, nextCount);
    }

    if (nextLiked && showToast) {
      showToast('Added to Liked Outfits!');
    }

    try {
      await toggleOutfitLike(fit.id, user.id);
    } catch (err) {
      console.error('[FitDetailModal] toggleLike error:', err);
      setLiked(previousLiked);
      setLikeCount(previousCount);
      if (onToggleLike) {
        onToggleLike(fit.id, previousLiked, previousCount);
      }
      if (showToast) showToast('Failed to update like. Please try again.');
    }
  };

  // ── IN-MODAL ZOOM / SCROLL / PAN HANDLERS (for Phone & PC) ─────────────────
  const handleModalWheel = (e) => {
    // Zoom on scroll wheel / trackpad scroll
    e.preventDefault();
    e.stopPropagation();
    const zoomDelta = e.deltaY < 0 ? 0.2 : -0.2;
    setModalScale((prev) => {
      const next = Math.min(3.5, Math.max(1, Number((prev + zoomDelta).toFixed(2))));
      if (next === 1) setModalPos({ x: 0, y: 0 });
      return next;
    });
  };

  const handleModalMouseDown = (e) => {
    if (modalScale <= 1) return;
    setIsModalDragging(true);
    modalDragStart.current = {
      x: e.clientX - modalPos.x,
      y: e.clientY - modalPos.y
    };
  };

  const handleModalMouseMove = (e) => {
    if (!isModalDragging || modalScale <= 1) return;
    const maxBound = (modalScale - 1) * 160;
    const nextX = e.clientX - modalDragStart.current.x;
    const nextY = e.clientY - modalDragStart.current.y;
    setModalPos({
      x: Math.max(-maxBound, Math.min(maxBound, nextX)),
      y: Math.max(-maxBound, Math.min(maxBound, nextY))
    });
  };

  const handleModalMouseUp = () => {
    setIsModalDragging(false);
  };

  const handleModalTouchStart = (e) => {
    if (e.touches.length === 2) {
      // 2 fingers: pinch to zoom
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      modalTouchDist.current = dist;
    } else if (e.touches.length === 1 && modalScale > 1) {
      // 1 finger: pan when zoomed in
      setIsModalDragging(true);
      modalDragStart.current = {
        x: e.touches[0].clientX - modalPos.x,
        y: e.touches[0].clientY - modalPos.y
      };
    }
  };

  const handleModalTouchMove = (e) => {
    if (e.touches.length === 2 && modalTouchDist.current > 0) {
      e.preventDefault();
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = currentDist / modalTouchDist.current;
      setModalScale((prev) => {
        const next = Math.min(3.5, Math.max(1, Number((prev * (ratio > 1 ? 1.04 : 0.96)).toFixed(2))));
        if (next === 1) setModalPos({ x: 0, y: 0 });
        return next;
      });
      modalTouchDist.current = currentDist;
    } else if (e.touches.length === 1 && isModalDragging && modalScale > 1) {
      e.preventDefault();
      const maxBound = (modalScale - 1) * 160;
      const nextX = e.touches[0].clientX - modalDragStart.current.x;
      const nextY = e.touches[0].clientY - modalDragStart.current.y;
      setModalPos({
        x: Math.max(-maxBound, Math.min(maxBound, nextX)),
        y: Math.max(-maxBound, Math.min(maxBound, nextY))
      });
    }
  };

  const handleModalTouchEnd = () => {
    modalTouchDist.current = 0;
    setIsModalDragging(false);
  };

  const handleImageClick = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();

    // Check double click for like animation
    const now = Date.now();
    if (now - lastClickTime.current < 280) {
      if (!liked) toggleLike();
      setShowHeartAnim(true);
      setTimeout(() => setShowHeartAnim(false), 800);
      lastClickTime.current = 0;
      return;
    }
    lastClickTime.current = now;

    // Single click on PC / Mobile: Open Enlarged Lightbox View
    setIsEnlarged(true);
  };

  const resetModalZoom = (e) => {
    if (e) e.stopPropagation();
    setModalScale(1);
    setModalPos({ x: 0, y: 0 });
  };

  // ── LIGHTBOX ZOOM & PAN HANDLERS (for PC enlarged view & mobile fullscreen) ─
  const handleLightboxWheel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const zoomDelta = e.deltaY < 0 ? 0.25 : -0.25;
    setLightboxScale((prev) => {
      const next = Math.min(4, Math.max(1, Number((prev + zoomDelta).toFixed(2))));
      if (next === 1) setLightboxPos({ x: 0, y: 0 });
      return next;
    });
  };

  const handleLightboxMouseDown = (e) => {
    if (lightboxScale <= 1) return;
    setIsLightboxDragging(true);
    lightboxDragStart.current = {
      x: e.clientX - lightboxPos.x,
      y: e.clientY - lightboxPos.y
    };
  };

  const handleLightboxMouseMove = (e) => {
    if (!isLightboxDragging || lightboxScale <= 1) return;
    const maxBound = (lightboxScale - 1) * 350;
    const nextX = e.clientX - lightboxDragStart.current.x;
    const nextY = e.clientY - lightboxDragStart.current.y;
    setLightboxPos({
      x: Math.max(-maxBound, Math.min(maxBound, nextX)),
      y: Math.max(-maxBound, Math.min(maxBound, nextY))
    });
  };

  const handleLightboxMouseUp = () => {
    setIsLightboxDragging(false);
  };

  const handleLightboxTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lightboxTouchDist.current = dist;
    } else if (e.touches.length === 1 && lightboxScale > 1) {
      setIsLightboxDragging(true);
      lightboxDragStart.current = {
        x: e.touches[0].clientX - lightboxPos.x,
        y: e.touches[0].clientY - lightboxPos.y
      };
    }
  };

  const handleLightboxTouchMove = (e) => {
    if (e.touches.length === 2 && lightboxTouchDist.current > 0) {
      e.preventDefault();
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = currentDist / lightboxTouchDist.current;
      setLightboxScale((prev) => {
        const next = Math.min(4, Math.max(1, Number((prev * (ratio > 1 ? 1.05 : 0.95)).toFixed(2))));
        if (next === 1) setLightboxPos({ x: 0, y: 0 });
        return next;
      });
      lightboxTouchDist.current = currentDist;
    } else if (e.touches.length === 1 && isLightboxDragging && lightboxScale > 1) {
      e.preventDefault();
      const maxBound = (lightboxScale - 1) * 350;
      const nextX = e.touches[0].clientX - lightboxDragStart.current.x;
      const nextY = e.touches[0].clientY - lightboxDragStart.current.y;
      setLightboxPos({
        x: Math.max(-maxBound, Math.min(maxBound, nextX)),
        y: Math.max(-maxBound, Math.min(maxBound, nextY))
      });
    }
  };

  const handleLightboxTouchEnd = () => {
    lightboxTouchDist.current = 0;
    setIsLightboxDragging(false);
  };

  const handleLightboxImageClick = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    // Toggle zoom between 1x and 2x on click in enlarged view
    setLightboxScale((prev) => {
      const next = prev === 1 ? 2 : 1;
      if (next === 1) setLightboxPos({ x: 0, y: 0 });
      return next;
    });
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
    <>
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

          {/* Unobscured Full Fit Image Display with Scroll/Pinch/Pan Zoom */}
          <div 
            ref={modalImageContainerRef}
            className="fit-detail-image-container"
            onClick={handleImageClick}
            onWheel={handleModalWheel}
            onMouseDown={handleModalMouseDown}
            onMouseMove={handleModalMouseMove}
            onMouseUp={handleModalMouseUp}
            onMouseLeave={handleModalMouseUp}
            onTouchStart={handleModalTouchStart}
            onTouchMove={handleModalTouchMove}
            onTouchEnd={handleModalTouchEnd}
            style={{
              cursor: modalScale > 1 ? (isModalDragging ? 'grabbing' : 'grab') : 'zoom-in',
              touchAction: modalScale > 1 ? 'none' : 'pan-y pinch-zoom'
            }}
          >
            <img 
              src={fitImage} 
              alt={title} 
              className="fit-detail-image"
              draggable={false}
              style={{
                transform: `scale(${modalScale}) translate(${modalPos.x / modalScale}px, ${modalPos.y / modalScale}px)`,
                transition: isModalDragging ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                transformOrigin: 'center center'
              }}
            />

            {/* Subtle Zoom Hint Banner on Desktop */}
            {modalScale === 1 && (
              <div className="fit-zoom-hint-badge" title="Click to enlarge, scroll or pinch to zoom">
                <Maximize2 size={12} />
                <span>Click to enlarge / Scroll to zoom</span>
              </div>
            )}

            {/* Reset Zoom Button when zoomed inside modal */}
            {modalScale > 1 && (
              <button 
                type="button" 
                className="fit-zoom-reset-badge"
                onClick={resetModalZoom}
                title="Reset zoom"
              >
                <RotateCcw size={12} />
                <span>{Math.round(modalScale * 100)}% (Reset)</span>
              </button>
            )}

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

      {/* ── ENLARGED FULLSCREEN LIGHTBOX (for PC click & mobile fullscreen zoom) ── */}
      {isEnlarged && (
        <div 
          className="fit-enlarged-overlay"
          onClick={() => {
            setIsEnlarged(false);
            setLightboxScale(1);
            setLightboxPos({ x: 0, y: 0 });
          }}
        >
          {/* Top Bar with user info & close button */}
          <div className="fit-enlarged-header" onClick={(e) => e.stopPropagation()}>
            <div className="fit-enlarged-user-info">
              {avatarUrl && <img src={avatarUrl} alt={username} className="fit-enlarged-avatar" />}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="fit-enlarged-uname">{username}</span>
                <span className="fit-enlarged-caption">{title}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="fit-modal-score-badge">
                <span>{score}</span>
                <Star size={12} className="star-icon" fill="currentColor" />
              </div>
              <button 
                type="button" 
                className="fit-enlarged-close-btn"
                onClick={() => {
                  setIsEnlarged(false);
                  setLightboxScale(1);
                  setLightboxPos({ x: 0, y: 0 });
                }}
                aria-label="Close enlarged view"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Central Image Canvas with Zoom / Scroll / Pan */}
          <div 
            className="fit-enlarged-image-container"
            onClick={handleLightboxImageClick}
            onWheel={handleLightboxWheel}
            onMouseDown={handleLightboxMouseDown}
            onMouseMove={handleLightboxMouseMove}
            onMouseUp={handleLightboxMouseUp}
            onMouseLeave={handleLightboxMouseUp}
            onTouchStart={handleLightboxTouchStart}
            onTouchMove={handleLightboxTouchMove}
            onTouchEnd={handleLightboxTouchEnd}
            style={{
              cursor: lightboxScale > 1 ? (isLightboxDragging ? 'grabbing' : 'grab') : 'zoom-in'
            }}
          >
            <img 
              src={fitImage} 
              alt={title}
              className="fit-enlarged-image"
              draggable={false}
              style={{
                transform: `scale(${lightboxScale}) translate(${lightboxPos.x / lightboxScale}px, ${lightboxPos.y / lightboxScale}px)`,
                transition: isLightboxDragging ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            />
          </div>

          {/* Bottom Floating Glass Toolbar for Zoom Controls */}
          <div className="fit-enlarged-toolbar" onClick={(e) => e.stopPropagation()}>
            <button 
              type="button" 
              className="fit-toolbar-btn"
              onClick={() => {
                setLightboxScale((prev) => {
                  const next = Math.max(1, Number((prev - 0.35).toFixed(2)));
                  if (next === 1) setLightboxPos({ x: 0, y: 0 });
                  return next;
                });
              }}
              disabled={lightboxScale <= 1}
              title="Zoom out"
            >
              <ZoomOut size={16} />
            </button>

            <span className="fit-toolbar-scale">{Math.round(lightboxScale * 100)}%</span>

            <button 
              type="button" 
              className="fit-toolbar-btn"
              onClick={() => {
                setLightboxScale((prev) => Math.min(4, Number((prev + 0.35).toFixed(2))));
              }}
              disabled={lightboxScale >= 4}
              title="Zoom in"
            >
              <ZoomIn size={16} />
            </button>

            <button 
              type="button" 
              className="fit-toolbar-btn"
              onClick={() => {
                setLightboxScale(1);
                setLightboxPos({ x: 0, y: 0 });
              }}
              title="Reset Zoom"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
