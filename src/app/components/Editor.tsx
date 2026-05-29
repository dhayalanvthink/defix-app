import React, { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon, Download, Share2, Undo2, Redo2, MousePointer2, Square, Circle, ArrowRight, Type, Pen, Trash2, Highlighter, EyeOff, Copy, History, ExternalLink, Link, Link2, ChevronLeft, ChevronUp, Check, FileImage, FileText, Plus, Minus, RotateCcw, ListOrdered, Grid3X3, ZoomIn, Smile, Keyboard, X } from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Slider } from './ui/slider';
import { CanvasBoard } from './CanvasBoard';
import { toast } from 'sonner';

import { supabase } from '../lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Logo } from './Logo';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router';
import { LogOut, Settings as SettingsIcon, ShieldCheck } from 'lucide-react';
import { SERVER_BASE, getInitials } from './editor/utils';

export type ToolType = 'select' | 'rect' | 'circle' | 'arrow' | 'line' | 'text' | 'pen' | 'eraser' | 'highlight' | 'blur' | 'counter' | 'pixelate' | 'magnifier' | 'sticker';

export interface Annotation {
  id: string;
  type: ToolType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: number[]; // For pen
  endX?: number; // For lines/arrows
  endY?: number;
  color: string;
  strokeWidth: number;
  text?: string;
  fontSize?: number;
  sticker?: string; // For sticker type
}

interface SharedLink {
  url: string;
  timestamp: number;
  name?: string;
}

// ─── Constants ─────────────────────────────────────────────────────
const AUTO_FIT_PADDING_PX = 64;
const MAX_HISTORY_ENTRIES = 100;

const TOOLS_CONFIG: { type: ToolType; icon: React.ReactNode; label: string; shortcut: string }[] = [
  { type: 'select', icon: <MousePointer2 />, label: 'Select', shortcut: 'V' },
  { type: 'rect', icon: <Square />, label: 'Rectangle', shortcut: 'R' },
  { type: 'circle', icon: <Circle />, label: 'Circle', shortcut: 'C' },
  { type: 'arrow', icon: <ArrowRight />, label: 'Arrow', shortcut: 'A' },
  { type: 'pen', icon: <Pen />, label: 'Pen', shortcut: 'P' },
  { type: 'highlight', icon: <Highlighter />, label: 'Highlight', shortcut: 'H' },
  { type: 'blur', icon: <EyeOff />, label: 'Blur', shortcut: 'B' },
  { type: 'pixelate', icon: <Grid3X3 />, label: 'Pixelate', shortcut: 'G' },
  { type: 'magnifier', icon: <ZoomIn />, label: 'Magnifier', shortcut: 'M' },
  { type: 'counter', icon: <ListOrdered />, label: 'Count', shortcut: 'N' },
  { type: 'text', icon: <Type />, label: 'Text', shortcut: 'T' },
];

