import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useAuth, getRequiredOnboardingStep } from '../../context/AuthContext';

// Lazily load auth screen components for code-splitting
const SplashScreen = lazy(() => import('./SplashScreen'));
const SignUpScreen = lazy(() => import('./SignUpScreen'));
const OtpVerificationScreen = lazy(() => import('./OtpVerificationScreen'));
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

export default function AuthFlow({ onAuthComplete }) {
  const { user } = useAuth();
  const [pendingSignupData, setPendingSignupData] = useState(null);
  
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

  const handleRequiresOtp = (signupData) => {
    setPendingSignupData(signupData);
    setCurrentScreen('otp');
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
          initialData={pendingSignupData || {}}
          onNavigateToLogin={() => setCurrentScreen('login')}
          onSignUpSuccess={handleAuthSuccess}
          onRequiresOtp={handleRequiresOtp}
        />
      );
    }

    if (currentScreen === 'otp') {
      return (
        <OtpVerificationScreen
          email={pendingSignupData?.email || ''}
          username={pendingSignupData?.username || ''}
          ageVerified={pendingSignupData?.ageVerified ?? true}
          onVerifySuccess={handleAuthSuccess}
          onBackToSignUp={() => setCurrentScreen('signup')}
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
