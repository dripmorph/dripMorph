import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// ─── Helper: fetch the profiles row for a given Supabase user id ──────────────
async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) {
    console.error('[AuthContext] fetchProfile error:', error);
    return null;
  }
  return data;
}

export const PLACEHOLDER_USERNAME_RE = /^user_[a-f0-9]{8}$/;

export const getRequiredOnboardingStep = (u) => {
  if (!u) return 'splash';
  // Treat placeholder usernames (Google OAuth auto-generated) the same as no username
  if (!u.username || !u.username.trim() || PLACEHOLDER_USERNAME_RE.test(u.username.trim())) return 'username';
  if (!u.city || !u.city.trim()) return 'city';
  // ProfileDetails is optional — not a blocking onboarding requirement
  return 'complete';
};

export const isUserFullyOnboarded = (u) => getRequiredOnboardingStep(u) === 'complete';

// ─── Helper: map a Supabase auth user + profiles row into the app user shape ──
function buildAppUser(authUser, profile) {
  const userObj = {
    id: authUser.id,
    email: authUser.email,
    username: profile?.username ?? null,
    avatar: profile?.avatar_url ?? null,
    city: profile?.city ?? null,
    height: profile?.height ?? null,
    gender: profile?.gender ?? null,
    instagramLink: profile?.instagram_link ?? null,
    ageVerified: profile?.age_verified ?? false,
    userMetadata: authUser?.user_metadata || {},
  };
  return {
    ...userObj,
    hasCompletedOnboarding: isUserFullyOnboarded(userObj),
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── On mount: restore existing Supabase session and subscribe to changes ──
  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && mounted) {
        const profile = await fetchProfile(session.user.id);
        setUser(buildAppUser(session.user, profile));
      }
      if (mounted) setLoading(false);
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          const profile = await fetchProfile(session.user.id);
          setUser(buildAppUser(session.user, profile));
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        } else if (event === 'USER_UPDATED' && session?.user) {
          const profile = await fetchProfile(session.user.id);
          setUser(buildAppUser(session.user, profile));
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ── Sign Up ────────────────────────────────────────────────────────────────
  const signup = async ({ email, password, username, ageVerified = false }) => {
    const formattedUsername = username
      ? username.startsWith('@') ? username.slice(1) : username
      : null;

    console.log('[AuthContext] Initiating signup for:', { email: email.trim(), username: formattedUsername, ageVerified });

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { username: formattedUsername },
      },
    });

    if (error) {
      console.error('[AuthContext] Supabase Auth signUp raw error:', error);
      console.error('[AuthContext] Error details:', {
        message: error.message,
        status: error.status,
        name: error.name,
        code: error.code,
      });
      throw new Error(error.message || 'Could not create account. Please try again.');
    }

    console.log('[AuthContext] Supabase Auth signUp response data:', data);

    // Detect duplicate email signups:
    // When email enumeration protection or email confirmations are enabled in Supabase,
    // signUp returns data.user with an empty identities array ([]) rather than an error object.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      console.warn('[AuthContext] Duplicate email detected (identities array is empty):', email);
      throw new Error('An account with this email address already exists. Please log in instead.');
    }

    // If Supabase requires email confirmation, user is null here.
    // The trigger creates the profile row asynchronously.
    if (data.user) {
      // Write age_verified alongside any other profile data
      if (ageVerified) {
        console.log('[AuthContext] Updating age_verified for user:', data.user.id);
        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({ age_verified: true })
          .eq('id', data.user.id);

        if (profileUpdateError) {
          console.error('[AuthContext] Error updating age_verified on profile:', profileUpdateError);
        }
      }

      try {
        console.log('[AuthContext] Fetching user profile for id:', data.user.id);
        const profile = await fetchProfile(data.user.id);
        console.log('[AuthContext] Fetched profile:', profile);
        const appUser = buildAppUser(data.user, profile);
        setUser(appUser);
        return appUser;
      } catch (profileFetchError) {
        console.error('[AuthContext] Error fetching profile after signup:', profileFetchError);
        const appUser = buildAppUser(data.user, { username: formattedUsername });
        setUser(appUser);
        return appUser;
      }
    }

    return null;
  };

  // ── Log In ─────────────────────────────────────────────────────────────────
  const login = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      console.error('[AuthContext] login error:', error);
      throw new Error('Invalid email or password. Please try again.');
    }

    const profile = await fetchProfile(data.user.id);
    const appUser = buildAppUser(data.user, profile);
    setUser(appUser);
    return appUser;
  };

  // ── Google OAuth ───────────────────────────────────────────────────────────
  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      console.error('[AuthContext] Google OAuth error:', error);
      throw new Error('Google sign-in failed. Please try again.');
    }
    // The browser will redirect; onAuthStateChange handles the session on return.
  };

  // ── Update username (writes to profiles table) ─────────────────────────────
  // ageVerified: pass true from UsernameSelectionScreen (Google OAuth path)
  const updateUsername = async (rawUsername, ageVerified = false) => {
    if (!user?.id) throw new Error('You must be logged in to update your username.');
    
    const clean = (rawUsername || '').trim().replace(/^@/, '');

    if (!clean) {
      throw new Error('Username cannot be empty.');
    }
    if (clean.length < 3) {
      throw new Error('Username must be at least 3 characters long.');
    }
    if (clean.length > 30) {
      throw new Error('Username must be 30 characters or less.');
    }
    if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
      throw new Error('Username can only contain letters, numbers, and underscores.');
    }

    const currentClean = (user?.username || '').trim().replace(/^@/, '');

    // If changing username or checking against existing DB rows
    if (clean.toLowerCase() !== currentClean.toLowerCase()) {
      // Case-insensitive uniqueness check against profiles (excluding current user's profile)
      const escapedClean = clean.replace(/[_%]/g, '\\$&');
      const { data: existingProfiles, error: checkError } = await supabase
        .from('profiles')
        .select('id, username')
        .neq('id', user.id)
        .ilike('username', escapedClean);

      if (checkError) {
        console.error('[AuthContext] Username availability check error:', checkError);
        throw new Error(`Failed to check username availability: ${checkError.message}`);
      }

      const collision = existingProfiles?.find(
        (p) => p.username && p.username.trim().toLowerCase() === clean.toLowerCase()
      );

      if (collision) {
        throw new Error('Username already taken');
      }
    }

    const updates = { username: clean };
    if (ageVerified) updates.age_verified = true;

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (updateError) {
      console.error('[AuthContext] updateUsername error:', updateError);
      throw new Error(updateError.message || 'Could not save username. Please try again.');
    }

    const updated = {
      ...user,
      username: `@${clean}`,
      ageVerified: ageVerified || user.ageVerified,
    };
    setUser(updated);
    return updated;
  };

  // ── Update city ────────────────────────────────────────────────────────────
  const updateCity = async (city) => {
    if (!user?.id) return;
    const { error } = await supabase
      .from('profiles')
      .update({ city })
      .eq('id', user.id);

    if (error) {
      console.error('[AuthContext] updateCity error:', error);
      throw new Error('Could not save city. Please try again.');
    }

    const updated = { ...user, city };
    setUser(updated);
    return updated;
  };

  // ── Update full profile details ────────────────────────────────────────────
  const updateProfileDetails = async ({
    avatar,
    bio,
    city,
    height,
    gender,
    instagramLink,
    hasCompletedOnboarding,
  }) => {
    if (!user?.id) return;

    const updates = {};
    if (avatar !== undefined) updates.avatar_url = avatar;
    if (city !== undefined) updates.city = city;
    if (height !== undefined) updates.height = height;
    if (gender !== undefined) updates.gender = gender;
    if (instagramLink !== undefined) updates.instagram_link = instagramLink;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        console.error('[AuthContext] updateProfileDetails error:', error);
        throw new Error(error.message || 'Could not save profile. Please try again.');
      }
    }

    const updatedUser = {
      ...user,
      ...(avatar !== undefined && { avatar }),
      ...(bio !== undefined && { bio }),
      ...(city !== undefined && { city }),
      ...(height !== undefined && { height }),
      ...(gender !== undefined && { gender }),
      ...(instagramLink !== undefined && { instagramLink }),
      hasCompletedOnboarding:
        hasCompletedOnboarding !== undefined ? hasCompletedOnboarding : true,
    };
    setUser(updatedUser);
    return updatedUser;
  };

  // ── Log Out ────────────────────────────────────────────────────────────────
  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[AuthContext] logout error:', error);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        loginWithGoogle,
        updateUsername,
        updateCity,
        updateProfileDetails,
        updateUser: updateProfileDetails,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
