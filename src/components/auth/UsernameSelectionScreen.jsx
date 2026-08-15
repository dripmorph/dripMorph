import React, { useState } from 'react';
import { User, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import DripMorphLogo from '../DripMorphLogo';

// List of taken usernames for demonstration of availability checking
const TAKEN_USERNAMES = ['admin', 'dripmorph', 'streetwear', 'enzo', 'cyberpunk', 'techwear'];

export default function UsernameSelectionScreen({ onUsernameSelected }) {
  const { updateUsername } = useAuth();
  const [rawInput, setRawInput] = useState('');
  const [error, setError] = useState('');

  // Clean raw input (remove leading @ if typed)
  const cleanedValue = rawInput.replace(/^@/, '').trim();

  // Real-time validation rules
  const hasMinLength = cleanedValue.length >= 3;
  const hasNoSpaces = !/\s/.test(cleanedValue);
  const isValidChars = /^[a-zA-Z0-9_]*$/.test(cleanedValue);
  const isNotTaken = !TAKEN_USERNAMES.includes(cleanedValue.toLowerCase());

  const isValid = cleanedValue.length > 0 && hasMinLength && hasNoSpaces && isValidChars && isNotTaken;

  const getStatusMessage = () => {
    if (!cleanedValue) return null;
    if (!hasNoSpaces) return { text: 'Spaces are not allowed in usernames', type: 'error' };
    if (!isValidChars) return { text: 'Only letters, numbers, and underscores allowed', type: 'error' };
    if (!hasMinLength) return { text: 'Username must be at least 3 characters', type: 'error' };
    if (!isNotTaken) return { text: 'This username is already taken', type: 'error' };
    return { text: 'Username is available!', type: 'success' };
  };

  const status = getStatusMessage();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) {
      setError('Please enter a valid, available username');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalUsername = `@${cleanedValue}`;
      await updateUsername(finalUsername, true); // true = age verified
      if (onUsernameSelected) {
        onUsernameSelected(finalUsername);
      }
    } catch (err) {
      setError(err.message || 'Could not save username. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        {/* Step Indicator */}
        <div className="auth-step-badge">
          <span>STEP 1 OF 3 • ONBOARDING</span>
        </div>

        {/* Header Branding */}
        <div className="auth-brand">
          <DripMorphLogo size={32} />
          <span className="auth-brand-title">DRIPMORPH</span>
        </div>

        <div className="auth-header">
          <h2 className="auth-title">Choose Your Username</h2>
          <p className="auth-subtitle">Create your unique @handle on the DripMorph network</p>
        </div>

        {error && (
          <div className="auth-error-banner">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field-group">
            <label className="auth-label">Unique Handle</label>
            <div className={`auth-input-wrapper username-input-wrapper ${status?.type === 'error' ? 'invalid' : ''} ${status?.type === 'success' ? 'valid' : ''}`}>
              <span className="username-prefix">@</span>
              <input
                type="text"
                className="auth-input username-input"
                placeholder="streetwear_creator"
                value={rawInput}
                onChange={(e) => {
                  setRawInput(e.target.value);
                  setError('');
                }}
                autoFocus
                required
              />
              {status && (
                <div className="username-status-icon">
                  {status.type === 'success' ? (
                    <CheckCircle2 size={18} className="icon-success" />
                  ) : (
                    <XCircle size={18} className="icon-error" />
                  )}
                </div>
              )}
            </div>

            {/* Real-time Indicator Message */}
            {status && (
              <div className={`username-status-badge ${status.type}`}>
                <span>{status.text}</span>
              </div>
            )}
          </div>

          {/* Validation Checklist Hint */}
          <div className="username-rules-card">
            <span className="rules-title">Username Rules:</span>
            <ul className="rules-list">
              <li className={hasMinLength ? 'met' : ''}>Minimum 3 characters</li>
              <li className={hasNoSpaces ? 'met' : ''}>No spaces</li>
              <li className={isValidChars ? 'met' : ''}>Letters, numbers, & underscores only</li>
            </ul>
          </div>

          {/* Age Confirmation Checkbox */}
          <div className="age-confirm-wrapper">
            <label className="age-confirm-label">
              <input
                type="checkbox"
                className="age-confirm-checkbox"
                checked={ageConfirmed}
                onChange={(e) => setAgeConfirmed(e.target.checked)}
                id="age-confirm-username"
              />
              <span className="age-confirm-text">
                I confirm I am <strong>18 years of age or older</strong>
              </span>
            </label>
          </div>

          <button
            type="submit"
            className="auth-btn-primary"
            disabled={!isValid || !ageConfirmed || isSubmitting}
          >
            <span>{isSubmitting ? 'Saving...' : 'Continue to City Selection'}</span>
            <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
