import React, { useState, useRef, useEffect } from 'react';
import { X, Copy, Check, Download, Share2, Sun, Moon } from 'lucide-react';
import { FaWhatsapp, FaInstagram } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { toPng, toBlob } from 'html-to-image';
import DripShareCard from './DripShareCard';

export default function ShareModal({ isOpen, onClose, post, showToast }) {
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Read the app's current theme on open, default to 'dark'
  const getAppTheme = () => {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  };

  const [cardTheme, setCardTheme] = useState('dark');
  const cardRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setCardTheme(getAppTheme());
    }
  }, [isOpen]);

  if (!isOpen || !post) return null;

  const shareUrl = `${window.location.origin}/?post=${post.id}`;
  const scoreVal = post.overall_score || post.score || '8.0';
  const rawUsername = (post.username || 'creator').replace(/^@/, '');
  const usernameStr = `@${rawUsername}`;
  const shareText = `Check out ${rawUsername}'s fit on DripMorph! 🔥 AI Drip Rating: ${scoreVal}/10`;

  // Formatted display name for summary
  const formatDisplayName = () => {
    if (post?.display_name) return post.display_name;
    if (post?.full_name) return post.full_name;
    if (post?.author_name) return post.author_name;
    if (post?.user?.display_name) return post.user.display_name;
    if (post?.user?.full_name) return post.user.full_name;

    const lower = rawUsername.toLowerCase();
    if (lower === 'rishideep') return 'Rishideep Mallick';
    if (lower === 'streetstyle_icon') return 'Streetstyle Icon';
    if (lower === 'neon_wanderer') return 'Neon Wanderer';
    if (lower === 'brutal_aesthetic') return 'Brutal Aesthetic';
    if (lower === 'cyber_ninja') return 'Cyber Ninja';
    if (lower === 'tokyo_tide') return 'Tokyo Tide';
    if (lower === 'berlin_minimalist') return 'Berlin Minimalist';

    return rawUsername
      .split(/[._-]/)
      .filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const displayName = formatDisplayName();

  // ── 1. Copy Link ──────────────────────────────────────────────────────────
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      if (showToast) showToast('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // ── 2. Download High-Res PNG Card ─────────────────────────────────────────
  const handleDownloadCard = async () => {
    if (!cardRef.current) return;
    try {
      setIsGenerating(true);
      if (showToast) showToast('Generating high-res Drip Card...');

      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 3, // Crisp 1080x1920 export
        quality: 1,
      });

      const link = document.createElement('a');
      link.download = `DripMorph-${rawUsername}-${cardTheme}.png`;
      link.href = dataUrl;
      link.click();

      if (showToast) showToast('Drip Card downloaded successfully!');
    } catch (err) {
      console.error('Error generating card image:', err);
      if (showToast) showToast('Failed to download image. Try copying link instead.');
    } finally {
      setIsGenerating(false);
    }
  };

  // ── 3. WhatsApp Share ─────────────────────────────────────────────────────
  const handleWhatsAppShare = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
    window.open(waUrl, '_blank');
  };

  // ── 4. X (Twitter) Share ──────────────────────────────────────────────────
  const handleTwitterShare = () => {
    const xUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(xUrl, '_blank');
  };

  // ── 5. Instagram Share / Story Share ──────────────────────────────────────
  const handleInstagramShare = async () => {
    if (cardRef.current && navigator.canShare) {
      try {
        setIsGenerating(true);
        const blob = await toBlob(cardRef.current, {
          cacheBust: true,
          pixelRatio: 3,
          quality: 1,
        });

        if (blob) {
          const file = new File([blob], `DripMorph-${rawUsername}.png`, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'DripMorph Fit Check',
              text: `${shareText}\n${shareUrl}`,
            });
            return;
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') console.error('Instagram share error:', err);
      } finally {
        setIsGenerating(false);
      }
    }

    // Fallback: Download card & open Instagram
    await handleDownloadCard();
    if (showToast) showToast('Drip card saved! Opening Instagram...');
    window.open('https://www.instagram.com/', '_blank');
  };

  // ── 6. Native Share with Image Blob ───────────────────────────────────────
  const handleNativeShare = async () => {
    if (cardRef.current && navigator.share) {
      try {
        setIsGenerating(true);
        const blob = await toBlob(cardRef.current, {
          cacheBust: true,
          pixelRatio: 3,
          quality: 1,
        });

        if (blob) {
          const file = new File([blob], `DripMorph-${rawUsername}.png`, { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'DripMorph Fit Check',
              text: `${shareText}\n${shareUrl}`,
            });
            return;
          }
        }

        // Fallback text-only native share
        await navigator.share({
          title: 'DripMorph Fit Check',
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Native share failed:', err);
          handleCopyLink();
        }
      } finally {
        setIsGenerating(false);
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal-card-v2" onClick={(e) => e.stopPropagation()}>
        {/* Left Column (Desktop) / Top Section (Mobile): Full Story Card Preview */}
        <div className="share-modal-preview-col">
          <div className="share-story-scale-container">
            <DripShareCard
              post={post}
              theme={cardTheme}
              cardRef={cardRef}
            />
          </div>
        </div>

        {/* Right Column (Desktop) / Bottom Section (Mobile): Modal Controls & Actions */}
        <div className="share-modal-controls-col">
          {/* Header Row */}
          <div className="share-modal-header-v2">
            <div className="share-modal-title-row">
              <Share2 size={20} className="share-modal-title-icon" />
              <h3 className="share-modal-title-text">Share Drip Card</h3>
            </div>

            <button
              type="button"
              className="share-modal-close-btn-v2"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Theme Selector Section */}
          <div className="share-theme-section">
            <span className="share-section-label">Card Template Style:</span>
            <div className="share-theme-toggle-pill">
              <button
                type="button"
                className={`theme-pill-btn ${cardTheme === 'light' ? 'active' : ''}`}
                onClick={() => setCardTheme('light')}
                title="Light Mode Template"
              >
                <Sun size={14} />
                <span>Light</span>
              </button>
              <button
                type="button"
                className={`theme-pill-btn ${cardTheme === 'dark' ? 'active' : ''}`}
                onClick={() => setCardTheme('dark')}
                title="Dark Mode Template"
              >
                <Moon size={14} />
                <span>Dark</span>
              </button>
            </div>
          </div>

          {/* Quick Post Info Card */}
          <div className="share-info-card">
            <div className="share-info-avatar-row">
              <img
                src={post.image || post.image_url || post.outfit_image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop'}
                alt="Thumbnail"
                className="share-info-thumb"
              />
              <div className="share-info-meta">
                <span className="share-info-name">{displayName}</span>
                <span className="share-info-user">{usernameStr}</span>
              </div>
              <div className="share-info-score-badge">
                <span>★ {scoreVal}</span>
              </div>
            </div>
            <p className="share-info-hint">
              High-resolution 9:16 cyber story card ready to export and share.
            </p>
          </div>

          {/* Actions Bar */}
          <div className="share-modal-actions-v2">
            {/* Primary Download Button */}
            <button
              type="button"
              className="share-download-hero-btn"
              onClick={handleDownloadCard}
              disabled={isGenerating}
            >
              <Download size={18} />
              <span>{isGenerating ? 'Generating Story PNG...' : 'Download Drip Card (PNG)'}</span>
            </button>

            {/* Social Grid */}
            <div className="share-modal-grid-v2">
              <button
                type="button"
                className={`share-action-pill share-pill-copy ${copied ? 'copied' : ''}`}
                onClick={handleCopyLink}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>

              <button
                type="button"
                className="share-action-pill share-pill-whatsapp"
                onClick={handleWhatsAppShare}
              >
                <FaWhatsapp size={16} />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                className="share-action-pill share-pill-instagram"
                onClick={handleInstagramShare}
                disabled={isGenerating}
              >
                <FaInstagram size={16} />
                <span>Instagram</span>
              </button>

              <button
                type="button"
                className="share-action-pill share-pill-twitter"
                onClick={handleTwitterShare}
              >
                <FaXTwitter size={16} />
                <span>X</span>
              </button>
            </div>

            {/* Native System Share */}
            <button
              type="button"
              className="share-modal-more-btn-v2"
              onClick={handleNativeShare}
              disabled={isGenerating}
            >
              <Share2 size={16} />
              <span>More Share Options</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
