import React, { useState } from 'react';
import { Link, Navigate } from 'react-router';
import { useAuth } from '../AuthContext';
import { AuthLayout } from './AuthLayout';
import { GoogleButton } from './GoogleButton';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, CheckCircle2, Circle } from 'lucide-react';
import { usePasswordStrength } from '../hooks/usePasswordStrength';

export function SignupPage() {
  const { signUp, signInWithGoogle, user, loading: authLoading } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { checks: passwordChecks, strength: passwordStrength, allMet: allPasswordRequirementsMet } = usePasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (!allPasswordRequirementsMet) {
      setError('Password must be at least 8 characters and include lowercase, uppercase, a number, and a symbol.');
      return;
    }

    setLoading(true);
    const { error, needsConfirmation } = await signUp(email, password, name.trim());
    setLoading(false);

    if (error) {
      setError(error.message || 'An error occurred during sign up.');
    } else if (needsConfirmation) {
      setSuccess(true);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setError(error.message || 'Google sign-up failed.');
      setGoogleLoading(false);
    }
  };

  // Redirect if already authenticated
  if (!authLoading && user) {
    return <Navigate to="/app" replace />;
  }

  if (success) {
    return (
      <AuthLayout title="Check your email" subtitle="We've sent a confirmation link to verify your account.">
        <div className="space-y-6 text-center">
          <div className="w-16 h-16 bg-[#15DB95]/10 rounded-full flex items-center justify-center mx-auto">
            <Mail className="w-8 h-8 text-[#15DB95]" />
          </div>

          <div className="space-y-2">
            <p className="text-sm text-slate-600">
              We've sent a confirmation email to:
            </p>
            <p className="text-sm font-semibold text-[#080F5B]">{email}</p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 text-left space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#15DB95] mt-0.5 shrink-0" />
              <p className="text-xs text-slate-500">Click the link in the email to verify your account</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#15DB95] mt-0.5 shrink-0" />
              <p className="text-xs text-slate-500">Check your spam folder if you don't see it</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#15DB95] mt-0.5 shrink-0" />
              <p className="text-xs text-slate-500">Once confirmed, you can sign in below</p>
            </div>
          </div>

          <Link to="/login">
            <Button className="w-full h-11 rounded-xl bg-[#080F5B] hover:bg-[#0a1270] text-white font-medium">
              Go to Sign In
            </Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Create your account" subtitle="Start annotating images with professional-grade tools.">
      <div className="space-y-6">
        <GoogleButton onClick={handleGoogle} loading={googleLoading} label="Sign Up with Google" />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white/70 px-3 text-slate-500 font-medium">or</span>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-100">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-slate-700">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-10 h-11 rounded-xl border-slate-200 focus:border-[#15DB95] focus:ring-[#15DB95]"
                autoComplete="name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-email" className="text-sm font-medium text-slate-700">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="signup-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-11 rounded-xl border-slate-200 focus:border-[#15DB95] focus:ring-[#15DB95]"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-password" className="text-sm font-medium text-slate-700">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 8 chars, A-z, 0-9, symbol"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 h-11 rounded-xl border-slate-200 focus:border-[#15DB95] focus:ring-[#15DB95]"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {password && (
              <>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex-1 flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          i <= passwordStrength.score ? passwordStrength.color : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] font-medium text-slate-500">{passwordStrength.label}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
                  {passwordChecks.map((check) => (
                    <div key={check.label} className="flex items-center gap-1.5">
                      {check.met ? (
                        <CheckCircle2 className="w-3 h-3 text-[#15DB95] shrink-0" />
                      ) : (
                        <Circle className="w-3 h-3 text-slate-300 shrink-0" />
                      )}
                      <span className={`text-[11px] ${check.met ? 'text-slate-600' : 'text-slate-500'}`}>
                        {check.label}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-[#080F5B] hover:bg-[#0a1270] text-white font-medium text-sm shadow-sm transition-all"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating Account...
              </span>
            ) : (
              'Create Account'
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-[#080F5B] hover:text-[#15DB95] transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}