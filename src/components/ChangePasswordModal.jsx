import React, { useState, useEffect, useRef } from 'react';
import { X, KeyRound, Mail, Clock, RefreshCw, Eye, EyeOff, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ChangePasswordModal({ isOpen, onClose, showToast }) {
  const { user } = useAuth();
  const email = user?.email || 'stylist@dripmorph.com';

  // Step state: 1 = Send Code, 2 = Enter OTP, 3 = New Password, 4 = Success
  const [step, setStep] = useState(1);

  // OTP state
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpInputsRef = useRef([]);
  const [timer, setTimer] = useState(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [otpError, setOtpError] = useState('');

  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passError, setPassError] = useState('');

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setOtp(['', '', '', '', '', '']);
      setTimer(60);
      setIsTimerRunning(false);
      setOtpError('');
      setNewPassword('');
      setConfirmPassword('');
      setPassError('');
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
    // Only accept numeric digit
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    // Handle paste of 6 digits
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

    // Auto focus next box
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
      if (showToast) showToast('OTP Verified!');
    } else {
      setOtpError('Invalid verification code. Please enter 123456 for testing.');
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    setPassError('');

    if (newPassword.length < 8) {
      setPassError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('Passwords do not match. Please check and try again.');
      return;
    }

    setStep(4);
    if (showToast) showToast('Password updated');

    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="change-pass-overlay" onClick={onClose}>
      <div className="change-pass-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="change-pass-header">
          <div className="change-pass-header-title">
            <KeyRound size={20} className="change-pass-icon-accent" />
            <span>Change Password</span>
          </div>
          <button className="change-pass-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Step 1: Send Code */}
        {step === 1 && (
          <div className="change-pass-step-body">
            <div className="change-pass-graphic-box">
              <Mail size={32} />
            </div>
            <h3 className="change-pass-step-title">Verify Your Identity</h3>
            <p className="change-pass-step-desc">
              We'll send a verification code to your registered email
            </p>
            <div className="change-pass-email-badge">
              <Mail size={14} />
              <span>{email}</span>
            </div>

            <button
              className="change-pass-btn-primary"
              onClick={handleSendCode}
            >
              Send Code
            </button>
          </div>
        )}

        {/* Step 2: 6-Digit OTP */}
        {step === 2 && (
          <form className="change-pass-step-body" onSubmit={handleVerifyOtp}>
            <div className="change-pass-graphic-box">
              <KeyRound size={32} />
            </div>
            <h3 className="change-pass-step-title">Enter Verification Code</h3>
            <p className="change-pass-step-desc">
              Enter the 6-digit code sent to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>
            </p>
            <div className="change-pass-test-hint">
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
                  className={`otp-digit-box ${otpError ? 'error' : ''} ${digit ? 'filled' : ''}`}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  autoFocus={idx === 0}
                />
              ))}
            </div>

            {otpError && (
              <div className="change-pass-error-banner">
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
              className="change-pass-btn-primary"
              disabled={otp.join('').length < 6}
            >
              Verify Code
            </button>
          </form>
        )}

        {/* Step 3: Set New Password */}
        {step === 3 && (
          <form className="change-pass-step-body" onSubmit={handlePasswordSubmit}>
            <div className="change-pass-graphic-box">
              <Lock size={32} />
            </div>
            <h3 className="change-pass-step-title">Create New Password</h3>
            <p className="change-pass-step-desc">
              Set a strong password for your account.
            </p>

            {passError && (
              <div className="change-pass-error-banner">
                <AlertCircle size={15} />
                <span>{passError}</span>
              </div>
            )}

            <div className="change-pass-input-group">
              <label className="change-pass-input-label">New Password</label>
              <div className="change-pass-input-wrapper">
                <Lock size={16} className="change-pass-field-icon" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  className="change-pass-input"
                  placeholder="Min 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="change-pass-eye-btn"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="change-pass-input-group">
              <label className="change-pass-input-label">Confirm New Password</label>
              <div className="change-pass-input-wrapper">
                <Lock size={16} className="change-pass-field-icon" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="change-pass-input"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="change-pass-eye-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="change-pass-btn-primary">
              Update Password
            </button>
          </form>
        )}

        {/* Step 4: Success View */}
        {step === 4 && (
          <div className="change-pass-step-body">
            <div className="change-pass-graphic-box success">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="change-pass-step-title">Password Updated!</h3>
            <p className="change-pass-step-desc">
              Your security credentials have been updated successfully.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
