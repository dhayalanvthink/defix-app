import { Hono } from "npm:hono";
import type { Context } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// ─── Constants ─────────────────────────────────────────────────────
const MAX_IMAGE_SIZE_BYTES = 5_242_880; // 5 MB
const MAX_AVATAR_SIZE_BYTES = 2_097_152; // 2 MB
const MAX_SHARE_PASSWORD_LENGTH = 256;

// Rate limit: max password attempts per code within a window
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// Valid expiry durations the client may request (in minutes)
const VALID_EXPIRY_MINUTES = new Set([60, 1440, 10080]); // 1h, 1d, 7d

// ─── Typed Interfaces ──────────────────────────────────────────────
interface ShortLinkData {
  fileName: string;
  userId: string;
  shortCode: string;
  expiresAt?: number;
  passwordHash?: string;
  mimeType?: string;
}

interface RateLimitEntry {
  attempts: number;
  windowStart: number;
}

interface KVEntry {
  key: string;
  value: Record<string, unknown>;
}

// ─── In-Memory Rate Limiter ────────────────────────────────────────
// Keyed by short code. Resets on cold start (acceptable for edge functions).
const rateLimitMap = new Map<string, RateLimitEntry>();

function checkRateLimit(code: string): { allowed: boolean; retryAfterSecs?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(code);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(code, { attempts: 1, windowStart: now });
    return { allowed: true };
  }

  if (entry.attempts >= RATE_LIMIT_MAX_ATTEMPTS) {
    const retryAfterSecs = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - entry.windowStart)) / 1000);
    return { allowed: false, retryAfterSecs };
  }

  entry.attempts++;
  return { allowed: true };
}

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

// Ensure bucket exists on startup (or lazy load)
const BUCKET_NAME = 'make-da340870-images';
const AVATAR_BUCKET = 'make-da340870-avatars';
let bucketCreated = false;
let avatarBucketCreated = false;

// Signed URL duration: 1 hour
const SIGNED_URL_EXPIRY = 3600;

async function ensureBucket() {
  if (bucketCreated) return;
  
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some(b => b.name === BUCKET_NAME);
    
    if (!exists) {
      // Private bucket — images are only accessible via signed URLs
      await supabase.storage.createBucket(BUCKET_NAME, {
        public: false,
        fileSizeLimit: MAX_IMAGE_SIZE_BYTES // 5MB
      });
      console.log(`Created private bucket ${BUCKET_NAME}`);
    } else {
      // Ensure existing bucket is private (migrate from public if needed)
      await supabase.storage.updateBucket(BUCKET_NAME, {
        public: false,
        fileSizeLimit: MAX_IMAGE_SIZE_BYTES,
      });
    }
    bucketCreated = true;
  } catch (error) {
    console.error("Error creating/updating bucket:", error);
    // Still mark as created to avoid repeated failures
    bucketCreated = true;
  }
}

async function ensureAvatarBucket() {
  if (avatarBucketCreated) return;
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some(b => b.name === AVATAR_BUCKET);
    if (!exists) {
      await supabase.storage.createBucket(AVATAR_BUCKET, {
        public: true,
        fileSizeLimit: MAX_AVATAR_SIZE_BYTES, // 2MB — public is fine for avatars (no sensitive data)
      });
      console.log(`Created bucket ${AVATAR_BUCKET}`);
    }
    avatarBucketCreated = true;
  } catch (error) {
    console.error("Error creating avatar bucket:", error);
    avatarBucketCreated = true;
  }
}

// Generate short code using crypto-secure randomness
function generateShortCode(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(randomValues[i] % chars.length);
  }
  return result;
}

// Auth helper: extracts and verifies user from Authorization header
async function getAuthUser(c: Context): Promise<{ userId: string; error?: never } | { userId?: never; error: Response }> {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  if (!accessToken) {
    return { error: c.json({ error: "Authorization header missing" }, 401) };
  }
  try {
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user?.id) {
      return { error: c.json({ error: "Unauthorized" }, 401) };
    }
    return { userId: user.id };
  } catch (e) {
    console.error("Auth verification error:", e);
    return { error: c.json({ error: "Authentication failed" }, 401) };
  }
}

