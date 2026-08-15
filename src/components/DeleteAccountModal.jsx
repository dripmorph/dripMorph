import React, { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle, Trash2, Mail, Clock, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function DeleteAccountModal({ isOpen, onClose, showToast }) {
  const { user, logout } = useAuth();
  const email = user?.email || 'stylist@dripmorph.com';

  // Step state: 1 = Warning & Send Code, 2 = OTP, 3 = Type DELETE, 4 = Goodbye/Logout
  const [step, setStep] = useState(1);

  // OTP state
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpInputsRef = useRef([]);
  const [timer, setTimer] = useState(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [otpError, setOtpError] = useState('');

  // Final confirmation state
  const [deleteInput, setDeleteInput] = useState('');

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setOtp(['', '', '', '', '', '']);
      setTimer(60);
      setIsTimerRunning(false);
      setOtpError('');
      setDeleteInput('');
    }
  }, [isOpen]);

  // Countdown timer effect
  useEffect(() => {
    let interval = null;
    if (isTimerRunning && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setIsTimerRunning(false);
      if (interval) clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timer]);

  if (!isOpen) return null;

  // Handlers
  const handleSendCode = () => {
    setStep(2);
    setTimer(60);
    setIsTimerRunning(true);
    setOtpError('');
    if (showToast) showToast(`Verification code sent to ${email}`);
  };

  const handleResendCode = () => {
    if (timer > 0) return;
    setTimer(60);
    setIsTimerRunning(true);
    setOtp(['', '', '', '', '', '']);
    setOtpError('');
    if (showToast) showToast('New verification code sent!');
  };

  const handleOtpChange = (index, value) => {
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    if (value.length > 1) {
      const pasted = value.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newOtp[i] = pasted[i] || '';
      }
      setOtp(newOtp);
      setOtpError('');
      const lastIndex = Math.min(pasted.length - 1, 5);
      if (otpInputsRef.current[lastIndex]) {
        otpInputsRef.current[lastIndex].focus();
      }
      return;
    }

    newOtp[index] = value;
    setOtp(newOtp);
    setOtpError('');

    if (value && index < 5 && otpInputsRef.current[index + 1]) {
      otpInputsRef.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0 && otpInputsRef.current[index - 1]) {
      otpInputsRef.current[index - 1].focus();
    }
  };

  const handleVerifyOtp = (e) => {
    if (e) e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) {
      setOtpError('Please enter all 6 digits of the verification code.');
      return;
    }
    if (code === '123456') {
      setOtpError('');
      setStep(3);
      if (showToast) showToast('Identity verified.');
    } else {
      setOtpError('Invalid verification code. Please try 123456 for testing.');
    }
  };

  const handleFinalDelete = (e) => {
    e.preventDefault();
    if (deleteInput !== 'DELETE') return;

    setStep(4);
    if (showToast) showToast('Account deleted');

    setTimeout(() => {
      onClose();
      if (logout) logout();
    }, 1800);
  };

  return (
    <div className="delete-acc-overlay" onClick={onClose}>
      <div className="delete-acc-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="delete-acc-header">
          <div className="delete-acc-header-title">
            <AlertTriangle size={20} className="delete-acc-icon-danger" />
            <span>Delete Account</span>
          </div>
          <button className="delete-acc-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Step 1: Warning & Send Code */}
        {step === 1 && (
          <div className="delete-acc-step-body">
            <div className="delete-acc-graphic-box danger">
              <Trash2 size={32} />
            </div>
            <h3 className="delete-acc-step-title">Are you sure?</h3>
            <p className="delete-acc-warning-text">
              This will permanently delete your account, posts, and data. This can't be undone.
            </p>
            <div className="delete-acc-email-badge">
              <Mail size={14} />
              <span>{email}</span>
            </div>

            <button
              className="delete-acc-btn-danger"
              onClick={handleSendCode}
            >
              Send Verification Code
            </button>
          </div>
        )}

        {/* Step 2: 6-Digit OTP */}
        {step === 2 && (
          <form className="delete-acc-step-body" onSubmit={handleVerifyOtp}>
            <div className="delete-acc-graphic-box danger">
              <AlertTriangle size={32} />
            </div>
            <h3 className="delete-acc-step-title">Enter Verification Code</h3>
            <p className="delete-acc-step-desc">
              Enter the 6-digit code sent to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong> to verify deletion.
            </p>
            <div className="delete-acc-test-hint">
              <span>💡 Mock Code: <strong>123456</strong></span>
            </div>

            {/* 6-Digit Inputs */}
            <div className="otp-inputs-wrapper">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (otpInputsRef.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  className={`otp-digit-box danger ${otpError ? 'error' : ''} ${digit ? 'filled' : ''}`}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  autoFocus={idx === 0}
                />
              ))}
            </div>

            {otpError && (
              <div className="delete-acc-error-banner">
                <AlertCircle size={15} />
                <span>{otpError}</span>
              </div>
            )}

            {/* Countdown Timer & Resend Button */}
            <div className="change-pass-timer-row">
              <div className="change-pass-timer-badge">
                <Clock size={14} />
                <span>{timer > 0 ? `00:${timer < 10 ? `0${timer}` : timer}` : '00:00'}</span>
              </div>
              <button
                type="button"
                className={`change-pass-resend-btn ${timer > 0 ? 'disabled' : 'active'}`}
                onClick={handleResendCode}
                disabled={timer > 0}
              >
                <RefreshCw size={13} className={isTimerRunning && timer > 0 ? 'spin' : ''} />
                <span>Resend Code</span>
              </button>
            </div>

            <button
              type="submit"
              className="delete-acc-btn-danger"
              disabled={otp.join('').length < 6}
            >
              Verify Code
            </button>
          </form>
        )}

        {/* Step 3: Type DELETE Confirmation */}
        {step === 3 && (
          <form className="delete-acc-step-body" onSubmit={handleFinalDelete}>
            <div className="delete-acc-graphic-box danger">
              <Trash2 size={32} />
            </div>
            <h3 className="delete-acc-step-title">Final Confirmation</h3>
            <p className="delete-acc-warning-text">
              To confirm deletion, please type <strong style={{ color: '#FF453A' }}>DELETE</strong> in capital letters below:
            </p>

            <div className="delete-acc-input-group">
              <input
                type="text"
                className="delete-acc-confirm-input"
                placeholder="Type DELETE to confirm"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="delete-acc-btn-danger"
              disabled={deleteInput !== 'DELETE'}
            >
              Delete My Account
            </button>
          </form>
        )}

        {/* Step 4: Goodbye State */}
        {step === 4 && (
          <div className="delete-acc-step-body">
            <div className="delete-acc-graphic-box success">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="delete-acc-step-title">Account Deleted</h3>
            <p className="delete-acc-step-desc">
              Your account and data have been removed. We're sorry to see you go.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
