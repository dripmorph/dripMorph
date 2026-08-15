import React, { useState } from 'react';
import { Mail, Layers, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPasswordScreen({ onNavigateToLogin }) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your registered email address');
      return;
    }
    setError('');
    setSubmitted(true);
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        {/* Header Branding */}
        <div className="auth-brand">
          <div className="auth-brand-logo">
            <Layers size={28} />
          </div>
          <span className="auth-brand-title">DRIPMORPH</span>
        </div>

        <div className="auth-header">
          <h2 className="auth-title">Reset Password</h2>
          <p className="auth-subtitle">
            Enter your email address to receive password reset instructions.
          </p>
        </div>

        {submitted ? (
          <div className="auth-success-box">
            <CheckCircle size={36} className="auth-success-icon" />
            <h3 className="auth-success-title">Reset Link Sent!</h3>
            <p className="auth-success-text">
              We have dispatched a password reset link to <strong>{email}</strong>. Check your inbox to proceed.
            </p>
            <button
              type="button"
              className="auth-btn-primary"
              onClick={onNavigateToLogin}
              style={{ marginTop: '16px' }}
            >
              <span>Back to Log In</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            {error && (
              <div className="auth-error-banner">
                <span>{error}</span>
              </div>
            )}

            <div className="auth-field-group">
              <label className="auth-label">Email Address</label>
              <div className="auth-input-wrapper">
                <Mail size={18} className="auth-input-icon" />
                <input
                  type="email"
                  className="auth-input"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="auth-btn-primary">
              <span>Send Reset Link</span>
            </button>

            <button
              type="button"
              className="auth-back-link"
              onClick={onNavigateToLogin}
            >
              <ArrowLeft size={16} />
              <span>Back to Log In</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