// Helper: generate a signed URL for a file in the images bucket
async function createSignedImageUrl(filePath: string, expiresIn: number = SIGNED_URL_EXPIRY): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, expiresIn);
    if (error || !data?.signedUrl) {
      console.error("Signed URL error:", error);
      return null;
    }
    return data.signedUrl;
  } catch (e) {
    console.error("Error creating signed URL:", e);
    return null;
  }
}

// Allowed avatar MIME types
const ALLOWED_AVATAR_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp'
]);
const ALLOWED_AVATAR_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp'
]);

// Allowed image upload MIME types (for shared annotations)
const ALLOWED_IMAGE_TYPES = new Set([
  'image/png', 'image/jpeg', 'image/gif', 'image/webp'
]);

// Sanitize file path to prevent path traversal attacks
function sanitizeFilePath(path: string): string {
  // Remove any path traversal sequences
  return path.replace(/\.\.\//g, '').replace(/\.\./g, '').replace(/\/\//g, '/');
}

// Validate that a file path is owned by the given user (no traversal tricks)
function isOwnedByUser(filePath: string, userId: string): boolean {
  // Normalize the path first
  const sanitized = sanitizeFilePath(filePath);
  // Must still match after sanitization AND must start with userId/
  return sanitized === filePath && filePath.startsWith(`${userId}/`);
}

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "x-client-info", "apikey"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Security headers middleware
app.use("/*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
});

// Health check endpoint
app.get("/make-server-da340870/health", (c) => {
  return c.json({ status: "ok" });
});

// Resolve short link endpoint — GET for initial check (no password)
app.get("/make-server-da340870/s/:code", async (c) => {
  const code = c.req.param("code");

  // Basic input validation
  if (!code || code.length > 20 || !/^[a-zA-Z0-9]+$/.test(code)) {
    return c.json({ error: "Invalid link code" }, 400);
  }

  try {
    const data = await kv.get(`short_${code}`);
    
    if (!data || !data.fileName) {
      return c.json({ error: "Link not found" }, 404);
    }
    
    // Check expiration
    if (data.expiresAt && Date.now() > data.expiresAt) {
       return c.json({ error: "Link expired" }, 410);
    }
    
    // If password-protected, inform client (don't reveal the image)
    if (data.passwordHash) {
        return c.json({ protected: true, error: "Password required" }, 401);
    }

    // No password protection — generate signed URL and return
    const signedUrl = await createSignedImageUrl(data.fileName);
    if (!signedUrl) {
      return c.json({ error: "Failed to generate access URL" }, 500);
    }

    return c.json({ url: signedUrl });
  } catch (e) {
    console.error("Resolve error:", e);
    return c.json({ error: "Server Error" }, 500);
  }
});

// Resolve short link with password — POST to keep password out of URL/logs
app.post("/make-server-da340870/s/:code", async (c) => {
  const code = c.req.param("code");

  // Basic input validation
  if (!code || code.length > 20 || !/^[a-zA-Z0-9]+$/.test(code)) {
    return c.json({ error: "Invalid link code" }, 400);
  }

  // Rate limit password attempts per short code
  const rateCheck = checkRateLimit(code);
  if (!rateCheck.allowed) {
    return c.json(
      { error: "Too many attempts. Please try again later.", retryAfterSecs: rateCheck.retryAfterSecs },
      429,
    );
  }

  try {
    const body = await c.req.json();
    const providedPassword = body?.password;

    // Guard against excessively long passwords (HashDoS)
    if (typeof providedPassword === 'string' && providedPassword.length > MAX_SHARE_PASSWORD_LENGTH) {
      return c.json({ error: "Password too long" }, 400);
    }

    const data = await kv.get(`short_${code}`);
    
    if (!data || !data.fileName) {
      return c.json({ error: "Link not found" }, 404);
    }
    
    // Check expiration
    if (data.expiresAt && Date.now() > data.expiresAt) {
       return c.json({ error: "Link expired" }, 410);
    }
    
    // Verify password
    if (data.passwordHash) {
        if (!providedPassword) {
            return c.json({ protected: true, error: "Password required" }, 401);
        }
        
        const msgUint8 = new TextEncoder().encode(providedPassword);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        if (hashHex !== data.passwordHash) {
             return c.json({ protected: true, error: "Incorrect password" }, 401);
        }
    }

    // Password correct (or no password) — generate signed URL
    // For expiring links, signed URL expiry = min(remaining time, 1 hour)
    let urlExpiry = SIGNED_URL_EXPIRY;
    if (data.expiresAt) {
      const remainingSecs = Math.floor((data.expiresAt - Date.now()) / 1000);
      urlExpiry = Math.min(remainingSecs, SIGNED_URL_EXPIRY);
    }

    const signedUrl = await createSignedImageUrl(data.fileName, urlExpiry);
    if (!signedUrl) {
      return c.json({ error: "Failed to generate access URL" }, 500);
    }

    return c.json({ url: signedUrl });
  } catch (e) {
    console.error("Resolve error:", e);
    return c.json({ error: "Server Error" }, 500);
  }
});

