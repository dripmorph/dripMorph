import React, { useState } from 'react';
import { X, Copy, Check, Share2, Globe, Sparkles } from 'lucide-react';
import { FaWhatsapp, FaTwitter, FaInstagram } from 'react-icons/fa';

export default function ShareModal({ isOpen, onClose, post, showToast }) {
  const [copied, setCopied] = useState(false);
  const [showInstagramSubmenu, setShowInstagramSubmenu] = useState(false);

  if (!isOpen || !post) return null;

  const shareUrl = `${window.location.origin}/?post=${post.id}`;
  const scoreVal = post.overall_score || post.score || post.aiScore || '8.0';
  const creatorName = post.username || '@creator';
  const shareText = `Check out ${creatorName}'s fit on DripMorph! 🔥 AI Score: ${scoreVal}/10`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      if (showToast) showToast("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // WhatsApp: Directly pre-fills a message to send to any WhatsApp chat
  const handleWhatsAppShare = () => {
    const textToSend = `${shareText}\n\nCheck it out on DripMorph:\n${shareUrl}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(textToSend)}`;
    if (showToast) showToast("Opening WhatsApp...");
    window.open(waUrl, '_blank');
  };

  // Twitter / X: Directly opens tweet composer with pre-filled content & link
  const handleTwitterShare = () => {
    const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    if (showToast) showToast("Opening X (Twitter) post composer...");
    window.open(twUrl, '_blank');
  };

  // Instagram Story: Copies caption/link and directs to Instagram Stories
  const handleInstagramStory = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
    } catch (e) {
      console.warn(e);
    }
    if (showToast) showToast("Fit link copied! Opening Instagram Stories 📸");

    // Try Instagram Story deep-link for mobile, fallback to web
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = 'instagram://story-camera';
      setTimeout(() => {
        window.open('https://www.instagram.com/', '_blank');
      }, 1200);
    } else {
      window.open('https://www.instagram.com/', '_blank');
    }
  };

  // Instagram Post: Copies caption/link and directs to Instagram Feed
  const handleInstagramPost = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
    } catch (e) {
      console.warn(e);
    }
    if (showToast) showToast("Fit link copied! Opening Instagram to create a Post 🖼️");

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = 'instagram://camera';
      setTimeout(() => {
        window.open('https://www.instagram.com/', '_blank');
      }, 1200);
    } else {
      window.open('https://www.instagram.com/', '_blank');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'DripMorph Fit Check',
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        if (err.name !== 'AbortError') console.error(err);
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div 
      className="share-modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(8px)',
        padding: '16px'
      }}
    >
      <div 
        className="share-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '400px',
          borderRadius: '24px',
          backgroundColor: '#16161a',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          padding: '22px',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Share2 size={20} color="#a6fc29" /> Share Fit
          </h3>
          <button 
            type="button" 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#a0a0a0', cursor: 'pointer', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center' }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Post Preview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '14px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <img 
            src={post.image || post.image_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop'} 
            alt="Fit preview" 
            style={{ width: '56px', height: '56px', borderRadius: '10px', objectFit: 'cover' }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {creatorName}
            </p>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#a6fc29', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={12} /> {scoreVal} AI Score
            </p>
          </div>
        </div>

        {/* Action Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          {/* Copy Link */}
          <button 
            type="button" 
            onClick={handleCopyLink}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px',
              borderRadius: '12px',
              backgroundColor: copied ? 'rgba(166, 252, 41, 0.15)' : 'rgba(255, 255, 255, 0.07)',
              border: copied ? '1px solid #a6fc29' : '1px solid rgba(255, 255, 255, 0.1)',
              color: copied ? '#a6fc29' : '#ffffff',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {copied ? <Check size={16} color="#a6fc29" /> : <Copy size={16} color="#a0a0a0" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>

          {/* WhatsApp Chat */}
          <button 
            type="button" 
            onClick={handleWhatsAppShare}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px',
              borderRadius: '12px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34d399',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <FaWhatsapp size={17} />
            WhatsApp
          </button>

          {/* Instagram Story */}
          <button 
            type="button" 
            onClick={handleInstagramStory}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px',
              borderRadius: '12px',
              backgroundColor: 'rgba(236, 72, 153, 0.12)',
              border: '1px solid rgba(236, 72, 153, 0.3)',
              color: '#f472b6',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <FaInstagram size={17} />
            IG Story
          </button>

          {/* Instagram Post */}
          <button 
            type="button" 
            onClick={handleInstagramPost}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px',
              borderRadius: '12px',
              backgroundColor: 'rgba(168, 85, 247, 0.12)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              color: '#c084fc',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <FaInstagram size={17} />
            IG Post
          </button>

          {/* X (Twitter) Post - Full Span */}
          <button 
            type="button" 
            onClick={handleTwitterShare}
            style={{
              gridColumn: 'span 2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '12px',
              borderRadius: '12px',
              backgroundColor: 'rgba(14, 165, 233, 0.12)',
              border: '1px solid rgba(14, 165, 233, 0.3)',
              color: '#38bdf8',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <FaTwitter size={17} />
            Post to X (Twitter)
          </button>
        </div>

        {/* Full Width Native Share */}
        <button 
          type="button" 
          onClick={handleNativeShare}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '13px',
            borderRadius: '12px',
            backgroundColor: 'var(--accent-lime, #a6fc29)',
            border: 'none',
            color: '#121214',
            fontSize: '13px',
            fontWeight: '800',
            cursor: 'pointer',
            marginTop: '2px',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 14px rgba(166, 252, 41, 0.3)'
          }}
        >
          <Globe size={16} />
          More Share Options
        </button>
      </div>
    </div>
  );
}
