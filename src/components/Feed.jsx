import React from 'react';
import PostCard from './PostCard';
import { Sparkles, Camera } from 'lucide-react';

export default function Feed({
  posts,
  isLoading,
  onShopClick,
  onFitClick,
  onShareClick,
  showToast,
  onEditPost,
  onDeletePost,
  onCommentClick,
  onUserClick,
  onUploadClick,
}) {
  if (isLoading) {
    return (
      <div className="feed-container pinterest-grid">
        <div className="pinterest-column">
          {[280, 220, 320].map((h, i) => (
            <div
              key={i}
              className="pinterest-skeleton-card"
              style={{
                height: `${h}px`,
                borderRadius: '16px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                width: '100%',
                position: 'relative',
                overflow: 'hidden',
                animation: 'pinterestPulse 1.4s ease-in-out infinite alternate',
              }}
            />
          ))}
        </div>
        <div className="pinterest-column">
          {[220, 340, 260].map((h, i) => (
            <div
              key={i}
              className="pinterest-skeleton-card"
              style={{
                height: `${h}px`,
                borderRadius: '16px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                width: '100%',
                position: 'relative',
                overflow: 'hidden',
                animation: 'pinterestPulse 1.4s ease-in-out infinite alternate',
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="feed-container">
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 24px',
            textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px dashed rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            margin: '20px',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(166, 252, 41, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#A6FC29',
            }}
          >
            <Camera size={28} />
          </div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
            No posts yet
          </h3>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(255,255,255,0.6)', maxWidth: '320px', lineHeight: 1.5 }}>
            Be the first creator to scan and publish an outfit to the DripMorph Feed!
          </p>
          {onUploadClick && (
            <button
              onClick={onUploadClick}
              style={{
                marginTop: '8px',
                background: '#A6FC29',
                color: '#000',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '24px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Sparkles size={16} />
              <span>Publish First Fit</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const col1 = posts.filter((_, i) => i % 2 === 0);
  const col2 = posts.filter((_, i) => i % 2 === 1);

  return (
    <div className="feed-container pinterest-grid">
      <div className="pinterest-column">
        {col1.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onShopClick={onShopClick}
            onFitClick={onFitClick}
            onShareClick={onShareClick}
            showToast={showToast}
            onEditPost={onEditPost}
            onDeletePost={onDeletePost}
            onCommentClick={() => onCommentClick(post)}
            onUserClick={onUserClick}
          />
        ))}
      </div>
      <div className="pinterest-column">
        {col2.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onShopClick={onShopClick}
            onFitClick={onFitClick}
            onShareClick={onShareClick}
            showToast={showToast}
            onEditPost={onEditPost}
            onDeletePost={onDeletePost}
            onCommentClick={() => onCommentClick(post)}
            onUserClick={onUserClick}
          />
        ))}
      </div>
    </div>
  );
}
