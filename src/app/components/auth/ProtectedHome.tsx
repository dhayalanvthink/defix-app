import React, { useState, useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router';
import { useAuth } from '../AuthContext';
import { Editor } from '../Editor';
import { ShortLinkRedirect } from '../ShortLinkRedirect';

export function ProtectedHome() {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const sharedCode = searchParams.get('s');

  // Short link redirect is public — no auth needed
  if (sharedCode) {
    return <ShortLinkRedirect code={sharedCode} />;
  }

  // Still loading auth state (includes PKCE code exchange)
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 border-3 border-slate-100 rounded-full" />
            <div className="absolute inset-0 border-3 border-[#15DB95] border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm text-slate-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated — redirect to landing page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Editor />;
}