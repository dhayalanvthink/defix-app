import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../AuthContext';
import { AuthLayout } from './AuthLayout';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ShieldCheck, Circle } from 'lucide-react';
import { usePasswordStrength } from '../hooks/usePasswordStrength';

export function ResetPasswordPage() {
  const { updatePassword, setIsPasswordRecovery } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { checks: passwordChecks, strength: passwordStrength, allMet: allPasswordRequirementsMet } = usePasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password || !confirmPassword) {
      setError('Please fill in both fields.');
      return;
    }

    if (!allPasswordRequirementsMet) {
      setError('Password must be at least 8 characters and include lowercase, uppercase, a number, and a symbol.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);

    if (error) {
      setError(error.message || 'Failed to update password.');
    } else {
      setSuccess(true);
      setIsPasswordRecovery(false);
    }
  };

  if (success) {
    return (
      <AuthLayout title="Password updated" subtitle="Your password has been successfully reset.">
        <div className="space-y-6 text-center">
          <div className="w-16 h-16 bg-[#15DB95]/10 rounded-full flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8 text-[#15DB95]" />
          </div>

          <p className="text-sm text-slate-600">
            Your password has been changed. You can now use your new password to sign in.
          </p>

          <Button
            onClick={() => navigate('/app')}
            className="w-full h-11 rounded-xl bg-[#080F5B] hover:bg-[#0a1270] text-white font-medium"
          >
            Continue to Defix
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Set new password" subtitle="Choose a strong password to secure your account.">
      <div className="space-y-6">
        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-100">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-sm font-medium text-slate-700">New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 8 chars, A-z, 0-9, symbol"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 h-11 rounded-xl border-slate-200 focus:border-[#15DB95] focus:ring-[#15DB95]"
                autoComplete="new-password"
                autoFocus
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

          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-sm font-medium text-slate-700">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="confirm-password"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 pr-10 h-11 rounded-xl border-slate-200 focus:border-[#15DB95] focus:ring-[#15DB95]"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword && password && (
              <div className="flex items-center gap-1.5 mt-1">
                {password === confirmPassword ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#15DB95]" />
                    <span className="text-xs text-[#15DB95]">Passwords match</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-xs text-red-400">Passwords don't match</span>
                  </>
                )}
              </div>
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
                Updating...
              </span>
            ) : (
              'Update Password'
            )}
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}