// Upload endpoint — REQUIRES AUTH
app.post("/make-server-da340870/upload", async (c) => {
  try {
    // Verify authenticated user
    const auth = await getAuthUser(c);
    if (auth.error) return auth.error;
    const userId = auth.userId;

    await ensureBucket();
    
    const body = await c.req.parseBody();
    const file = body['file'];
    const password = body['password'] as string;
    const expiresIn = body['expiresIn'] as string; // in minutes
    
    if (!file || !(file instanceof File)) {
      return c.json({ error: "No file provided" }, 400);
    }
    
    // Validate file content type
    const mimeType = file.type?.toLowerCase() || '';
    if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
      return c.json({ error: "Invalid file type. Only PNG, JPG, GIF, and WebP images are allowed." }, 400);
    }

    // Prefix filename with userId for ownership tracking
    const fileName = `${userId}/${crypto.randomUUID()}.png`;
    const arrayBuffer = await file.arrayBuffer();
    const fileBody = new Uint8Array(arrayBuffer);

    // Upload file FIRST (before storing KV) to avoid orphaned KV entries
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, fileBody, {
        contentType: 'image/png',
        upsert: false,
      });
      
    if (uploadError) {
      console.error("Upload error:", uploadError);
      return c.json({ error: "File upload failed" }, 500);
    }

    // Generate short link with collision check
    let shortCode: string;
    let attempts = 0;
    do {
      shortCode = generateShortCode();
      const existing = await kv.get(`short_${shortCode}`);
      if (!existing) break;
      attempts++;
    } while (attempts < 5);

    if (attempts >= 5) {
      console.error("Short code collision: exceeded max attempts");
      return c.json({ error: "Failed to generate unique link" }, 500);
    }

    // Prepare KV data with file path (NOT public URL) and ownership info
    const kvData: ShortLinkData = { fileName, userId, shortCode, mimeType };
    
    if (expiresIn && expiresIn !== 'never') {
        const mins = parseInt(expiresIn);
        if (!isNaN(mins) && mins > 0 && VALID_EXPIRY_MINUTES.has(mins)) {
            kvData.expiresAt = Date.now() + (mins * 60 * 1000);
        }
    }
    
    if (password) {
        if (password.length > MAX_SHARE_PASSWORD_LENGTH) {
            return c.json({ error: "Password too long" }, 400);
        }
        const msgUint8 = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        kvData.passwordHash = hashHex;
    }

    // Store mapping (after successful upload)
    await kv.set(`short_${shortCode}`, kvData);

    // Return the short code — the frontend constructs the full URL
    return c.json({ shortCode });
    
  } catch (error) {
    console.error("Server error during upload:", error);
    return c.json({ error: "An error occurred during upload" }, 500);
  }
});

