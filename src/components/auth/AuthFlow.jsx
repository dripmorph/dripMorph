import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useAuth } from '../../context/AuthContext';

// Lazily load auth screen components for code-splitting
const SplashScreen = lazy(() => import('./SplashScreen'));
const SignUpScreen = lazy(() => import('./SignUpScreen'));
const LogInScreen = lazy(() => import('./LogInScreen'));
const ForgotPasswordScreen = lazy(() => import('./ForgotPasswordScreen'));
const UsernameSelectionScreen = lazy(() => import('./UsernameSelectionScreen'));
const CitySelectionScreen = lazy(() => import('./CitySelectionScreen'));
const ProfileDetailsScreen = lazy(() => import('./ProfileDetailsScreen'));

const AuthFallback = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', width: '100%', background: '#0D0D0F' }}>
    <div style={{ width: '80px', height: '4px', background: 'rgba(166, 252, 41, 0.2)', borderRadius: '2px', overflow: 'hidden' }}>
      <div style={{ width: '50%', height: '100%', background: '#A6FC29', animation: 'pulse 1s infinite alternate' }} />
    </div>
  </div>
);

// Matches auto-generated placeholders created by the handle_new_user() trigger
// for Google OAuth users: 'user_' + 8 hex chars (e.g. 'user_a1b2c3d4').
const PLACEHOLDER_USERNAME_RE = /^user_[a-f0-9]{8}$/;

// Helper function to evaluate required onboarding step
export const getRequiredOnboardingStep = (u) => {
  if (!u) return 'splash';
  // Treat placeholder usernames (Google OAuth auto-generated) the same as no username
  if (!u.username || !u.username.trim() || PLACEHOLDER_USERNAME_RE.test(u.username.trim())) return 'username';
  if (!u.city || !u.city.trim()) return 'city';
  // ProfileDetails is optional — not a blocking onboarding requirement
  return 'complete';
};

export default function AuthFlow({ onAuthComplete }) {
  const { user } = useAuth();
  
  // Initialize screen state strictly based on user state
  const [currentScreen, setCurrentScreen] = useState(() => {
    const step = getRequiredOnboardingStep(user);
    if (step === 'complete') return 'splash';
    return step;
  });

  // If user becomes fully onboarded at any point, notify parent immediately
  useEffect(() => {
    if (user) {
      const step = getRequiredOnboardingStep(user);
      if (step === 'complete') {
        onAuthComplete();
      }
    }
  }, [user, onAuthComplete]);

  const handleSplashFinish = () => {
    if (user) {
      const step = getRequiredOnboardingStep(user);
      if (step === 'complete') {
        onAuthComplete();
      } else {
        setCurrentScreen(step);
      }
    } else {
      setCurrentScreen('signup');
    }
  };

  const handleAuthSuccess = (loggedUser) => {
    const targetUser = loggedUser || user;
    const step = getRequiredOnboardingStep(targetUser);
    if (step === 'complete') {
      onAuthComplete();
    } else {
      setCurrentScreen(step);
    }
  };

  const handleUsernameSelected = () => {
    // Step 1 completed -> Proceed strictly to Step 2 (City)
    setCurrentScreen('city');
  };

  const handleCitySelected = () => {
    // Step 2 completed -> Show optional Profile Details screen
    setCurrentScreen('profileDetails');
  };

  const handleSkipProfileDetails = () => {
    // User skipped Profile Details -> go straight to Feed
    onAuthComplete();
  };

  const handleFinishOnboarding = () => {
    // Step 3 completed -> Onboarding complete -> Feed
    onAuthComplete();
  };

  const renderScreen = () => {
    if (currentScreen === 'splash') {
      return <SplashScreen onFinish={handleSplashFinish} />;
    }

    if (currentScreen === 'signup') {
      return (
        <SignUpScreen
          onNavigateToLogin={() => setCurrentScreen('login')}
          onSignUpSuccess={handleAuthSuccess}
        />
      );
    }

    if (currentScreen === 'login') {
      return (
        <LogInScreen
          onNavigateToSignUp={() => setCurrentScreen('signup')}
          onNavigateToForgotPassword={() => setCurrentScreen('forgot')}
          onLoginSuccess={handleAuthSuccess}
        />
      );
    }

    if (currentScreen === 'forgot') {
      return (
        <ForgotPasswordScreen
          onNavigateToLogin={() => setCurrentScreen('login')}
        />
      );
    }

    if (currentScreen === 'username') {
      return (
        <UsernameSelectionScreen
          onUsernameSelected={handleUsernameSelected}
        />
      );
    }

    if (currentScreen === 'city') {
      return (
        <CitySelectionScreen
          onCitySelected={handleCitySelected}
        />
      );
    }

    if (currentScreen === 'profileDetails') {
      return (
        <ProfileDetailsScreen
          onFinishOnboarding={handleFinishOnboarding}
          onSkip={handleSkipProfileDetails}
        />
      );
    }

    return null;
  };

  return (
    <Suspense fallback={<AuthFallback />}>
      {renderScreen()}
    </Suspense>
  );
}
