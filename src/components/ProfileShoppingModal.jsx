import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink, Plus, Trash2, Globe, Link2 } from 'lucide-react';

export default function ProfileShoppingModal({
  isOpen,
  onClose,
  isOwnProfile,
  userId,
  username,
  customLinks = [],
  onSaveLinks,
  showToast
}) {
  const [links, setLinks] = useState(customLinks);
  const [isAdding, setIsAdding] = useState(false);
  const [linkInput, setLinkInput] = useState('');

  // Sync internal state when external customLinks prop updates
  useEffect(() => {
    if (Array.isArray(customLinks)) {
      setLinks(customLinks);
    }
  }, [customLinks]);

  if (!isOpen) return null;

  const handleOpenLink = (rawUrl) => {
    if (!rawUrl) return;
    let target = rawUrl.trim();
    if (!/^https?:\/\//i.test(target)) {
      target = `https://${target}`;
    }
    window.open(target, '_blank', 'noopener,noreferrer');
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const cleanUrl = linkInput.trim();
    if (!cleanUrl) {
      if (showToast) showToast('Please enter a link');
      return;
    }

    const newLink = {
      id: `link-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      url: cleanUrl
    };

    const updated = [newLink, ...links];
    setLinks(updated);
    setLinkInput('');
    setIsAdding(false);

    if (onSaveLinks) {
      await onSaveLinks(updated);
    }
    if (showToast) showToast('Link added successfully!');
  };

  const handleDelete = async (id) => {
    const updated = links.filter(l => l.id !== id);
    setLinks(updated);

    if (onSaveLinks) {
      await onSaveLinks(updated);
    }
    if (showToast) showToast('Link removed');
  };

  // Helper to format clean display label from URL
  const formatDisplayUrl = (url) => {
    try {
      return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
    } catch {
      return url;
    }
  };

  const displayName = (username || 'User').replace(/^@/, '');

  const modalContent = (
    <div 
      className="profile-shop-modal-overlay" 
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        padding: '16px'
      }}
    >
      <div 
        className="profile-shop-modal-card" 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '440px',
          maxHeight: '85vh',
          borderRadius: '24px',
          backgroundColor: '#16161a',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          padding: '24px',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.75)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          overflowY: 'auto',
          position: 'relative'
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'rgba(166, 252, 41, 0.12)',
              border: '1px solid rgba(166, 252, 41, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Link2 size={18} color="#a6fc29" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#ffffff' }}>
                Links
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#a0a0a0' }}>
                {isOwnProfile ? 'Add and manage your links' : `@${displayName}'s Links`}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#a0a0a0', cursor: 'pointer', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center' }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Add Link Section (Only for Profile Owner) */}
        {isOwnProfile && (
          <div>
            {!isAdding ? (
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(166, 252, 41, 0.08)',
                  border: '1px dashed rgba(166, 252, 41, 0.4)',
                  color: '#a6fc29',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <Plus size={16} /> Add New Link
              </button>
            ) : (
              <form 
                onSubmit={handleAddSubmit}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  padding: '16px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#a6fc29' }}>Add Link</span>
                
                <input
                  type="text"
                  placeholder="Enter URL (e.g. amzn.in/... or website.com)"
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  autoFocus
                  style={{
                    backgroundColor: '#0d0d10',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    color: '#ffffff',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                  required
                />

                <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setLinkInput('');
                    }}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      border: 'none',
                      color: '#e4e4e7',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '10px',
                      backgroundColor: '#a6fc29',
                      border: 'none',
                      color: '#121214',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    Save Link
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Links List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {links.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '32px 16px',
              borderRadius: '16px',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Globe size={32} color="#71717a" />
              <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#a0a0a0' }}>
                No links added yet.
              </p>
              {isOwnProfile && (
                <p style={{ margin: 0, fontSize: '12px', color: '#71717a' }}>
                  Click "+ Add New Link" above to add your store, shopping or social links!
                </p>
              )}
            </div>
          ) : (
            links.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  transition: 'all 0.2s ease'
                }}
              >
                <div 
                  onClick={() => handleOpenLink(item.url)}
                  style={{ 
                    flex: 1, 
                    minWidth: 0, 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Globe size={15} color="#a0a0a0" style={{ flexShrink: 0 }} />
                  <span style={{ 
                    fontSize: '13px', 
                    fontWeight: '600', 
                    color: '#ffffff',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {formatDisplayUrl(item.url)}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  {/* Visit Link Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenLink(item.url)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(166, 252, 41, 0.14)',
                      border: '1px solid rgba(166, 252, 41, 0.4)',
                      color: '#a6fc29',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>Open</span>
                    <ExternalLink size={13} />
                  </button>

                  {/* Delete button (owner only) */}
                  {isOwnProfile && (
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#71717a',
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'color 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#71717a')}
                      aria-label="Delete link"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
}