export function Editor() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [tool, setTool] = useState<ToolType>('select');
  const [color, setColor] = useState<string>('#15DB95'); // Default Green
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [zoom, setZoom] = useState<number>(1);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [history, setHistory] = useState<Annotation[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isUploading, setIsUploading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareHistory, setShareHistory] = useState<SharedLink[]>([]);
  const [shareView, setShareView] = useState<'main' | 'download' | 'link'>('main');
  const [downloadType, setDownloadType] = useState<'png' | 'jpg' | 'pdf'>('png');
  const [sharePassword, setSharePassword] = useState('');
  const [shareExpiry, setShareExpiry] = useState('never');
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [currentSticker, setCurrentSticker] = useState('check');
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(false);
  


  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  // Auto-fit image when loaded
  useEffect(() => {
    if (image && canvasContainerRef.current) {
        const container = canvasContainerRef.current;
        
        const availableWidth = container.clientWidth - AUTO_FIT_PADDING_PX;
        const availableHeight = container.clientHeight - AUTO_FIT_PADDING_PX;
        
        if (availableWidth > 0 && availableHeight > 0) {
            const scaleX = availableWidth / image.naturalWidth;
            const scaleY = availableHeight / image.naturalHeight;
            
            // Fit to screen, but don't upscale small images (max zoom 1)
            const fitZoom = Math.min(scaleX, scaleY, 1);
            setZoom(fitZoom);
        }
    }
  }, [image]);



  const getAccessToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  };

  const resetEditorState = () => {
    setAnnotations([]);
    setHistory([]);
    setHistoryIndex(-1);
    setShareUrl(null);
  };

  const fetchHistory = async () => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return;

      const response = await fetch(`${SERVER_BASE}/list`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.files) {
          setShareHistory(data.files);
        }
      }
    } catch (error) {
      // Suppress connection errors as they are expected in some environments
      console.warn("History service unavailable");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          setImage(img);
          resetEditorState();
        };
        img.onerror = () => {
          toast.error("Invalid image", { description: "The selected file could not be loaded as an image." });
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
    // Reset input so re-uploading the same file triggers onChange again
    e.target.value = '';
  };

  const handleCapture = async () => {
    // Check if the API is supported in this browser
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        toast.error("Screen capture is not supported", {
            description: "Your browser does not support the Screen Capture API."
        });
        return;
    }

    try {
      // Use CaptureController to prevent Chrome from switching
      // to the captured tab/window (Chrome 109+)
      const displayMediaOptions: any = {
        video: true,
        audio: false,
      };

      let controller: any = null;
      if (typeof window !== 'undefined' && 'CaptureController' in window) {
        controller = new (window as any).CaptureController();
        displayMediaOptions.controller = controller;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);

      // Must be called synchronously right when getDisplayMedia resolves,
      // in the same microtask — this prevents the browser from switching focus
      if (controller) {
        try {
          controller.setFocusBehavior('no-focus-change');
        } catch (e) {
          // Silently ignore if focus behavior can't be set (e.g. capturing same tab)
          console.log('[Capture] setFocusBehavior not applicable:', e);
        }
      }

      // Fallback: also try to pull focus back
      window.focus();

      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      
      // Wait for the video to load enough data to be drawn
      video.onloadedmetadata = () => {
          // A small delay ensures the frame is captured correctly on some systems
          setTimeout(() => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                // Stop all tracks to release the screen immediately
                stream.getTracks().forEach(track => track.stop());

                const img = new Image();
                img.onload = () => {
                    setImage(img);
                    resetEditorState();
                    window.focus();
                    toast.success('Screen captured successfully');
                };
                img.src = canvas.toDataURL();
            } else {
                stream.getTracks().forEach(track => track.stop());
            }
          }, 300);
      };
    } catch (err: any) {
      if (err.name === 'NotAllowedError' && err.message && err.message.includes('permissions policy')) {
        toast.error("Screen capture unavailable", {
            description: "Browser security policy blocks screen capture in this environment. Please upload an image instead."
        });
      } else if (err.name === 'NotAllowedError') {
        toast.error("Permission denied", {
            description: "Please allow screen recording permission to use this feature."
        });
      } else {
          console.error("Error capturing screen:", err);
          toast.error("Screen capture failed", {
              description: "An error occurred while trying to capture the screen."
          });
      }
    }
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setAnnotations(history[historyIndex - 1]);
    } else if (historyIndex === 0) {
      setHistoryIndex(-1);
      setAnnotations([]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setAnnotations(history[historyIndex + 1]);
    }
  };
  
  const triggerShare = async () => {
      const canvas = document.querySelector('canvas');
      if (!canvas) {
          toast.error("No canvas found", { description: "Please load an image first." });
          return;
      }
      
      setIsUploading(true);
      
      const accessToken = await getAccessToken();
      if (!accessToken) {
          toast.error("Not authenticated", { description: "Please sign in again." });
          setIsUploading(false);
          return;
      }

      canvas.toBlob(async (blob) => {
          try {
               if (!blob) {
                   toast.error("Failed to capture canvas");
                   setIsUploading(false);
                   return;
               }
               
               const formData = new FormData();
               formData.append('file', blob, 'screenshot.png');
               
               if (sharePassword) formData.append('password', sharePassword);
               if (shareExpiry !== 'never') formData.append('expiresIn', shareExpiry);
               
               const response = await fetch(`${SERVER_BASE}/upload`, {
                   method: 'POST',
                   headers: {
                       'Authorization': `Bearer ${accessToken}`
                   },
                   body: formData
               });
               
               if (!response.ok) {
                   const errorData = await response.json().catch(() => ({}));
                   throw new Error(errorData.error || 'Upload failed');
               }
               
               const data = await response.json();
               
               if (data.shortCode) {
                   fetchHistory();
                   // Construct the share URL client-side (avoids server trusting origin header)
                   const shareLink = `${window.location.origin}/app?s=${data.shortCode}`;
                   setShareUrl(shareLink);
               } else {
                   throw new Error('No short code returned');
               }
          } catch (error: any) {
               console.error("Share upload error:", error);
               toast.error("Failed to share image", {
                   description: error.message || "An unknown error occurred"
               });
          } finally {
               setIsUploading(false);
          }
      });
  }

  const handleToolChange = (newTool: ToolType) => {
    setTool(newTool);
  };

  const handleClear = () => {
      setIsClearDialogOpen(true);
  };

  const handleClearConfirm = () => {
      setImage(null);
      resetEditorState();
      setShareView('main');
      setSharePassword('');
      setShareExpiry('never');
      setIsClearDialogOpen(false);
  };

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          // Don't fire shortcuts when typing in input fields
          const target = e.target as HTMLElement;
          const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

          // Ctrl/Cmd + Z → Undo
          if (e.key === 'z' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
              e.preventDefault();
              undo();
              return;
          }
          // Ctrl/Cmd + Shift + Z → Redo
          if (e.key === 'z' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
              e.preventDefault();
              redo();
              return;
          }
          // Ctrl/Cmd + Y → Redo
          if (e.key === 'y' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              redo();
              return;
          }

          // Ctrl/Cmd + V → Paste image from clipboard
          if (e.key === 'v' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              navigator.clipboard.read?.().then(async (items) => {
                  for (const item of items) {
                      const imageType = item.types.find(t => t.startsWith('image/'));
                      if (imageType) {
                          const blob = await item.getType(imageType);
                          const url = URL.createObjectURL(blob);
                          const img = new Image();
                          img.onload = () => {
                              setImage(img);
                              setAnnotations([]);
                              setHistory([]);
                              setHistoryIndex(-1);
                              setShareUrl(null);
                          };
                          img.src = url;
                          return;
                      }
                  }
              }).catch(() => {
                  // Fallback: try readText or just silently fail
              });
              return;
          }

          // Single-key shortcuts — skip when typing in an input
          if (isTyping) return;

          // Escape → Deselect / back to Select
          if (e.key === 'Escape') {
              setTool('select');
              return;
          }

          switch (e.key.toLowerCase()) {
              case 'v': setTool('select'); break;
              case 'r': setTool('rect'); break;
              case 'c': setTool('circle'); break;
              case 'a': setTool('arrow'); break;
              case 'p': setTool('pen'); break;
              case 'h': setTool('highlight'); break;
              case 'b': setTool('blur'); break;
              case 'g': setTool('pixelate'); break;
              case 'm': setTool('magnifier'); break;
              case 'n': setTool('counter'); break;
              case 't': setTool('text'); break;
              case 's': setTool('sticker'); break;
              case '?': setIsShortcutsOpen(prev => !prev); break;
              case '=':
              case '+': setZoom(z => Math.min(5, z + 0.1)); break;
              case '-': setZoom(z => Math.max(0.1, z - 0.1)); break;
              case '0': setZoom(1); break;
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]); // Dependencies for undo/redo closures
  
  const addToHistory = (newAnnotations: Annotation[]) => {
      let newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newAnnotations);
      // Cap history length to prevent unbounded memory growth
      if (newHistory.length > MAX_HISTORY_ENTRIES) {
          newHistory = newHistory.slice(newHistory.length - MAX_HISTORY_ENTRIES);
      }
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      setAnnotations(newAnnotations);
  };

  const deleteHistoryItem = async (name: string) => {
    try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
            toast.error("Not authenticated");
            return;
        }

        const response = await fetch(`${SERVER_BASE}/delete`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name })
        });

        if (response.ok) {
            setShareHistory(prev => prev.filter(item => item.name !== name));
            toast.success("Item deleted successfully");
        } else {
            throw new Error("Failed to delete item");
        }
    } catch (error) {
        console.error("Error deleting item:", error);
        toast.error("Failed to delete item");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Bar */}
      <div className="min-h-14 sm:h-16 bg-white border-b border-border flex items-center px-2 sm:px-4 justify-between shrink-0 z-20 sticky top-0">
        <div className="flex items-center gap-2 shrink-0">
          <Logo className="w-7 h-7 sm:w-8 sm:h-8" />
          <h1 className="font-semibold text-base sm:text-lg tracking-tight text-[#080F5B] hidden sm:block">Defix</h1>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2">
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleImageUpload}
            />
            <Button variant="ghost" size="sm" onClick={handleClear} disabled={!image} title="Clear Canvas" className="text-red-500 hover:text-red-600 hover:bg-red-50 font-medium px-1.5 sm:px-2 shrink-0">
                <Trash2 className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Clear</span>
            </Button>
            <Separator orientation="vertical" className="h-6 hidden sm:block" />
            <Button variant="ghost" size="icon" onClick={undo} disabled={historyIndex === -1} className="text-slate-500 hover:text-[#080F5B] hover:bg-slate-100 shrink-0">
                <Undo2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={redo} disabled={historyIndex >= history.length - 1} className="text-slate-500 hover:text-[#080F5B] hover:bg-slate-100 shrink-0">
                <Redo2 className="w-4 h-4" />
            </Button>
            <Separator orientation="vertical" className="h-6 hidden sm:block" />

            <Button variant="ghost" size="icon" onClick={() => setIsShortcutsOpen(true)} title="Shortcuts" className="text-slate-500 hover:text-[#080F5B] hover:bg-slate-100 hidden sm:inline-flex shrink-0">
                <Keyboard className="w-4 h-4" />
            </Button>
            
            <Dialog open={isShortcutsOpen} onOpenChange={setIsShortcutsOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Keyboard Shortcuts</DialogTitle>
                        <DialogDescription className="text-slate-600 text-sm">
                            A list of available keyboard shortcuts to speed up your workflow.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-5">
                        <div>
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">General</h4>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                                {[
                                    ['Undo', 'Ctrl + Z'],
                                    ['Redo', 'Ctrl + Y'],
                                    ['Delete Selected', 'Del'],
                                    ['Paste Image', 'Ctrl + V'],
                                    ['Deselect', 'Esc'],
                                    ['Show Shortcuts', '?'],
                                ].map(([label, key]) => (
                                    <div key={label} className="flex justify-between items-center text-sm">
                                        <span className="text-slate-600">{label}</span>
                                        <kbd className="px-2 py-1 bg-slate-100 rounded text-xs font-mono border border-slate-200">{key}</kbd>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tools</h4>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                                {[
                                    ['Select', 'V'],
                                    ['Rectangle', 'R'],
                                    ['Circle', 'C'],
                                    ['Arrow', 'A'],
                                    ['Pen', 'P'],
                                    ['Highlight', 'H'],
                                    ['Blur', 'B'],
                                    ['Pixelate', 'G'],
                                    ['Magnifier', 'M'],
                                    ['Count', 'N'],
                                    ['Text', 'T'],
                                    ['Stamps', 'S'],
                                ].map(([label, key]) => (
                                    <div key={label} className="flex justify-between items-center text-sm">
                                        <span className="text-slate-600">{label}</span>
                                        <kbd className="px-2 py-1 bg-slate-100 rounded text-xs font-mono border border-slate-200">{key}</kbd>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Zoom</h4>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                                {[
                                    ['Zoom In', '+'],
                                    ['Zoom Out', '\u2212'],
                                    ['Reset Zoom', '0'],
                                ].map(([label, key]) => (
                                    <div key={label} className="flex justify-between items-center text-sm">
                                        <span className="text-slate-600">{label}</span>
                                        <kbd className="px-2 py-1 bg-slate-100 rounded text-xs font-mono border border-slate-200">{key}</kbd>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Separator orientation="vertical" className="h-6 hidden sm:block" />
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" title="History" className="sm:mr-1 text-slate-500 hover:text-[#080F5B] hover:bg-slate-100 shrink-0">
                  <History className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="p-4 border-b border-neutral-100">
                  <h4 className="font-medium text-sm">Recent Uploads</h4>
                </div>
                <div className="max-h-80 overflow-y-auto p-2 space-y-2">
                  {shareHistory.length === 0 ? (
                    <div className="text-center py-8 text-neutral-600 text-sm">
                      No shared links yet
                    </div>
                  ) : (
                    shareHistory.map((item) => (
                      <div key={item.name || item.url} className="flex gap-3 p-2 hover:bg-neutral-50 rounded-lg group transition-colors">
                        <div className="w-16 h-12 bg-neutral-100 rounded overflow-hidden shrink-0 border border-neutral-200">
                          <img src={item.url} className="w-full h-full object-cover" alt="Thumbnail" />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <div className="text-xs text-neutral-600 mb-1.5">
                            {new Date(item.timestamp).toLocaleString()}
                          </div>
                          <div className="flex gap-1.5">
                              <Button variant="outline" size="icon" className="h-6 w-6" title="Copy Link" onClick={() => {
                                  copyToClipboard(item.url);
                              }}>
                                  <Copy className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6" title="Open Link" onClick={() => window.open(item.url, '_blank')}>
                                  <ExternalLink className="w-3 h-3" />
                              </Button>
                              {item.name && (
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50" title="Delete" onClick={() => deleteHistoryItem(item.name!)}>
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <Dialog onOpenChange={(open) => {
                if (!open) {
                    setShareView('main');
                    setShareUrl(null);
                    setSharePassword('');
                    setShareExpiry('never');
                }
            }}>
              <DialogTrigger asChild>
                <Button variant="default" size="sm" disabled={!image} className="bg-[#15DB95] hover:bg-[#15DB95]/90 text-white border-0 font-medium disabled:opacity-50 disabled:cursor-not-allowed shrink-0">
                    <Share2 className="w-4 h-4 mr-1.5 sm:mr-2" />
                    Share
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-white p-0 gap-0 overflow-hidden">
                <DialogDescription className="sr-only">
                    Share your design via link, download, or social media.
                </DialogDescription>
                
                {shareView === 'main' && (
                    <>
                        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
                            <DialogTitle className="text-lg font-semibold text-[#080F5B]">Share Annotation</DialogTitle>
                        </div>

                        <div className="p-6 space-y-6">
                            <p className="text-sm text-gray-600">
                                Choose how you want to share your annotated design.
                            </p>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <ActionButton 
                                    icon={<Download className="w-6 h-6" />} 
                                    label="Download" 
                                    onClick={() => setShareView('download')}
                                    description="Save as PNG, JPG or PDF"
                                />
                                <ActionButton 
                                    icon={<Link2 className="w-6 h-6" />} 
                                    label="Create Link" 
                                    onClick={() => {
                                        setShareView('link');
                                    }}
                                    description="Generate a shareable link"
                                />
                            </div>
                        </div>
                    </>
                )}

                {shareView === 'download' && (
                    <>
                        <div className="px-6 py-4 flex items-center gap-3 border-b border-gray-100">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 -ml-2 text-gray-500 hover:text-[#080F5B]" 
                                onClick={() => setShareView('main')}
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </Button>
                            <DialogTitle className="text-lg font-semibold text-[#080F5B]">Download</DialogTitle>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="space-y-3">
                                <Label className="text-sm font-medium text-gray-700">File Format</Label>
                                <div className="grid grid-cols-1 gap-2">
                                    {[
                                        { type: 'png', label: 'PNG Image', desc: 'Best for high quality images' },
                                        { type: 'jpg', label: 'JPG Image', desc: 'Small file size' },
                                        { type: 'pdf', label: 'PDF Document', desc: 'Best for printing and sharing' }
                                    ].map((format) => (
                                        <div 
                                            key={format.type}
                                            onClick={() => setDownloadType(format.type as any)}
                                            className={`
                                                flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all
                                                ${downloadType === format.type 
                                                    ? 'border-[#15DB95] bg-[#15DB95]/5 ring-1 ring-[#15DB95]/20' 
                                                    : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                                }
                                            `}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`
                                                    w-8 h-8 rounded-full flex items-center justify-center
                                                    ${downloadType === format.type ? 'bg-[#15DB95]/10 text-[#15DB95]' : 'bg-gray-100 text-gray-500'}
                                                `}>
                                                    {format.type === 'pdf' ? <FileText className="w-4 h-4" /> : <FileImage className="w-4 h-4" />}
                                                </div>
                                                <div className="flex flex-col text-left">
                                                    <span className={`text-sm font-medium ${downloadType === format.type ? 'text-[#080F5B]' : 'text-gray-900'}`}>
                                                        {format.label}
                                                    </span>
                                                    <span className="text-xs text-gray-600">{format.desc}</span>
                                                </div>
                                            </div>
                                            {downloadType === format.type && (
                                                <Check className="w-4 h-4 text-[#15DB95]" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Button 
                                onClick={() => {
                                    const canvas = document.querySelector('canvas');
                                    if(canvas) {
                                        if (downloadType === 'pdf') {
                                            // Use iframe + DOM APIs to avoid XSS via document.write
                                            const dataUrl = canvas.toDataURL('image/png');
                                            const iframe = document.createElement('iframe');
                                            iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:none;';
                                            document.body.appendChild(iframe);
                                            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                                            if (iframeDoc) {
                                                const htmlEl = iframeDoc.documentElement;
                                                htmlEl.innerHTML = '';
                                                const head = iframeDoc.createElement('head');
                                                const titleEl = iframeDoc.createElement('title');
                                                titleEl.textContent = 'Annotation';
                                                head.appendChild(titleEl);
                                                htmlEl.appendChild(head);
                                                const body = iframeDoc.createElement('body');
                                                body.style.cssText = 'margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;';
                                                const img = iframeDoc.createElement('img');
                                                img.src = dataUrl;
                                                img.style.cssText = 'max-width:100%;max-height:100vh;';
                                                body.appendChild(img);
                                                htmlEl.appendChild(body);
                                                img.onload = () => {
                                                    iframe.contentWindow?.focus();
                                                    iframe.contentWindow?.print();
                                                    setTimeout(() => document.body.removeChild(iframe), 1000);
                                                };
                                            }
                                            return;
                                        }

                                        const link = document.createElement('a');
                                        const mimeType = downloadType === 'jpg' ? 'image/jpeg' : 'image/png';
                                        link.download = `screenshot-annotated.${downloadType}`;
                                        link.href = canvas.toDataURL(mimeType);
                                        link.click();
                                        toast.success(`Downloaded as ${downloadType.toUpperCase()}`);
                                    }
                                }}
                                className="w-full h-11 bg-[#15DB95] hover:bg-[#15DB95]/90 text-white font-medium text-base shadow-sm"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Download {downloadType.toUpperCase()}
                            </Button>
                        </div>
                    </>
                )}

                {shareView === 'link' && (
                    <>
                        <div className="px-6 py-4 flex items-center gap-3 border-b border-gray-100">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 -ml-2 text-gray-500 hover:text-[#080F5B]" 
                                onClick={() => setShareView('main')}
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </Button>
                            <DialogTitle className="text-lg font-semibold text-[#080F5B]">Create Link</DialogTitle>
                        </div>

                        <div className="p-6 space-y-6">
                            {isUploading ? (
                                <div className="flex flex-col items-center justify-center py-8 space-y-4 text-center">
                                    <div className="relative w-12 h-12">
                                        <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
                                        <div className="absolute inset-0 border-4 border-[#15DB95] border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-900">Generating link...</h3>
                                        <p className="text-sm text-gray-600 mt-1">Please wait while we upload your design.</p>
                                    </div>
                                </div>
                            ) : shareUrl ? (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="generated-link" className="text-sm font-medium text-gray-700">
                                            Shareable Link
                                        </Label>
                                        <div className="flex items-center space-x-2">
                                            <div className="relative flex-1">
                                                <Input
                                                    id="generated-link"
                                                    value={shareUrl}
                                                    readOnly
                                                    ref={linkInputRef}
                                                    className="pl-9 bg-gray-50 font-mono text-sm text-gray-600 border-gray-200 h-11"
                                                />
                                                <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-600">
                                            {sharePassword ? '🔒 Password protected' : 'Anyone with this link can view this annotation.'}
                                        </p>
                                    </div>

                                    <Button 
                                        onClick={() => {
                                            copyToClipboard(shareUrl, linkInputRef);
                                        }} 
                                        className="w-full h-11 bg-[#15DB95] hover:bg-[#15DB95]/90 text-white font-medium text-base shadow-sm"
                                    >
                                        <Copy className="w-4 h-4 mr-2" />
                                        Copy Link
                                    </Button>
                                    
                                    <Button
                                        variant="ghost"
                                        onClick={() => {
                                            setShareUrl(null);
                                            setSharePassword('');
                                            setShareExpiry('never');
                                        }}
                                        className="w-full text-slate-500"
                                    >
                                        Generate New Link
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Link Expiration</Label>
                                            <Select value={shareExpiry} onValueChange={setShareExpiry}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Never" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="never">Never (Permanent)</SelectItem>
                                                    <SelectItem value="60">1 Hour</SelectItem>
                                                    <SelectItem value="1440">1 Day</SelectItem>
                                                    <SelectItem value="10080">7 Days</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <Label>Password Protection (Optional)</Label>
                                            <Input 
                                                type="password" 
                                                placeholder="Enter a password to secure this link"
                                                value={sharePassword}
                                                onChange={(e) => setSharePassword(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <Button 
                                        onClick={() => triggerShare()} 
                                        className="w-full h-11 bg-[#15DB95] hover:bg-[#15DB95]/90 text-white font-medium text-base shadow-sm"
                                    >
                                        <Link className="w-4 h-4 mr-2" />
                                        Generate Link
                                    </Button>
                                </div>
                            )}
                        </div>
                    </>
                )}
              </DialogContent>
            </Dialog>

            <Separator orientation="vertical" className="h-6 hidden sm:block" />

            {/* User Avatar */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative hover:opacity-80 transition-opacity rounded-full focus:outline-none focus:ring-2 focus:ring-[#15DB95]/50 focus:ring-offset-2 shrink-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.user_metadata?.avatar_url} />
                    <AvatarFallback className="bg-[#080F5B] text-white text-xs font-semibold">
                      {getInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-0">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={user?.user_metadata?.avatar_url} />
                    <AvatarFallback className="bg-[#080F5B] text-white text-sm font-semibold">
                      {getInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {user?.user_metadata?.name || 'User'}
                    </p>
                    <p className="text-xs text-slate-600 truncate">{user?.email}</p>
                  </div>
                </div>
                <div className="py-1">
                  <DropdownMenuItem
                    onClick={() => navigate('/settings')}
                    className="cursor-pointer px-4 py-2.5"
                  >
                    <SettingsIcon className="w-4 h-4 mr-2.5 text-slate-500" />
                    Profile Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate('/privacy')}
                    className="cursor-pointer px-4 py-2.5"
                  >
                    <ShieldCheck className="w-4 h-4 mr-2.5 text-slate-500" />
                    Privacy Policy
                  </DropdownMenuItem>
                </div>
                <DropdownMenuSeparator />
                <div className="py-1">
                  <DropdownMenuItem
                    onClick={async () => {
                      await signOut();
                      navigate('/login');
                    }}
                    className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer px-4 py-2.5"
                  >
                    <LogOut className="w-4 h-4 mr-2.5" />
                    Sign Out
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-[#080F5B]">Clear Canvas?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove the current image and all annotations. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearConfirm} className="bg-red-500 hover:bg-red-600 text-white border-0">
                    Clear Canvas
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Main Canvas Area */}
        <div ref={canvasContainerRef} className="flex-1 bg-muted overflow-auto flex items-center justify-center p-4 sm:p-8 relative">
           {!image && (
               <div className="text-center p-6 sm:p-12 border-2 border-dashed border-slate-200 rounded-xl bg-white shadow-sm max-w-md w-full mx-4 sm:mx-0">
                   <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#F7F9FC] text-[#080F5B] rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                       <ImageIcon className="w-6 h-6 sm:w-8 sm:h-8" />
                   </div>
                   <h3 className="text-base sm:text-lg font-medium text-slate-900 mb-1">No image selected</h3>
                   <p className="text-sm sm:text-base text-slate-500 mb-4 sm:mb-6 max-w-sm mx-auto">Upload an image, paste from clipboard (Ctrl+V), or capture your screen to start annotating.</p>
                   <div className="flex flex-col sm:flex-row gap-2 justify-center">
                        <Button onClick={() => fileInputRef.current?.click()} className="bg-[#080F5B] hover:bg-[#080F5B]/90 text-white w-full sm:w-auto">
                            Upload Image
                        </Button>
                        <Button variant="outline" onClick={handleCapture} className="text-[#080F5B] border-[#080F5B]/20 hover:bg-[#F7F9FC] w-full sm:w-auto">
                            Capture Screen
                        </Button>
                   </div>
               </div>
           )}
           {image && (
               <CanvasBoard 
                    image={image} 
                    tool={tool}
                    color={color}
                    strokeWidth={strokeWidth}
                    annotations={annotations}
                    onAnnotationsChange={addToHistory}
                    onToolChange={handleToolChange}
                    zoom={zoom}
                    stickerType={currentSticker}
               />
           )}
        </div>

        {/* ─── Floating Toolbar ─── */}
        {image && (
        <>
            {/* ── Desktop toolbar (sm+): full horizontal bar ── */}
            <div className="hidden sm:flex absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-white/40 backdrop-blur-3xl border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-full px-4 py-2 items-center gap-3 z-50 transition-all hover:shadow-[0_16px_48px_rgba(0,0,0,0.15)] duration-500 ease-out">
                <div className="flex items-center gap-1.5">
                    {TOOLS_CONFIG.map(t => (
                      <ToolButton key={t.type} icon={t.icon} active={tool === t.type} onClick={() => setTool(t.type)} label={t.label} shortcut={t.shortcut} />
                    ))}
                    
                    <div className="w-px h-6 bg-border mx-1 shrink-0" />
                    
                    <Popover>
                        <PopoverTrigger asChild>
                            <button 
                                className={`group relative flex items-center justify-center w-11 h-11 rounded-full transition-all duration-300 ease-out shrink-0
                                ${tool === 'sticker' 
                                    ? 'bg-black/80 text-white shadow-lg shadow-black/20 scale-105' 
                                    : 'text-neutral-500 hover:bg-black/5 hover:text-black hover:scale-105 active:scale-95'
                                }`}
                                onClick={() => setTool('sticker')}
                                title="Stamps (S)"
                            >
                                <Smile size={20} strokeWidth={tool === 'sticker' ? 2.5 : 1.5} />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-2" side="top" align="center">
                             <div className="flex gap-2">
                                 {['check', 'cross', 'star', 'alert', 'question'].map(s => (
                                     <button
                                         key={s}
                                         onClick={() => {
                                             setTool('sticker');
                                             setCurrentSticker(s);
                                         }}
                                         className={`w-8 h-8 flex items-center justify-center rounded hover:bg-slate-100 ${currentSticker === s && tool === 'sticker' ? 'bg-slate-100 text-[#080F5B]' : 'text-slate-500'}`}
                                     >
                                        {s === 'check' && <Check className="w-5 h-5" />}
                                        {s === 'cross' && <Plus className="w-5 h-5 rotate-45" />}
                                        {s === 'star' && <span className="text-lg">★</span>}
                                        {s === 'alert' && <span className="text-lg">!</span>}
                                        {s === 'question' && <span className="text-lg">?</span>}
                                     </button>
                                 ))}
                             </div>
                        </PopoverContent>
                    </Popover>
                </div>
                
                <Separator orientation="vertical" className="h-8 bg-black/5 shrink-0" />
                
                <div className="flex items-center gap-4 pr-2 shrink-0">
                    <Popover>
                        <PopoverTrigger asChild>
                            <button 
                                className="w-8 h-8 rounded-full border border-white/20 shadow-sm ring-1 ring-black/5 hover:scale-105 transition-all duration-300 relative overflow-hidden group"
                                style={{ backgroundColor: color }}
                            >
                                <span className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></span>
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3" side="top">
                            <div className="grid grid-cols-5 gap-2">
                                {['#15DB95', '#080F5B', '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#000000', '#ffffff'].map(c => (
                                    <button
                                        key={c}
                                        className={`w-8 h-8 rounded-full border border-slate-200 ${color === c ? 'ring-2 ring-offset-1 ring-[#080F5B]' : ''}`}
                                        style={{ backgroundColor: c }}
                                        onClick={() => setColor(c)}
                                    />
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>

                    <div className="flex items-center gap-3 w-40 px-2">
                        <Slider 
                            defaultValue={[4]} 
                            max={20} 
                            min={1} 
                            step={1} 
                            value={[strokeWidth]}
                            onValueChange={(val) => setStrokeWidth(val[0])}
                            className="flex-1"
                        />
                        <span className="text-xs font-medium text-neutral-500 w-8 text-right tabular-nums">{strokeWidth}px</span>
                    </div>
                </div>
            </div>

            {/* ── Mobile toolbar (< sm): active tool pill + expandable overlay ── */}
            <div className="sm:hidden absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50 flex flex-col items-center gap-2">
                {/* Expanded tools overlay */}
                {isToolbarExpanded && (
                    <>
                      {/* Backdrop */}
                      <div className="fixed inset-0 z-40" onClick={() => setIsToolbarExpanded(false)} />
                      <div className="relative z-50 bg-white/70 backdrop-blur-2xl border border-white/50 shadow-[0_8px_40px_rgba(0,0,0,0.18)] rounded-2xl p-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-2 px-1">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tools</span>
                            <button onClick={() => setIsToolbarExpanded(false)} className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                                <X size={14} />
                            </button>
                        </div>
                        {/* Tool grid */}
                        <div className="grid grid-cols-4 gap-1">
                            {TOOLS_CONFIG.map(t => (
                                <button
                                    key={t.type}
                                    onClick={() => {
                                        setTool(t.type);
                                        setIsToolbarExpanded(false);
                                    }}
                                    className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all
                                        ${tool === t.type 
                                            ? 'bg-black/80 text-white shadow-md' 
                                            : 'text-neutral-600 hover:bg-black/5 active:scale-95'
                                        }`}
                                >
                                    {React.cloneElement(t.icon as React.ReactElement, { size: 18, strokeWidth: tool === t.type ? 2.5 : 1.5 })}
                                    <span className="text-[10px] font-medium leading-none">{t.label}</span>
                                </button>
                            ))}
                            {/* Stamps button */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button
                                        onClick={() => {
                                            setTool('sticker');
                                        }}
                                        className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all
                                            ${tool === 'sticker' 
                                                ? 'bg-black/80 text-white shadow-md' 
                                                : 'text-neutral-600 hover:bg-black/5 active:scale-95'
                                            }`}
                                    >
                                        <Smile size={18} strokeWidth={tool === 'sticker' ? 2.5 : 1.5} />
                                        <span className="text-[10px] font-medium leading-none">Stamps</span>
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-2" side="top" align="center">
                                     <div className="flex gap-2">
                                         {['check', 'cross', 'star', 'alert', 'question'].map(s => (
                                             <button
                                                 key={s}
                                                 onClick={() => {
                                                     setTool('sticker');
                                                     setCurrentSticker(s);
                                                     setIsToolbarExpanded(false);
                                                 }}
                                                 className={`w-8 h-8 flex items-center justify-center rounded hover:bg-slate-100 ${currentSticker === s && tool === 'sticker' ? 'bg-slate-100 text-[#080F5B]' : 'text-slate-500'}`}
                                             >
                                                {s === 'check' && <Check className="w-5 h-5" />}
                                                {s === 'cross' && <Plus className="w-5 h-5 rotate-45" />}
                                                {s === 'star' && <span className="text-lg">★</span>}
                                                {s === 'alert' && <span className="text-lg">!</span>}
                                                {s === 'question' && <span className="text-lg">?</span>}
                                             </button>
                                         ))}
                                     </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                        {/* Color & stroke row */}
                        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-200/50 px-1">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button 
                                        className="w-7 h-7 rounded-full border border-white/30 shadow-sm ring-1 ring-black/5 hover:scale-105 transition-all relative overflow-hidden"
                                        style={{ backgroundColor: color }}
                                    />
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-3" side="top">
                                    <div className="grid grid-cols-5 gap-2">
                                        {['#15DB95', '#080F5B', '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#000000', '#ffffff'].map(c => (
                                            <button
                                                key={c}
                                                className={`w-8 h-8 rounded-full border border-slate-200 ${color === c ? 'ring-2 ring-offset-1 ring-[#080F5B]' : ''}`}
                                                style={{ backgroundColor: c }}
                                                onClick={() => setColor(c)}
                                            />
                                        ))}
                                    </div>
                                </PopoverContent>
                            </Popover>
                            <div className="flex items-center gap-2 flex-1">
                                <Slider 
                                    defaultValue={[4]} 
                                    max={20} 
                                    min={1} 
                                    step={1} 
                                    value={[strokeWidth]}
                                    onValueChange={(val) => setStrokeWidth(val[0])}
                                    className="flex-1"
                                />
                                <span className="text-[10px] font-medium text-neutral-500 w-7 text-right tabular-nums">{strokeWidth}px</span>
                            </div>
                        </div>
                      </div>
                    </>
                )}
                {/* Collapsed pill: active tool */}
                <button
                    onClick={() => setIsToolbarExpanded(!isToolbarExpanded)}
                    className="flex items-center gap-2 bg-white/50 backdrop-blur-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-full pl-3 pr-2 py-2 transition-all active:scale-95"
                >
                    <div className="w-8 h-8 rounded-full bg-black/80 text-white flex items-center justify-center shrink-0">
                        {tool === 'sticker' 
                          ? <Smile size={16} strokeWidth={2.5} />
                          : React.cloneElement(
                              (TOOLS_CONFIG.find(t => t.type === tool)?.icon ?? <MousePointer2 />) as React.ReactElement,
                              { size: 16, strokeWidth: 2.5 }
                            )
                        }
                    </div>
                    <span className="text-sm font-medium text-slate-800">
                        {tool === 'sticker' ? 'Stamps' : (TOOLS_CONFIG.find(t => t.type === tool)?.label ?? 'Select')}
                    </span>
                    <div className="w-5 h-5 rounded-full border border-white/30 shadow-sm ring-1 ring-black/5 shrink-0" style={{ backgroundColor: color }} />
                    <ChevronUp size={16} className={`text-slate-400 transition-transform duration-200 ${isToolbarExpanded ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {/* ── Zoom Controls: vertical on mobile, horizontal on desktop ── */}
            {/* Desktop zoom (sm+) */}
            <div className="hidden sm:flex absolute bottom-8 right-8 items-center gap-2 bg-white/40 backdrop-blur-3xl border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-full px-3 py-2 z-50 hover:shadow-[0_16px_48px_rgba(0,0,0,0.15)] transition-all duration-500 ease-out">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-full hover:bg-white/50 text-slate-700" 
                    onClick={() => setZoom(z => Math.max(0.1, z - 0.1))}
                    title="Zoom Out"
                >
                    <Minus className="w-4 h-4" />
                </Button>
                <span className="text-xs font-medium text-slate-600 w-12 text-center tabular-nums">
                    {Math.round(zoom * 100)}%
                </span>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-full hover:bg-white/50 text-slate-700"
                    onClick={() => setZoom(z => Math.min(5, z + 0.1))}
                    title="Zoom In"
                >
                    <Plus className="w-4 h-4" />
                </Button>
                <Separator orientation="vertical" className="h-6 bg-black/5 mx-1" />
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-white/50 text-slate-700"
                    onClick={() => setZoom(1)}
                    title="Reset Zoom"
                >
                    <RotateCcw className="w-4 h-4" />
                </Button>
            </div>
            {/* Mobile zoom (< sm): vertical */}
            <div className="sm:hidden absolute bottom-20 right-3 flex flex-col items-center gap-1 bg-white/50 backdrop-blur-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-2xl px-1.5 py-2 z-50">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-full hover:bg-white/50 text-slate-700" 
                    onClick={() => setZoom(z => Math.min(5, z + 0.1))}
                    title="Zoom In"
                >
                    <Plus className="w-4 h-4" />
                </Button>
                <span className="text-[10px] font-medium text-slate-600 tabular-nums py-0.5">
                    {Math.round(zoom * 100)}%
                </span>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-full hover:bg-white/50 text-slate-700"
                    onClick={() => setZoom(z => Math.max(0.1, z - 0.1))}
                    title="Zoom Out"
                >
                    <Minus className="w-4 h-4" />
                </Button>
                <div className="w-6 h-px bg-black/10 my-0.5" />
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-white/50 text-slate-700"
                    onClick={() => setZoom(1)}
                    title="Reset Zoom"
                >
                    <RotateCcw className="w-3.5 h-3.5" />
                </Button>
            </div>
        </>
        )}
      </div>
    </div>
  );
}

function ActionButton({ icon, label, onClick, description }: { icon: React.ReactNode, label: string, onClick: () => void, description?: string }) {
    return (
        <button onClick={onClick} className="flex flex-col items-start p-4 rounded-xl border border-gray-200 hover:border-[#15DB95]/50 hover:bg-[#15DB95]/5 transition-all text-left group w-full">
            <div className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-500 group-hover:text-[#15DB95] group-hover:border-[#15DB95]/20 mb-3 shadow-sm">
                {icon}
            </div>
            <span className="text-sm font-semibold text-gray-900 group-hover:text-[#080F5B] mb-0.5">{label}</span>
            {description && <span className="text-xs text-gray-600">{description}</span>}
        </button>
    )
}

function ToolButton({ icon, active, onClick, label, shortcut }: { icon: React.ReactNode, active: boolean, onClick: () => void, label: string, shortcut?: string }) {
    return (
        <Tooltip>
             <TooltipTrigger asChild>
                <button 
                    onClick={onClick}
                    className={`group relative flex items-center justify-center w-11 h-11 rounded-full transition-all duration-300 ease-out shrink-0
                        ${active 
                            ? 'bg-black/80 text-white shadow-lg shadow-black/20 scale-105' 
                            : 'text-neutral-500 hover:bg-black/5 hover:text-black hover:scale-105 active:scale-95'
                        }`}
                >
                    {React.cloneElement(icon as React.ReactElement, { size: 20, strokeWidth: active ? 2.5 : 1.5 })}
                </button>
             </TooltipTrigger>
             <TooltipContent side="top" className="bg-black/70 backdrop-blur-md text-white border border-white/10 text-xs px-3 py-1.5 rounded-full mb-3 font-medium shadow-xl">
                 <p className="flex items-center gap-1.5">{label}{shortcut && <kbd className="ml-1 px-1.5 py-0.5 rounded bg-white/15 text-[10px] font-mono leading-none">{shortcut}</kbd>}</p>
             </TooltipContent>
        </Tooltip>
    )
}

function copyToClipboard(text: string, inputRef?: React.RefObject<HTMLInputElement>) {
    // 1. If an input ref is provided and it's visible, use it directly.
    // This is the most reliable method for restricted environments because the element is genuinely part of the layout.
    if (inputRef && inputRef.current) {
        try {
            inputRef.current.focus();
            inputRef.current.select();
            const successful = document.execCommand('copy');
            if (successful) {
                toast.success("Copied to clipboard");
                return;
            }
        } catch (e) {
            console.error("Input copy failed", e);
        }
    }

    // 2. Try deprecated execCommand with hidden textarea (Synchronous, preserves gesture)
    if (fallbackCopyTextToClipboard(text)) {
        return;
    }

    // 3. Try Async Clipboard API if fallback failed
    if (navigator.clipboard && navigator.clipboard.writeText) {
         navigator.clipboard.writeText(text).then(function() {
            toast.success("Copied to clipboard");
        }, function(err) {
            // Suppress console error to avoid alarm, just show toast
            toast.error("Manual copy required");
        });
    } else {
        toast.error("Manual copy required");
    }
}

function fallbackCopyTextToClipboard(text: string): boolean {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Ensure it's part of the DOM but invisible
    // Using fixed position prevents scrolling to bottom
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    textArea.setAttribute('readonly', '');
    textArea.style.opacity = '0';
    
    document.body.appendChild(textArea);

    try {
        textArea.focus();
        textArea.select();
        
        // Extended selection for mobile compatibility
        textArea.setSelectionRange(0, 99999);

        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
            toast.success("Copied to clipboard");
            return true;
        }
    } catch (err) {
        document.body.removeChild(textArea);
        return false;
    }
    return false;
}