// List files endpoint — REQUIRES AUTH, scoped to user
app.get("/make-server-da340870/list", async (c) => {
  try {
    // Verify authenticated user
    const auth = await getAuthUser(c);
    if (auth.error) return auth.error;
    const userId = auth.userId;

    await ensureBucket();
    
    // List only files under the user's directory prefix
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(userId, {
        limit: 50,
        sortBy: { column: 'created_at', order: 'desc' },
      });
      
    if (error) {
      console.error("List error:", error);
      return c.json({ error: "Failed to list files" }, 500);
    }

    // Generate signed URLs for each file
    const files = [];
    for (const file of (data || [])) {
      const fullPath = `${userId}/${file.name}`;
      const signedUrl = await createSignedImageUrl(fullPath);
      
      if (signedUrl) {
        files.push({
          url: signedUrl,
          timestamp: new Date(file.created_at).getTime(),
          name: fullPath
        });
      }
    }
    
    return c.json({ files });
    
  } catch (error) {
    console.error("Server error during list:", error);
    return c.json({ error: "An error occurred while listing files" }, 500);
  }
});

// Delete endpoint — REQUIRES AUTH, ownership verified
app.delete("/make-server-da340870/delete", async (c) => {
  try {
    // Verify authenticated user
    const auth = await getAuthUser(c);
    if (auth.error) return auth.error;
    const userId = auth.userId;

    await ensureBucket();
    const body = await c.req.json();
    const name = body['name'];

    if (!name || typeof name !== 'string') {
      return c.json({ error: "No file name provided" }, 400);
    }

    // Security: ensure the file belongs to the authenticated user
    // Validates both ownership prefix AND prevents path traversal (../)
    if (!isOwnedByUser(name, userId)) {
      console.warn(`[Delete] User ${userId} attempted to delete file: ${name}`);
      return c.json({ error: "Forbidden: you can only delete your own files" }, 403);
    }

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([name]);

    if (error) {
      console.error("Delete error:", error);
      return c.json({ error: "Failed to delete file" }, 500);
    }

    // Clean up any associated KV short link entries
    try {
      const kvEntries = await kv.getByPrefix('short_');
      if (kvEntries && kvEntries.length > 0) {
        const keysToDelete: string[] = [];
        for (const entry of kvEntries) {
          if (entry.value && entry.value.fileName === name) {
            keysToDelete.push(entry.key);
          }
        }
        if (keysToDelete.length > 0) {
          await kv.mdel(keysToDelete);
          console.log(`[Delete] Cleaned up ${keysToDelete.length} KV entries for file: ${name}`);
        }
      }
    } catch (kvError) {
      console.warn("[Delete] KV cleanup error (non-critical):", kvError);
    }

    return c.json({ success: true });

  } catch (error) {
    console.error("Server error during delete:", error);
    return c.json({ error: "An error occurred during deletion" }, 500);
  }
});

