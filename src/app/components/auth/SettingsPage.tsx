import React, { useState, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router';
import { useAuth } from '../AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Separator } from '../ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Logo } from '../Logo';
import {
  ArrowLeft,
  User,
  Lock,
  Mail,
  Eye,
  EyeOff,
  CheckCircle2,
  Circle,
  AlertCircle,
  Save,
  Loader2,
  Camera,
  ChevronDown,
  ChevronUp,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePasswordStrength } from '../hooks/usePasswordStrength';
import { getInitials } from '../editor/utils';

export function SettingsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 border-3 border-slate-100 rounded-full" />
          <div className="absolute inset-0 border-3 border-[#15DB95] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="h-16 bg-white border-b border-slate-200 flex items-center px-4 sm:px-6 justify-between shrink-0 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/app')}
            className="text-slate-500 hover:text-[#080F5B] hover:bg-slate-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Logo className="w-7 h-7" />
            <span className="font-semibold text-[#080F5B] text-lg tracking-tight">Profile Settings</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <AvatarSection />
        <Separator />
        <NameSection />
        <Separator />
        <EmailSection />
        <Separator />
        <PasswordSection />
        <Separator />
        <DeleteAccountSection />
      </div>
    </div>
  );
}

/* ─────────────── Avatar Section ─────────────── */
function AvatarSection() {
  const { user, uploadAvatar } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB');
      return;
    }

    setUploading(true);
    const { error, avatar_url } = await uploadAvatar(file);
    setUploading(false);

    if (error) {
      toast.error('Failed to upload avatar', { description: error.message });
    } else {
      toast.success('Avatar updated successfully');
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-[#080F5B] mb-1">Avatar</h2>
      <p className="text-sm text-slate-500 mb-5">Your profile photo visible across Defix.</p>

      <div className="flex items-center gap-5">
        <div className="relative group">
          <Avatar className="h-20 w-20">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-[#080F5B] text-white text-2xl font-semibold">
              {getInitials(user)}
            </AvatarFallback>
          </Avatar>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all cursor-pointer"
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            ) : (
              <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </button>
        </div>
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="font-medium"
          >
            {uploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Uploading...
              </>
            ) : (
              'Change Avatar'
            )}
          </Button>
          <p className="text-xs text-slate-500 mt-1.5">JPG, PNG, or GIF. Max 2MB.</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}

/* ─────────────── Name Section ─────────────── */
function NameSection() {
  const { user, updateProfile } = useAuth();

  // Derive first/last from metadata, falling back to splitting the combined name
  const existingName = user?.user_metadata?.name || '';
  const initialFirst = user?.user_metadata?.first_name || existingName.split(' ')[0] || '';
  const initialLast = user?.user_metadata?.last_name || existingName.split(' ').slice(1).join(' ') || '';

  const [firstName, setFirstName] = useState(initialFirst);
  const [lastName, setLastName] = useState(initialLast);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const hasChanges = firstName.trim() !== initialFirst || lastName.trim() !== initialLast;

  const handleSave = async () => {
    if (!firstName.trim()) {
      toast.error('First name is required');
      return;
    }
    setLoading(true);
    setSaved(false);
    const { error } = await updateProfile({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
    });
    setLoading(false);
    if (error) {
      toast.error('Failed to update name', { description: error.message });
    } else {
      setSaved(true);
      toast.success('Name updated successfully');
      setTimeout(() => setSaved(false), 3000);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-[#080F5B] mb-1">Full Name</h2>
      <p className="text-sm text-slate-500 mb-5">Your display name used throughout Defix.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first-name" className="text-sm font-medium text-slate-700">First Name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              id="first-name"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              className="pl-10 h-11 rounded-xl border-slate-200 focus:border-[#15DB95] focus:ring-[#15DB95]"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="last-name" className="text-sm font-medium text-slate-700">Last Name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              id="last-name"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              className="pl-10 h-11 rounded-xl border-slate-200 focus:border-[#15DB95] focus:ring-[#15DB95]"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-5">
        <Button
          onClick={handleSave}
          disabled={loading || !hasChanges || !firstName.trim()}
          className="bg-[#080F5B] hover:bg-[#0a1270] text-white font-medium rounded-xl h-10 px-5"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="w-4 h-4 mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {loading ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </Button>
        {hasChanges && !loading && (
          <span className="text-xs text-amber-600 font-medium">Unsaved changes</span>
        )}
      </div>
    </div>
  );
}

/* ─────────────── Email Section ─────────────── */
function EmailSection() {
  const { user } = useAuth();

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-[#080F5B] mb-1">Email Address</h2>
      <p className="text-sm text-slate-500 mb-5">Your email is used for signing in and notifications.</p>

      <div className="relative">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          type="email"
          value={user?.email || ''}
          disabled
          className="pl-10 h-11 rounded-xl border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
        />
      </div>
      <p className="text-xs text-slate-500 mt-2">Email cannot be changed.</p>
    </div>
  );
}

/* ─────────────── Password Section ─────────────── */
function PasswordSection() {
  const { user, updatePassword } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const provider = user?.app_metadata?.provider;
  const isOAuth = provider === 'google' || provider === 'github';

  const { checks: passwordChecks, strength: passwordStrength, allMet } = usePasswordStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentPassword) {
      setError('Please enter your current password.');
      return;
    }
    if (!allMet) {
      setError('New password must meet all requirements.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error } = await updatePassword(newPassword, currentPassword);
    setLoading(false);

    if (error) {
      setError(error.message || 'Failed to update password.');
    } else {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsOpen(false);
      toast.success('Password updated successfully');
    }
  };

  if (isOAuth) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-[#080F5B] mb-1">Change Password</h2>
        <div className="flex items-center gap-3 mt-4 p-4 bg-blue-50 rounded-xl">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-sm text-slate-700 font-medium">Signed in with Google</p>
            <p className="text-xs text-slate-500">Password management is handled by your Google account.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between"
      >
        <div>
          <h2 className="text-lg font-semibold text-[#080F5B] text-left">Change Password</h2>
          <p className="text-sm text-slate-500 text-left">Update your password to keep your account secure.</p>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
        )}
      </button>

      {isOpen && (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-100">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="current-pw" className="text-sm font-medium text-slate-700">Current Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="current-pw"
                type={showCurrent ? 'text' : 'password'}
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="pl-10 pr-10 h-11 rounded-xl border-slate-200 focus:border-[#15DB95] focus:ring-[#15DB95]"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="new-pw" className="text-sm font-medium text-slate-700">New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="new-pw"
                type={showNew ? 'text' : 'password'}
                placeholder="Min. 8 chars, A-z, 0-9, symbol"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pl-10 pr-10 h-11 rounded-xl border-slate-200 focus:border-[#15DB95] focus:ring-[#15DB95]"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {newPassword && (
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

          {/* Confirm New Password */}
          <div className="space-y-2">
            <Label htmlFor="confirm-pw" className="text-sm font-medium text-slate-700">Confirm New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="confirm-pw"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Repeat your new password"
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
            {confirmPassword && newPassword && (
              <div className="flex items-center gap-1.5 mt-1">
                {newPassword === confirmPassword ? (
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
            disabled={loading || !allMet || !currentPassword || newPassword !== confirmPassword}
            className="bg-[#080F5B] hover:bg-[#0a1270] text-white font-medium rounded-xl h-10 px-6 mt-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Updating...
              </span>
            ) : (
              'Update Password'
            )}
          </Button>
        </form>
      )}
    </div>
  );
}

/* ─────────────── Delete Account Section ─────────────── */
function DeleteAccountSection() {
  const { deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [showDialog, setShowDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await deleteAccount();
    setDeleting(false);

    if (error) {
      toast.error('Failed to delete account', { description: error.message });
      setShowDialog(false);
    } else {
      toast.success('Account deleted successfully');
      navigate('/login');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-red-200 p-6">
      <h2 className="text-lg font-semibold text-red-600 mb-1">Delete Account</h2>
      <p className="text-sm text-slate-500 mb-5">
        Permanently remove your account and all associated data. This action cannot be undone.
      </p>

      <Button
        variant="outline"
        onClick={() => setShowDialog(true)}
        className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 font-medium"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Delete Account
      </Button>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Delete Your Account?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span className="block">
                This will permanently delete your account and remove all your data including:
              </span>
              <span className="block text-sm">
                <span className="block py-0.5">• Your profile and settings</span>
                <span className="block py-0.5">• All shared annotations and links</span>
                <span className="block py-0.5">• Uploaded images and avatars</span>
              </span>
              <span className="block font-medium text-slate-700 mt-2">
                Type <span className="font-mono text-red-600 bg-red-50 px-1.5 py-0.5 rounded">DELETE</span> to confirm.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type DELETE to confirm"
            className="mt-2 font-mono"
          />
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setConfirmText('')}
              disabled={deleting}
            >
              Cancel
            </AlertDialogCancel>
            <Button
              onClick={handleDelete}
              disabled={confirmText !== 'DELETE' || deleting}
              className="bg-red-500 hover:bg-red-600 text-white border-0"
            >
              {deleting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </span>
              ) : (
                'Delete Account'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
