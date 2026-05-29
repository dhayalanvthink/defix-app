import { projectId } from '../../utils/supabase/info';

/** Base URL for all server API calls */
export const SERVER_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-da340870`;

/** Get avatar fallback initials from user metadata */
export function getInitials(user: { user_metadata?: { name?: string }; email?: string } | null): string {
  const name = user?.user_metadata?.name;
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0][0]?.toUpperCase() || '?';
  }
  return (user?.email || '?').charAt(0).toUpperCase();
}