// Upload avatar endpoint — REQUIRES AUTH
app.post("/make-server-da340870/upload-avatar", async (c) => {
  try {
    const auth = await getAuthUser(c);
    if (auth.error) return auth.error;
    const userId = auth.userId;

    await ensureAvatarBucket();

    const body = await c.req.parseBody();
    const file = body['file'];
    if (!file || !(file instanceof File)) {
      return c.json({ error: "No file provided" }, 400);
    }

    // Validate file type to prevent XSS via malicious file uploads
    const mimeType = file.type?.toLowerCase() || '';
    if (!ALLOWED_AVATAR_TYPES.has(mimeType)) {
      return c.json({ error: "Invalid file type. Allowed: JPG, PNG, GIF, WebP" }, 400);
    }

    const ext = file.name?.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_AVATAR_EXTENSIONS.has(ext)) {
      return c.json({ error: "Invalid file extension. Allowed: jpg, jpeg, png, gif, webp" }, 400);
    }

    const fileName = `${userId}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const fileBody = new Uint8Array(arrayBuffer);

    // Delete old avatar if exists (try all possible extensions)
    try {
      const { data: existingFiles } = await supabase.storage
        .from(AVATAR_BUCKET)
        .list();
      const userAvatars = existingFiles?.filter(f => f.name.startsWith(userId)) || [];
      if (userAvatars.length > 0) {
        await supabase.storage
          .from(AVATAR_BUCKET)
          .remove(userAvatars.map(f => f.name));
      }
    } catch (e) {
      console.warn("Error cleaning old avatars:", e);
    }

    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(fileName, fileBody, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error("Avatar upload error:", uploadError);
      return c.json({ error: "Avatar upload failed" }, 500);
    }

    const { data: { publicUrl } } = supabase.storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(fileName);

    // Add cache-buster to the URL
    const avatarUrl = `${publicUrl}?t=${Date.now()}`;

    // Fetch current user metadata to preserve existing fields
    const { data: { user } } = await supabase.auth.admin.getUserById(userId);

    // Update user metadata with new avatar URL
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { ...(user?.user_metadata || {}), avatar_url: avatarUrl },
    });

    if (updateError) {
      console.error("User metadata update error:", updateError);
      return c.json({ error: "Failed to update profile" }, 500);
    }

    return c.json({ avatar_url: avatarUrl });
  } catch (error) {
    console.error("Server error during avatar upload:", error);
    return c.json({ error: "An error occurred during avatar upload" }, 500);
  }
});

// Delete account endpoint — REQUIRES AUTH
app.delete("/make-server-da340870/delete-account", async (c) => {
  try {
    const auth = await getAuthUser(c);
    if (auth.error) return auth.error;
    const userId = auth.userId;

    console.log(`[Delete Account] Starting deletion for user ${userId}`);

    // 1. Delete user's avatar from storage
    try {
      const { data: avatarFiles } = await supabase.storage
        .from(AVATAR_BUCKET)
        .list();
      const userAvatars = avatarFiles?.filter(f => f.name.startsWith(userId)) || [];
      if (userAvatars.length > 0) {
        await supabase.storage
          .from(AVATAR_BUCKET)
          .remove(userAvatars.map(f => f.name));
        console.log(`[Delete Account] Removed ${userAvatars.length} avatar(s)`);
      }
    } catch (e) {
      console.error("[Delete Account] Error deleting avatars:", e);
    }

    // 2. Delete user's shared images from storage (user-scoped directory)
    try {
      const { data: userFiles } = await supabase.storage
        .from(BUCKET_NAME)
        .list(userId);
      if (userFiles && userFiles.length > 0) {
        const filePaths = userFiles.map(f => `${userId}/${f.name}`);
        await supabase.storage
          .from(BUCKET_NAME)
          .remove(filePaths);
        console.log(`[Delete Account] Removed ${filePaths.length} shared image(s)`);
      }
    } catch (e) {
      console.error("[Delete Account] Error cleaning storage:", e);
    }

    // 3. Delete all user's KV data (short links with this userId)
    try {
      const kvEntries = await kv.getByPrefix('short_');
      if (kvEntries && kvEntries.length > 0) {
        const keysToDelete = (kvEntries as KVEntry[])
          .filter((entry) => entry.value && entry.value.userId === userId)
          .map((entry) => entry.key);
        if (keysToDelete.length > 0) {
          await kv.mdel(keysToDelete);
          console.log(`[Delete Account] Removed ${keysToDelete.length} KV entries`);
        }
      }
    } catch (e) {
      console.error("[Delete Account] Error deleting KV data:", e);
    }

    // Also delete user-prefixed KV data
    try {
      const userKvData = await kv.getByPrefix(`user_${userId}_`);
      if (userKvData && userKvData.length > 0) {
        const keys = (userKvData as KVEntry[]).map((item) => item.key);
        if (keys.length > 0) {
          await kv.mdel(keys);
          console.log(`[Delete Account] Removed ${keys.length} user-prefixed KV entries`);
        }
      }
    } catch (e) {
      console.error("[Delete Account] Error deleting user KV data:", e);
    }

    // 4. Delete the user account via admin API
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("[Delete Account] Error deleting user:", deleteError);
      return c.json({ error: "Failed to delete account" }, 500);
    }

    console.log(`[Delete Account] Successfully deleted user ${userId}`);
    return c.json({ success: true });
  } catch (error) {
    console.error("[Delete Account] Server error:", error);
    return c.json({ error: "An error occurred during account deletion" }, 500);
  }
});

Deno.serve(app.fetch);