import React, { useEffect, useState } from 'react';
import { publicAnonKey } from '../utils/supabase/info';
import { Loader2, AlertCircle, Download, ExternalLink, Lock, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Logo } from './Logo';
import { SERVER_BASE } from './editor/utils';

interface ShortLinkRedirectProps {
  code: string;
}

export function ShortLinkRedirect({ code }: ShortLinkRedirectProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProtected, setIsProtected] = useState(false);
  const [inputPassword, setInputPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);

  const serverBase = SERVER_BASE;

  useEffect(() => {
    if (!code) {
      setError('Invalid link format');
      setLoading(false);
      return;
    }

    // Initial resolve — GET request (no password)
    resolveShortLink();
  }, [code]);

  const resolveShortLink = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${serverBase}/s/${encodeURIComponent(code)}`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        });

        if (response.status === 410) {
            throw new Error('This link has expired');
        }

        if (response.status === 401) {
            const data = await response.json();
            if (data.protected) {
                setIsProtected(true);
                setLoading(false);
                return;
            }
        }

        if (!response.ok) {
            if (response.status === 404) throw new Error('Link not found');
            throw new Error('Unable to resolve link');
        }
        
        const data = await response.json();
        if (data.url) {
          setImageUrl(data.url);
          setIsProtected(false);
        } else {
          throw new Error('Invalid server response');
        }
      } catch (err: any) {
        console.error("Link resolution error:", err);
        setError(err.message || 'Link invalid or expired');
      } finally {
        setLoading(false);
      }
  };

  // Submit password via POST to keep it out of URL/logs
  const submitPassword = async (password: string) => {
      try {
        setIsSubmitting(true);
        setError(null);
        setRateLimitMessage(null);

        const response = await fetch(`${serverBase}/s/${encodeURIComponent(code)}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password }),
        });

        if (response.status === 410) {
            throw new Error('This link has expired');
        }

        if (response.status === 429) {
            const data = await response.json().catch(() => ({}));
            const retryAfter = data.retryAfterSecs ? Math.ceil(data.retryAfterSecs / 60) : 15;
            setRateLimitMessage(`Too many attempts. Please try again in ${retryAfter} minute(s).`);
            return;
        }

        if (response.status === 401) {
            const data = await response.json();
            if (data.protected) {
                setError('Incorrect password');
                return;
            }
        }

        if (!response.ok) {
            if (response.status === 404) throw new Error('Link not found');
            throw new Error('Unable to resolve link');
        }
        
        const data = await response.json();
        if (data.url) {
          setImageUrl(data.url);
          setIsProtected(false);
          setError(null);
        } else {
          throw new Error('Invalid server response');
        }
      } catch (err: any) {
        console.error("Password submission error:", err);
        setError(err.message || 'Failed to verify password');
      } finally {
        setIsSubmitting(false);
      }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (inputPassword.trim()) {
        submitPassword(inputPassword);
      }
  };

  if (loading && !isProtected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 text-neutral-900 font-sans">
        <Loader2 className="w-8 h-8 text-[#15DB95] animate-spin mb-4" />
        <p className="text-neutral-500 font-medium">Loading content...</p>
      </div>
    );
  }

  if (isProtected && !imageUrl) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 p-4 text-neutral-900 font-sans">
            <div className="w-full max-w-sm bg-white rounded-xl shadow-lg border border-neutral-200 p-8">
              <div className="w-12 h-12 bg-[#080F5B]/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-6 h-6 text-[#080F5B]" />
              </div>
              <h1 className="text-xl font-semibold text-[#080F5B] mb-2 text-center">Protected Content</h1>
              <p className="text-neutral-500 mb-6 text-center text-sm">
                  This shared annotation is password protected.
              </p>
              
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="space-y-2">
                      <Input 
                          type="password" 
                          placeholder="Enter password" 
                          value={inputPassword}
                          onChange={(e) => setInputPassword(e.target.value)}
                          className="w-full"
                          autoFocus
                      />
                      {error && (
                          <p className="text-red-500 text-xs flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {error}
                          </p>
                      )}
                      {rateLimitMessage && (
                          <p className="text-red-500 text-xs flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {rateLimitMessage}
                          </p>
                      )}
                  </div>
                  <Button type="submit" className="w-full bg-[#15DB95] hover:bg-[#15DB95]/90 text-white font-medium" disabled={isSubmitting || !inputPassword}>
                      {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Unlocking...
                          </>
                      ) : (
                          <>
                            View Content
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </>
                      )}
                  </Button>
              </form>
            </div>
          </div>
      );
  }

  if (error || !imageUrl) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 p-4 text-neutral-900 font-sans">
        <div className="text-center max-w-sm mx-auto bg-white rounded-xl shadow-sm border border-neutral-200 p-8">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <h1 className="text-lg font-semibold text-[#080F5B] mb-2">Unable to Load</h1>
          <p className="text-neutral-500 mb-6">{error || "The content could not be found."}</p>
          <Button onClick={() => window.location.href = '/app'} className="bg-[#080F5B] text-white hover:bg-[#080F5B]/90 w-full">
            Go to Defix Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 text-neutral-900 font-sans">
      {/* Header */}
      <div className="h-16 bg-white border-b border-neutral-200 flex items-center px-4 justify-between shrink-0">
         <div className="flex items-center gap-2">
            <Logo className="w-8 h-8" />
            <h1 className="font-semibold text-lg tracking-tight text-[#080F5B]">Defix</h1>
         </div>
         <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.open(imageUrl, '_blank')}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Original
            </Button>
            <Button size="sm" className="bg-[#15DB95] hover:bg-[#15DB95]/90 text-white border-0" onClick={() => {
                // Force download by fetching blob and creating anchor
                fetch(imageUrl)
                    .then(resp => resp.blob())
                    .then(blob => {
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.style.display = 'none';
                        a.href = url;
                        a.download = 'defix-shared-image.png';
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                    })
                    .catch(() => window.open(imageUrl, '_blank'));
            }}>
                <Download className="w-4 h-4 mr-2" />
                Download
            </Button>
         </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden bg-neutral-100/50">
        <div className="relative shadow-lg rounded-lg overflow-hidden bg-white border border-neutral-200 flex items-center justify-center">
            {/* Checkerboard pattern for transparency */}
            <div className="absolute inset-0 z-0 opacity-20" 
                 style={{ 
                     backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                     backgroundSize: '20px 20px',
                     backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px' 
                 }} 
            />
            <img 
                src={imageUrl} 
                alt="Shared content" 
                className="relative z-10 max-w-full max-h-[calc(100vh-120px)] object-contain block"
            />
        </div>
      </div>
    </div>
  );
}