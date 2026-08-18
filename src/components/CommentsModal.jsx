import React, { useState, useEffect, useRef } from 'react';
import { X, MessageSquare, User, AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { IoSend } from 'react-icons/io5';
import { useAuth } from '../context/AuthContext';
import { fetchComments, addComment, deleteComment } from '../lib/outfitService';

export default function CommentsModal({ post, isOpen, onClose, comments = [], onAddComment, onDeleteComment, onUserClick, showToast }) {
  const { user } = useAuth();
  const [commentsList, setCommentsList] = useState(comments);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [selectedComment, setSelectedComment] = useState(null);
  const [replyToUser, setReplyToUser] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    async function loadComments() {
      if (!post?.id) return;
      setIsLoadingComments(true);
      try {
        const remote = await fetchComments(post.id);
        if (isMounted) {
          setCommentsList(remote.length > 0 ? remote : (comments || []));
        }
      } catch (err) {
        console.warn('[CommentsModal] Error loading comments:', err);
        if (isMounted) setCommentsList(comments || []);
      } finally {
        if (isMounted) setIsLoadingComments(false);
      }
    }
    if (isOpen) {
      loadComments();
    }
    return () => { isMounted = false; };
  }, [isOpen, post?.id]);

  if (!isOpen || !post) return null;

  const handleSendComment = async (e) => {
    if (e) e.preventDefault();
    if (!commentText.trim() || isSubmitting) return;

    if (!user) {
      if (showToast) showToast("Please sign in to comment");
      return;
    }

    const text = commentText.trim();
    setIsSubmitting(true);

    const optimisticComment = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `opt-${Date.now()}`,
      outfit_id: post.id,
      user_id: user.id,
      username: user.username ? user.username.replace(/^@/, '') : (user.email?.split('@')[0] || 'anonymous'),
      avatar: user.avatar || user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
      user_avatar: user.avatar || user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
      content: text,
      text: text,
      created_at: 'Just now'
    };

    setCommentsList(prev => [...prev, optimisticComment]);
    setCommentText('');
    setReplyToUser(null);

    try {
      const realComment = await addComment(post.id, text);
      setCommentsList(prev => prev.map(c => c.id === optimisticComment.id ? realComment : c));
      if (onAddComment) onAddComment(post.id, text, realComment);
      if (showToast) showToast("Comment posted!");
    } catch (err) {
      console.error('[CommentsModal] Failed to post comment:', err);
      if (showToast) showToast(err.message || "Failed to post comment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleOptionReply = () => {
    if (!selectedComment) return;
    const targetUser = (selectedComment.username || '').replace(/^@/, '');
    setReplyToUser(targetUser);
    setCommentText(`${targetUser} `);
    setSelectedComment(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleOptionVisitProfile = () => {
    if (!selectedComment) return;
    const targetUser = (selectedComment.username || '').replace(/^@/, '');
    setSelectedComment(null);
    onClose();
    if (onUserClick) {
      onUserClick(targetUser);
    }
  };

  const handleOptionReport = () => {
    if (!selectedComment) return;
    setSelectedComment(null);
    if (showToast) {
      showToast("Comment reported for review.");
    }
  };

  const currentHandle = user?.username ? user.username.replace(/^@/, '') : 'minimalist_enzo';

  // Permission checks
  const isCommentOwner = selectedComment && (
    (user?.id && user.id === selectedComment.user_id) ||
    (selectedComment.username && (selectedComment.username.replace(/^@/, '') === currentHandle || selectedComment.username === user?.username || selectedComment.username === 'minimalist_enzo'))
  );

  const isPostOwner = post && (
    (user?.id && user.id === post.user_id) ||
    (post.username && (post.username.replace(/^@/, '') === currentHandle || post.username === user?.username || post.username === 'minimalist_enzo'))
  );

  const canDeleteComment = Boolean(isCommentOwner || isPostOwner);

  const handleDeleteComment = async (comment = null) => {
    const commentToDelete = comment || selectedComment;
    if (!commentToDelete?.id) return;
    const previous = [...commentsList];
    const commentId = commentToDelete.id;
    setSelectedComment(null);

    setCommentsList(prev => prev.filter(c => c.id !== commentId));
    if (onDeleteComment) onDeleteComment(post.id, commentId);

    try {
      await deleteComment(commentId);
      if (showToast) showToast("Comment deleted.");
    } catch (err) {
      console.error('[CommentsModal] Failed to delete comment:', err);
      setCommentsList(previous);
      if (showToast) showToast(err.message || "Failed to delete comment.");
    }
  };

  return (
    <div className="stl-overlay comments-modal-overlay" onClick={handleOverlayClick}>
      <div 
        className="comments-modal-content" 
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {/* Top Drag handle */}
        <div className="stl-drag-handle" />
        
        {/* Close Button */}
        <button className="stl-close-btn" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        <h2 className="stl-title">Comments</h2>
        
        {/* Post Summary Header */}
        <div className="comments-post-summary">
          <img src={post.image || post.image_url} alt="Post thumbnail" className="comments-post-thumb" />
          <div className="comments-post-info">
            <span className="comments-post-author">{post.username?.replace(/^@/, '')}</span>
            <p className="comments-post-caption">{post.caption || post.title || 'Streetwear check.'}</p>
          </div>
        </div>

        <div className="comments-divider" />

        {/* Comments Scrollable Thread */}
        <div className="comments-thread comments-list-body">
          {isLoadingComments ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 0', gap: '8px', color: 'var(--text-secondary)' }}>
              <Loader2 size={20} className="animate-spin" />
              <span>Loading comments...</span>
            </div>
          ) : commentsList.length === 0 ? (
            <p className="comments-empty-text">No comments yet. Start the conversation!</p>
          ) : (
            commentsList.map(comment => {
              const isOwnComment = user?.id && user.id === comment.user_id;
              return (
                <div 
                  key={comment.id} 
                  className="comment-bubble-item"
                  onClick={() => setSelectedComment(comment)}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1 }}>
                    <img src={comment.avatar || comment.user_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop'} alt={comment.username} className="comment-avatar" />
                    <div className="comment-bubble-content">
                      <span className="comment-username">{comment.username ? comment.username.replace(/^@/, '') : 'User'}</span>
                      <p className="comment-text">{comment.content || comment.text}</p>
                    </div>
                  </div>

                  {isOwnComment && (
                    <button
                      type="button"
                      className="comment-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteComment(comment);
                      }}
                      title="Delete comment"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0.8
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Sticky Comment Input Bar with Reply Tag */}
        <div 
          className="comments-input-wrapper"
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          style={{ width: '100%', marginTop: 'auto' }}
        >
          {replyToUser && (
            <div className="reply-tag-bar">
              <span>Replying to {replyToUser}</span>
              <button 
                type="button" 
                onClick={() => {
                  setReplyToUser(null);
                  if (commentText.startsWith(`${replyToUser} `)) {
                    setCommentText('');
                  }
                }} 
                style={{ background: 'none', border: 'none', color: '#a6fc29', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                aria-label="Cancel reply"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className="comments-input-container">
            <input 
              ref={inputRef}
              type="text" 
              placeholder={replyToUser ? `Reply to ${replyToUser}...` : "Add a comment..."} 
              value={commentText} 
              onChange={(e) => setCommentText(e.target.value)} 
              onFocus={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSendComment();
                }
              }}
              disabled={isSubmitting}
              className="comment-input"
            />
            <button 
              type="button"
              onClick={handleSendComment} 
              disabled={!commentText.trim() || isSubmitting} 
              className="comment-send-btn"
              aria-label="Send Comment"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <IoSend size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Action Sheet Drawer Overlay */}
      {selectedComment && (
        <div className="action-sheet-overlay" onClick={() => setSelectedComment(null)}>
          <div className="action-sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="action-sheet-header">
              <img 
                src={selectedComment.avatar || selectedComment.user_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop'} 
                alt={selectedComment.username} 
                className="action-sheet-avatar" 
              />
              <span className="action-sheet-username">{selectedComment.username}</span>
            </div>

            <button className="action-sheet-btn" onClick={handleOptionReply}>
              <MessageSquare size={18} />
              <span>Reply to {selectedComment.username}</span>
            </button>

            <button className="action-sheet-btn" onClick={handleOptionVisitProfile}>
              <User size={18} />
              <span>Visit Profile</span>
            </button>

            {canDeleteComment && (
              <button className="action-sheet-btn danger" onClick={handleDeleteComment}>
                <Trash2 size={18} />
                <span>Delete Comment</span>
              </button>
            )}

            <button className="action-sheet-btn danger" onClick={handleOptionReport}>
              <AlertTriangle size={18} />
              <span>Report Comment</span>
            </button>

            <button className="action-sheet-btn" style={{ marginTop: '4px' }} onClick={() => setSelectedComment(null)}>
              <span>Cancel</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
