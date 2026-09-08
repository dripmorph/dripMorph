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
        {[260, 340, 220, 300, 240, 320].map((h, i) => (
          <div
            key={i}
            className="pinterest-skeleton-card"
            style={{
              height: `${h}px`,
              borderRadius: '16px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              marginBottom: '16px',
              breakInside: 'avoid',
              position: 'relative',
              overflow: 'hidden',
              animation: 'pinterestPulse 1.4s ease-in-out infinite alternate',
            }}
          />
        ))}
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
            justify: 'center',
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
              justify: 'center',
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

  return (
    <div className="feed-container pinterest-grid">
      {posts.map((post) => (
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
  );
}

