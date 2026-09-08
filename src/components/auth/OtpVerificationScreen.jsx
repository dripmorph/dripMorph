import React, { useState, useEffect, useRef } from 'react';
import { Mail, ArrowRight, ArrowLeft, RefreshCw, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import DripMorphLogo from '../DripMorphLogo';

export default function OtpVerificationScreen({
  email,
  username,
  ageVerified = true,
  onVerifySuccess,
  onBackToSignUp
}) {
  const { verifyOtp, resendOtp } = useAuth();
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(30);

  const inputRefs = useRef([]);

  // Auto-focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // 30-second cooldown timer for resending OTP
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [countdown]);

  const handleDigitChange = (index, value) => {
    // Only accept numeric characters
    const cleanVal = value.replace(/\D/g, '');
    if (!cleanVal && value !== '') return;

    const newDigits = [...digits];
    // If user typed/pasted multiple digits into one field
    if (cleanVal.length > 1) {
      const pastedDigits = cleanVal.slice(0, 6).split('');
      pastedDigits.forEach((digit, i) => {
        if (index + i < 6) {
          newDigits[index + i] = digit;
        }
      });
      setDigits(newDigits);
      const nextFocusIndex = Math.min(index + pastedDigits.length, 5);
      if (inputRefs.current[nextFocusIndex]) {
        inputRefs.current[nextFocusIndex].focus();
      }
      return;
    }

    newDigits[index] = cleanVal ? cleanVal[cleanVal.length - 1] : '';
    setDigits(newDigits);
    setError('');

    // Auto-advance to next input if digit entered
    if (cleanVal && index < 5) {
      if (inputRefs.current[index + 1]) {
        inputRefs.current[index + 1].focus();
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Move focus back and delete previous
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        if (inputRefs.current[index - 1]) {
          inputRefs.current[index - 1].focus();
        }
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newDigits = [...digits];
    pastedData.split('').forEach((char, idx) => {
      if (idx < 6) newDigits[idx] = char;
    });
    setDigits(newDigits);
    setError('');

    // Focus last filled index or submit
    const focusTarget = Math.min(pastedData.length, 5);
    inputRefs.current[focusTarget]?.focus();

    if (pastedData.length === 6) {
      executeVerify(newDigits.join(''));
    }
  };

  const executeVerify = async (codeToVerify) => {
    const code = codeToVerify || digits.join('');
    if (code.length < 6) {
      setError('Please enter the complete 6-digit code.');
      return;
    }

    setError('');
    setSuccessMsg('');
    setIsVerifying(true);

    try {
      console.log('[OtpVerificationScreen] Submitting OTP verification for:', email);
      const appUser = await verifyOtp({
        email: email.trim(),
        token: code,
        username,
        ageVerified
      });

      console.log('[OtpVerificationScreen] OTP verification success:', appUser);
      setSuccessMsg('Account verified successfully!');
      setIsVerifying(false);

      if (onVerifySuccess) {
        onVerifySuccess(appUser);
      }
    } catch (err) {
      console.error('[OtpVerificationScreen] OTP Verification error:', err);
      setIsVerifying(false);
      setError(err.message || 'Invalid or expired code. Please try again.');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    executeVerify();
  };

  const handleResend = async () => {
    if (countdown > 0 || isResending) return;

    setIsResending(true);
    setError('');
    setSuccessMsg('');

    try {
      await resendOtp(email);
      setSuccessMsg('New verification code sent to your email!');
      setCountdown(30);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err.message || 'Could not resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const isComplete = digits.every((d) => d !== '');

  return (
    <div className="auth-screen">
      <div className="auth-card otp-auth-card">
        {/* Header Branding */}
        <div className="auth-brand">
          <DripMorphLogo size={32} />
          <span className="auth-brand-title">DRIPMORPH</span>
        </div>

        <div className="auth-header" style={{ textAlign: 'center', alignItems: 'center' }}>
          <div className="otp-icon-badge">
            <ShieldCheck size={28} style={{ color: '#a6fc29' }} />
          </div>
          <h2 className="auth-title" style={{ marginTop: '8px' }}>Verify Your Email</h2>
          <p className="auth-subtitle">
            Enter the 6-digit code sent to<br />
            <strong style={{ color: 'var(--text-primary)', wordBreak: 'break-all' }}>{email}</strong>
          </p>
        </div>

        {error && (
          <div className="auth-error-banner">
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="auth-success-banner" style={{
            backgroundColor: 'rgba(166, 252, 41, 0.12)',
            border: '1px solid rgba(166, 252, 41, 0.4)',
            color: 'var(--accent-solid, #a6fc29)',
            padding: '10px 14px',
            borderRadius: '12px',
            fontSize: '0.82rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" style={{ gap: '22px' }}>
          {/* 6 Digit Input Group */}
          <div className="otp-inputs-wrapper" onPaste={handlePaste}>
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={2}
                autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                className={`otp-digit-box ${digit ? 'filled' : ''}`}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                disabled={isVerifying}
                aria-label={`Digit ${idx + 1}`}
              />
            ))}
          </div>

          {/* Primary Submit Button */}
          <button
            type="submit"
            className="auth-btn-primary"
            disabled={!isComplete || isVerifying}
            style={{ height: '48px' }}
          >
            {isVerifying ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <span>Verify & Continue</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Resend Code Section */}
        <div className="otp-resend-section">
          <span>Didn't receive the email?</span>
          {countdown > 0 ? (
            <span className="otp-countdown-text">
              Resend code in <strong>0:{countdown < 10 ? `0${countdown}` : countdown}</strong>
            </span>
          ) : (
            <button
              type="button"
              className="otp-resend-btn"
              onClick={handleResend}
              disabled={isResending}
            >
              {isResending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <RefreshCw size={14} />
                  <span>Resend Code</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Change Email / Back to Sign Up */}
        <div className="auth-footer-text" style={{ marginTop: '4px' }}>
          <button
            type="button"
            className="auth-back-link"
            onClick={onBackToSignUp}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ArrowLeft size={16} />
            <span>Wrong email? Change details</span>
          </button>
        </div>
      </div>
    </div>
  );
}
