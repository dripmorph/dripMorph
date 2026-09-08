import React, { useState } from 'react';
import { X, Copy, Check, Send, Share2, Globe } from 'lucide-react';
import { FaWhatsapp, FaInstagram } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';

export default function ShareModal({ isOpen, onClose, post, showToast }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !post) return null;

  const shareUrl = `${window.location.origin}/?post=${post.id}`;
  const scoreVal = post.overall_score || post.score || '8.0';
  const creatorName = (post.username || 'creator').replace(/^@/, '');
  const shareText = `Check out ${creatorName}'s fit on DripMorph! AI Score: ${scoreVal}/10`;

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

  const handleWhatsAppShare = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
    window.open(waUrl, '_blank');
  };

  const handleTwitterShare = () => {
    const xUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(xUrl, '_blank');
  };

  const handleInstagramShare = async () => {
    await handleCopyLink();
    if (showToast) showToast("Link copied! Opening Instagram...");
    window.open('https://www.instagram.com/', '_blank');
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
    >
      <div 
        className="share-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="share-modal-header">
          <h3 className="share-modal-title">
            <Share2 size={20} className="share-modal-title-icon" />
            <span>Share Fit</span>
          </h3>
          <button 
            type="button" 
            className="share-modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Post Preview */}
        <div className="share-modal-preview">
          <img 
            src={post.image || post.image_url || post.outfit_image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop'} 
            alt="Fit preview" 
            className="share-modal-preview-img"
          />
          <div className="share-modal-preview-info">
            <p className="share-modal-preview-username">
              {creatorName}
            </p>
            <p className="share-modal-preview-score">
              ★ {scoreVal}/10 AI Score
            </p>
          </div>
        </div>

        {/* Action Grid */}
        <div className="share-modal-grid">
          <button 
            type="button" 
            className={`share-modal-btn share-modal-btn-copy ${copied ? 'copied' : ''}`}
            onClick={handleCopyLink}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? 'Copied!' : 'Copy Link'}</span>
          </button>

          <button 
            type="button" 
            className="share-modal-btn share-modal-btn-whatsapp"
            onClick={handleWhatsAppShare}
          >
            <FaWhatsapp size={16} />
            <span>WhatsApp</span>
          </button>

          <button 
            type="button" 
            className="share-modal-btn share-modal-btn-instagram"
            onClick={handleInstagramShare}
          >
            <FaInstagram size={16} />
            <span>Instagram</span>
          </button>

          <button 
            type="button" 
            className="share-modal-btn share-modal-btn-twitter"
            onClick={handleTwitterShare}
          >
            <FaXTwitter size={16} />
            <span>X</span>
          </button>
        </div>

        {/* Full Width Native Share */}
        <button 
          type="button" 
          className="share-modal-btn-more"
          onClick={handleNativeShare}
        >
          <Globe size={16} />
          <span>More Share Options</span>
        </button>
      </div>
    </div>
  );
}
