import React, { useState } from 'react';
import { X, AlertCircle, Mail, Copy, Check, ExternalLink } from 'lucide-react';

export default function ReportProblemModal({ isOpen, onClose, showToast }) {
  const [copied, setCopied] = useState(false);
  const supportEmail = 'dripmorph@gmail.com';

  if (!isOpen) return null;

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(supportEmail);
      setCopied(true);
      if (showToast) showToast('Email copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      if (showToast) showToast('Failed to copy email.');
    }
  };

  const handleOpenMail = () => {
    window.open(`mailto:${supportEmail}?subject=DripMorph%20Problem%20Report`, '_blank');
  };

  return (
    <div className="change-pass-overlay" onClick={onClose}>
      <div 
        className="change-pass-modal" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '440px' }}
      >
        {/* Header */}
        <div className="change-pass-header">
          <div className="change-pass-header-title">
            <AlertCircle size={20} className="change-pass-icon-accent" />
            <span>Report a Problem</span>
          </div>
          <button 
            type="button" 
            className="change-pass-close-btn" 
            onClick={onClose} 
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="change-pass-step-body" style={{ textAlign: 'center', padding: '12px 4px 8px 4px' }}>
          <div className="change-pass-graphic-box">
            <Mail size={32} />
          </div>

          <h3 className="change-pass-step-title" style={{ marginTop: '8px' }}>
            Report an Issue
          </h3>

          <p className="change-pass-step-desc" style={{ fontSize: '0.98rem', lineHeight: '1.6', margin: '8px 0 24px 0' }}>
            send your report on <strong style={{ color: 'var(--text-primary, #ffffff)', fontWeight: '800' }}>{supportEmail}</strong>
          </p>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
            <button
              type="button"
              onClick={handleCopyEmail}
              className="change-pass-btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                cursor: 'pointer'
              }}
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Email Address'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenMail}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                color: 'var(--text-primary, #ffffff)',
                border: '1px solid var(--border-color, rgba(255, 255, 255, 0.12))',
                fontWeight: '700',
                fontSize: '0.92rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <ExternalLink size={16} />
              <span>Open Email Client</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
