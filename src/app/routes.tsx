import { createBrowserRouter } from 'react-router';
import { RootLayout } from './components/auth/RootLayout';
import { LoginPage } from './components/auth/LoginPage';
import { SignupPage } from './components/auth/SignupPage';
import { ForgotPasswordPage } from './components/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './components/auth/ResetPasswordPage';
import { TermsPage } from './components/auth/TermsPage';
import { PrivacyPolicyPage } from './components/auth/PrivacyPolicyPage';
import { ProtectedHome } from './components/auth/ProtectedHome';
import { AuthCallback } from './components/auth/AuthCallback';
import { SettingsPage } from './components/auth/SettingsPage';
import { LandingPage } from './components/landing/LandingPage';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    children: [
      { index: true, Component: LandingPage },
      { path: 'app', Component: ProtectedHome },
      { path: 'login', Component: LoginPage },
      { path: 'signup', Component: SignupPage },
      { path: 'forgot-password', Component: ForgotPasswordPage },
      { path: 'reset-password', Component: ResetPasswordPage },
      { path: 'terms', Component: TermsPage },
      { path: 'privacy', Component: PrivacyPolicyPage },
      { path: 'auth/callback', Component: AuthCallback },
      { path: 'settings', Component: SettingsPage },
    ],
  },
]);
