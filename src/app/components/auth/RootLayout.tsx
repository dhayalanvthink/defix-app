import React from 'react';
import { Outlet, useNavigate } from 'react-router';
import { useAuth } from '../AuthContext';
import { Toaster } from '../ui/sonner';
import { TooltipProvider } from '../ui/tooltip';
import { useIdleTimeout } from '../hooks/useIdleTimeout';

export function RootLayout() {
  const { isPasswordRecovery, user, signOut } = useAuth();
  const navigate = useNavigate();

  // If password recovery mode is active, redirect to reset-password page
  React.useEffect(() => {
    if (isPasswordRecovery) {
      navigate('/reset-password', { replace: true });
    }
  }, [isPasswordRecovery, navigate]);

  // Auto sign-out after 30 minutes of inactivity (only when logged in)
  useIdleTimeout(
    React.useCallback(async () => {
      if (user) {
        await signOut();
        navigate('/login', { replace: true });
      }
    }, [user, signOut, navigate]),
    30 * 60 * 1000,
  );

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans">
      <TooltipProvider>
        <Outlet />
        <Toaster />
      </TooltipProvider>
    </div>
  );
}