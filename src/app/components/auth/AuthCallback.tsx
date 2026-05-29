import React, { useEffect, useRef } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../AuthContext';

/**
 * Handles OAuth/PKCE callback redirects.
 * Supabase redirects here with ?code=... after Google OAuth.
 * The AuthContext handles the actual code exchange — this component
 * just waits for auth loading to complete and then redirects.
 */
export function AuthCallback() {
  const { user, loading } = useAuth();
  const fallbackFired = useRef(false);

  // Hard fallback: if React Router's <Navigate> doesn't redirect
  // within 2 seconds after loading completes, force a page-level redirect.
  useEffect(() => {
    if (!loading && !fallbackFired.current) {
      const timer = setTimeout(() => {
        fallbackFired.current = true;
        const target = user ? '/app' : '/login';
        console.warn(`[AuthCallback] Fallback redirect to ${target}`);
        window.location.replace(target);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [loading, user]);

  // Still exchanging the auth code — show spinner
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 border-3 border-slate-100 rounded-full" />
            <div className="absolute inset-0 border-3 border-[#15DB95] border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm text-slate-500 font-medium">Signing you in...</p>
        </div>
      </div>
    );
  }

  // Auth resolved — redirect based on result
  if (user) {
    return <Navigate to="/app" replace />;
  }

  return <Navigate to="/login" replace />;
}