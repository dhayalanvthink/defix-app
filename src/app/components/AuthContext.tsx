import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { projectId } from '../utils/supabase/info';
import type { User, Session } from '@supabase/supabase-js';

const SERVER_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-da340870`;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any; needsConfirmation?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string, currentPassword?: string) => Promise<{ error: any }>;
  updateProfile: (profileData: { first_name?: string; last_name?: string; name?: string }) => Promise<{ error: any }>;
  uploadAvatar: (file: File) => Promise<{ error: any; avatar_url?: string }>;
  deleteAccount: () => Promise<{ error: any }>;
  isPasswordRecovery: boolean;
  setIsPasswordRecovery: (v: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    // Detect if this is an OAuth/auth callback
    const url = new URL(window.location.href);
    const hasCode = url.searchParams.has('code'); // PKCE flow
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const hasHashToken = hashParams.has('access_token'); // Implicit flow
    const isAuthCallback = hasCode || hasHashToken;

    let resolved = false;

    const markResolved = () => {
      if (!resolved) {
        resolved = true;
        setLoading(false);
      }
    };

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth] onAuthStateChange:', event, !!session);
      setSession(session);
      setUser(session?.user ?? null);

      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }

      // For auth callbacks, resolve loading once we get a SIGNED_IN event
      if (isAuthCallback && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        markResolved();
      }
    });

    // Handle PKCE code exchange explicitly
    if (hasCode) {
      const code = url.searchParams.get('code')!;
      console.log('[Auth] Exchanging PKCE code for session...');
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (error) {
          console.error('[Auth] PKCE code exchange error:', error.message);
          markResolved();
        } else if (data?.session) {
          console.log('[Auth] PKCE code exchange successful');
          setSession(data.session);
          setUser(data.session.user);
          markResolved();
        } else {
          console.warn('[Auth] PKCE exchange returned no error but no session');
          markResolved();
        }
      }).catch((err) => {
        console.error('[Auth] PKCE exchange unexpected error:', err);
        markResolved();
      });
    } else {
      // No PKCE code — get existing session normally
      supabase.auth.getSession().then(({ data: { session } }) => {
        console.log('[Auth] getSession:', !!session);
        setSession(session);
        setUser(session?.user ?? null);

        // If not an auth callback, or if we already have a session, stop loading
        if (!isAuthCallback || session) {
          markResolved();
        }
      });
    }

    // Safety timeout: don't keep the user stuck loading forever
    const timeout = setTimeout(() => {
      if (!resolved) {
        console.warn('[Auth] Safety timeout reached, forcing loading=false');
        markResolved();
      }
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, first_name: name.split(' ')[0] || '', last_name: name.split(' ').slice(1).join(' ') || '' },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) return { error };

    // If user is created but identities is empty, email already exists
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return { error: { message: 'An account with this email already exists.' } };
    }

    // If user is created but email not confirmed, show confirmation message
    if (data.user && !data.user.email_confirmed_at) {
      return { error: null, needsConfirmation: true };
    }

    return { error: null };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  }, []);

  const updatePassword = useCallback(async (newPassword: string, currentPassword?: string) => {
    // Settings flow: verify current password first
    if (currentPassword) {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      });
      if (verifyError) {
        return { error: { message: 'Current password is incorrect.' } };
      }
    }
    // Reset-password flow (no currentPassword): user arrived via recovery link,
    // Supabase session already has the recovery grant — updateUser works directly.
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) {
      setIsPasswordRecovery(false);
    }
    return { error };
  }, [user]);

  const updateProfile = useCallback(async (profileData: { first_name?: string; last_name?: string; name?: string }) => {
    // Build the display name from first + last if provided
    const updates: Record<string, string> = {};
    if (profileData.first_name !== undefined) updates.first_name = profileData.first_name;
    if (profileData.last_name !== undefined) updates.last_name = profileData.last_name;
    if (profileData.name !== undefined) {
      updates.name = profileData.name;
    } else if (profileData.first_name !== undefined || profileData.last_name !== undefined) {
      const fn = profileData.first_name ?? user?.user_metadata?.first_name ?? '';
      const ln = profileData.last_name ?? user?.user_metadata?.last_name ?? '';
      updates.name = `${fn} ${ln}`.trim();
    }

    const { data, error } = await supabase.auth.updateUser({ data: updates });
    if (!error && data.user) {
      setUser(data.user);
    }
    return { error };
  }, [user]);

  const uploadAvatar = useCallback(async (file: File) => {
    try {
      const currentSession = session || (await supabase.auth.getSession()).data.session;
      if (!currentSession?.access_token) {
        return { error: { message: 'Not authenticated' } };
      }

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${SERVER_BASE}/upload-avatar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        return { error: { message: data.error || 'Avatar upload failed' } };
      }

      // Refresh user to get updated metadata
      const { data: { user: refreshedUser } } = await supabase.auth.getUser();
      if (refreshedUser) setUser(refreshedUser);

      return { error: null, avatar_url: data.avatar_url };
    } catch (err: any) {
      console.error('[Auth] Avatar upload error:', err);
      return { error: { message: err.message || 'Avatar upload failed' } };
    }
  }, [session]);

  const deleteAccount = useCallback(async () => {
    try {
      const currentSession = session || (await supabase.auth.getSession()).data.session;
      if (!currentSession?.access_token) {
        return { error: { message: 'Not authenticated' } };
      }

      const res = await fetch(`${SERVER_BASE}/delete-account`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();
      if (!res.ok) {
        return { error: { message: data.error || 'Failed to delete account' } };
      }

      // Clear local state
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);

      return { error: null };
    } catch (err: any) {
      console.error('[Auth] Delete account error:', err);
      return { error: { message: err.message || 'Failed to delete account' } };
    }
  }, [session]);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      resetPassword,
      updatePassword,
      updateProfile,
      uploadAvatar,
      deleteAccount,
      isPasswordRecovery,
      setIsPasswordRecovery,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}