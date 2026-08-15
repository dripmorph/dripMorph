import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import DripMorphLogo from '../DripMorphLogo';

export default function LogInScreen({ onNavigateToSignUp, onNavigateToForgotPassword, onLoginSuccess }) {
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter your email and password');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const loggedUser = await login({ email: email.trim(), password });
      setIsSubmitting(false);
      onLoginSuccess(loggedUser);
    } catch (err) {
      setIsSubmitting(false);
      setError(err.message || 'Invalid credentials. Please try again.');
    }
  };

  const handleGoogleAuth = async () => {
    try {
      await loginWithGoogle();
      // Browser redirects for OAuth — onAuthStateChange handles session on return.
    } catch (err) {
      setError(err.message || 'Google sign-in failed. Please try again.');
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        {/* Header Branding */}
        <div className="auth-brand">
          <DripMorphLogo size={32} />
          <span className="auth-brand-title">DRIPMORPH</span>
        </div>

        <div className="auth-header">
          <h2 className="auth-title">Welcome Back</h2>
          <p className="auth-subtitle">Log in to manage & rank your street style</p>
        </div>

        {error && (
          <div className="auth-error-banner">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Email Field */}
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

          {/* Password Field */}
          <div className="auth-field-group">
            <div className="auth-label-row">
              <label className="auth-label">Password</label>
              <button
                type="button"
                className="auth-forgot-link"
                onClick={onNavigateToForgotPassword}
              >
                Forgot Password?
              </button>
            </div>
            <div className="auth-input-wrapper">
              <Lock size={18} className="auth-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Primary Gradient Log In Button */}
          <button
            type="submit"
            className="auth-btn-primary"
            disabled={isSubmitting}
          >
            <span>{isSubmitting ? 'Logging In...' : 'Log In'}</span>
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="auth-divider">
          <span>OR</span>
        </div>

        {/* Secondary Google Button */}
        <button
          type="button"
          className="auth-btn-google"
          onClick={handleGoogleAuth}
        >
          <svg className="google-svg-icon" viewBox="0 0 24 24" width="20" height="20">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Footer Link to Sign Up */}
        <div className="auth-footer-text">
          <span>Don't have an account?</span>{' '}
          <button type="button" className="auth-link-btn" onClick={onNavigateToSignUp}>
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
}
