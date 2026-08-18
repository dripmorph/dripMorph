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
          maxWidth: '380px',
          borderRadius: '20px',
          backgroundColor: '#16161a',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          padding: '20px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Share2 size={20} color="#a6fc29" /> Share Fit
          </h3>
          <button 
            type="button" 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#a0a0a0', cursor: 'pointer', padding: '4px', borderRadius: '50%', display: 'flex', alignItems: 'center' }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Post Preview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <img 
            src={post.image || post.image_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop'} 
            alt="Fit preview" 
            style={{ width: '56px', height: '56px', borderRadius: '10px', objectFit: 'cover' }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {creatorName}
            </p>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#a6fc29', fontFamily: 'monospace', fontWeight: '700' }}>
              ★ {scoreVal}/10 AI Score
            </p>
          </div>
        </div>

        {/* Action Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          <button 
            type="button" 
            onClick={handleCopyLink}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px',
              borderRadius: '12px',
              backgroundColor: copied ? 'rgba(166, 252, 41, 0.15)' : 'rgba(255, 255, 255, 0.08)',
              border: copied ? '1px solid #a6fc29' : '1px solid rgba(255, 255, 255, 0.1)',
              color: copied ? '#a6fc29' : '#ffffff',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {copied ? <Check size={16} color="#a6fc29" /> : <Copy size={16} color="#a0a0a0" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>

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
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <FaWhatsapp size={16} />
            WhatsApp
          </button>

          <button 
            type="button" 
            onClick={handleInstagramShare}
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
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <FaInstagram size={16} />
            Instagram
          </button>

          <button 
            type="button" 
            onClick={handleTwitterShare}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <FaXTwitter size={16} />
            X
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
            padding: '12px',
            borderRadius: '12px',
            backgroundColor: 'var(--accent-lime, #a6fc29)',
            border: 'none',
            color: '#121214',
            fontSize: '13px',
            fontWeight: '700',
            cursor: 'pointer',
            marginTop: '4px',
            transition: 'all 0.2s ease'
          }}
        >
          <Globe size={16} />
          More Share Options
        </button>
      </div>
    </div>
  );
}
