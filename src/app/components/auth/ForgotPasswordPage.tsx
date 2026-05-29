import React, { useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../AuthContext';
import { AuthLayout } from './AuthLayout';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Mail, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);

    if (error) {
      setError(error.message || 'Failed to send reset email.');
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <AuthLayout title="Check your email" subtitle="We've sent password reset instructions to your inbox.">
        <div className="space-y-6 text-center">
          <div className="w-16 h-16 bg-[#15DB95]/10 rounded-full flex items-center justify-center mx-auto">
            <Mail className="w-8 h-8 text-[#15DB95]" />
          </div>

          <div className="space-y-2">
            <p className="text-sm text-slate-600">
              A password reset link has been sent to:
            </p>
            <p className="text-sm font-semibold text-[#080F5B]">{email}</p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 text-left space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#15DB95] mt-0.5 shrink-0" />
              <p className="text-xs text-slate-500">Click the link in the email to reset your password</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#15DB95] mt-0.5 shrink-0" />
              <p className="text-xs text-slate-500">The link will expire after 1 hour</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#15DB95] mt-0.5 shrink-0" />
              <p className="text-xs text-slate-500">Check your spam folder if you don't see it</p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => { setSent(false); setEmail(''); }}
              className="text-sm font-medium text-[#15DB95] hover:text-[#12c487] transition-colors"
            >
              Try a Different Email
            </button>
            <div>
              <Link to="/login">
                <Button variant="outline" className="w-full h-11 rounded-xl font-medium">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Forgot password?" subtitle="No worries, we'll send you reset instructions.">
      <div className="space-y-6">
        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-100">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email" className="text-sm font-medium text-slate-700">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="reset-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-11 rounded-xl border-slate-200 focus:border-[#15DB95] focus:ring-[#15DB95]"
                autoComplete="email"
                autoFocus
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-[#080F5B] hover:bg-[#0a1270] text-white font-medium text-sm shadow-sm transition-all"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending...
              </span>
            ) : (
              'Send Reset Link'
            )}
          </Button>
        </form>

        <Link
          to="/login"
          className="flex items-center justify-center gap-2 text-sm font-medium text-slate-500 hover:text-[#080F5B] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sign In
        </Link>
      </div>
    </AuthLayout>
  );
}