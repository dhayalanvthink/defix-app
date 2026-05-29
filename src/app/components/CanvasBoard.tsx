import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Annotation, ToolType } from './Editor';
import { Trash2 } from 'lucide-react';

interface CanvasBoardProps {
  image: HTMLImageElement;
  tool: ToolType;
  color: string;
  strokeWidth: number;
  annotations: Annotation[];
  onAnnotationsChange: (annotations: Annotation[]) => void;
  onToolChange?: (tool: ToolType) => void;
  zoom?: number;
  stickerType?: string;
}

// ─── Constants ─────────────────────────────────────────────────────
const PIXELATE_BLOCK_SIZE = 10;
const MAGNIFIER_ZOOM_FACTOR = 2;
const MAGNIFIER_BORDER_WIDTH = 3;
// Screen-px targets for handles/hit-testing (will be scaled to canvas coords at runtime)
const HANDLE_SCREEN_PX = 10;        // handle radius on screen
const HIT_TOLERANCE_SCREEN_PX = 22; // touch-friendly hit area on screen

/** Generate a unique annotation ID using the crypto API */
function generateId(): string {
  return crypto.randomUUID();
}

export function CanvasBoard({ image, tool, color, strokeWidth, annotations, onAnnotationsChange, onToolChange, zoom = 1, stickerType = 'check' }: CanvasBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const offCanvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
  const [textInput, setTextInput] = useState<{ x: number, y: number, text: string } | null>(null);
  const justCommittedRef = useRef(false);
  
  // Selection state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number, y: number, originalAnn: Annotation } | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null); // 'nw', 'ne', 'sw', 'se', 'start', 'end'

  // Track previous props to detect intentional changes
  const prevColorRef = useRef(color);
  const prevStrokeWidthRef = useRef(strokeWidth);

  // Apply color/stroke changes to selected annotation
  useEffect(() => {
      // Only apply changes if an item is selected and not currently being drawn/dragged
      if (selectedId && !isDrawing && !dragStart) {
          const colorChanged = color !== prevColorRef.current;
          const strokeChanged = strokeWidth !== prevStrokeWidthRef.current;
          
          if (colorChanged || strokeChanged) {
              const updatedAnnotations = annotations.map(ann => {
                  if (ann.id === selectedId) {
                      return {
                          ...ann,
                          color: colorChanged ? color : ann.color,
                          strokeWidth: strokeChanged ? strokeWidth : ann.strokeWidth
                      };
                  }
                  return ann;
              });
              onAnnotationsChange(updatedAnnotations);
          }
      }
      
      prevColorRef.current = color;
      prevStrokeWidthRef.current = strokeWidth;
  }, [color, strokeWidth, selectedId, annotations, onAnnotationsChange, isDrawing, dragStart]);

  // Initialize canvas size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    
    // We set the internal resolution to match the image
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    
    drawCanvas();
  }, [image]);

  // Redraw when props change
  useEffect(() => {
    drawCanvas();
  }, [annotations, currentAnnotation, image, selectedId]);

  // Handle delete key
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
              // Don't delete if editing text
              if (textInput) return;
              
              const newAnnotations = annotations.filter(a => a.id !== selectedId);
              onAnnotationsChange(newAnnotations);
              setSelectedId(null);
          }
      };
      
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, annotations, onAnnotationsChange, textInput]);

  // Focus input when text tool is active
  useEffect(() => {
      if (textInput && inputRef.current) {
          inputRef.current.focus();
      }
  }, [textInput]);

  // Handle outside clicks to commit text
  useEffect(() => {
      if (!textInput) return;

      const handleGlobalPointerDown = (e: MouseEvent | TouchEvent) => {
          const target = ('touches' in e ? e.touches[0]?.target : e.target) as Node | null;
          if (!target) return;
          // If clicking input, do nothing (let input handle it)
          if (inputRef.current && inputRef.current.contains(target)) {
              return;
          }
          // If clicking canvas, let canvas handleMouseDown handle it (it explicitly calls commitText)
          if (canvasRef.current && canvasRef.current.contains(target)) {
              return;
          }
          
          // Otherwise (clicking sidebar, buttons, or outside app), commit
          commitText();
      };

      // Use mousedown and touchstart to catch it before other handlers might swallow it or change focus
      window.addEventListener('mousedown', handleGlobalPointerDown);
      window.addEventListener('touchstart', handleGlobalPointerDown);
      return () => {
          window.removeEventListener('mousedown', handleGlobalPointerDown);
          window.removeEventListener('touchstart', handleGlobalPointerDown);
      };
  }, [textInput]); // Re-binds when text changes, which is fine

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and draw image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);

    // Draw all saved annotations
    annotations.forEach(ann => {
        drawAnnotation(ctx, ann);
        
        // Draw selection highlight
        if (ann.id === selectedId) {
            drawSelectionBox(ctx, ann);
        }
    });

    // Draw current annotation being created
    if (currentAnnotation) {
      drawAnnotation(ctx, currentAnnotation);
    }
  };

  const getResizeHandles = (ann: Annotation) => {
      const bounds = getBounds(ann);
      if (!bounds) return [];
      
      if (ann.type === 'line' || ann.type === 'arrow') {
          return [
              { x: ann.x, y: ann.y, cursor: 'crosshair', type: 'start' },
              { x: ann.endX!, y: ann.endY!, cursor: 'crosshair', type: 'end' }
          ];
      }
      
      // For rect/circle/text/pen/highlight/blur, use bounds corners
      // Note: text resizing might be tricky with this simple box model, but let's allow it
      return [
          { x: bounds.x, y: bounds.y, cursor: 'nw-resize', type: 'nw' },
          { x: bounds.x + bounds.width, y: bounds.y, cursor: 'ne-resize', type: 'ne' },
          { x: bounds.x, y: bounds.y + bounds.height, cursor: 'sw-resize', type: 'sw' },
          { x: bounds.x + bounds.width, y: bounds.y + bounds.height, cursor: 'se-resize', type: 'se' }
      ];
  };

  const getHandleAt = (x: number, y: number, ann: Annotation) => {
      const handles = getResizeHandles(ann);
      // Scale-aware tolerance: constant screen-px mapped to canvas coords
      const tolerance = screenToCanvas(HIT_TOLERANCE_SCREEN_PX);
      return handles.find(h => Math.abs(x - h.x) <= tolerance && Math.abs(y - h.y) <= tolerance);
  };

  const drawSelectionBox = (ctx: CanvasRenderingContext2D, ann: Annotation) => {
      // Scale all visual UI so it stays a constant physical size on screen
      const handleRadius = screenToCanvas(HANDLE_SCREEN_PX);
      const borderWidth = screenToCanvas(2);
      const dashLen = screenToCanvas(5);
      const padding = screenToCanvas(5);

      ctx.save();
      ctx.strokeStyle = '#080F5B'; // Navy selection
      ctx.lineWidth = borderWidth;
      ctx.setLineDash([dashLen, dashLen]);
      
      const bounds = getBounds(ann);
      
      if (bounds) {
          ctx.strokeRect(
              bounds.x - padding, 
              bounds.y - padding, 
              bounds.width + padding * 2, 
              bounds.height + padding * 2
          );

          // Draw resize handles
          const handles = getResizeHandles(ann);
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#080F5B';
          ctx.lineWidth = Math.max(borderWidth, screenToCanvas(1.5));
          ctx.setLineDash([]); // Solid lines for handles
          
          handles.forEach(h => {
              ctx.beginPath();
              ctx.arc(h.x, h.y, handleRadius, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
          });
      }
      
      ctx.restore();
  };

  const getBounds = (ann: Annotation) => {
      switch (ann.type) {
          case 'rect':
          case 'circle':
          case 'highlight':
          case 'blur':
          case 'pixelate':
          case 'magnifier':
          case 'sticker':
          case 'counter':
              return {
                  x: ann.width && ann.width < 0 ? ann.x + ann.width : ann.x,
                  y: ann.height && ann.height < 0 ? ann.y + ann.height : ann.y,
                  width: Math.abs(ann.width || 0),
                  height: Math.abs(ann.height || 0)
              };
          case 'text':
              // Estimate text size
              const fontSize = ann.strokeWidth * 5 + 10;
              const textWidth = Math.max(20, (ann.text?.length || 0) * (fontSize * 0.6)); // Min width 20
              return {
                  x: ann.x,
                  y: ann.y,
                  width: textWidth,
                  height: fontSize * 1.2
              };
          case 'arrow':
          case 'line':
              const x1 = ann.x;
              const y1 = ann.y;
              const x2 = ann.endX || x1;
              const y2 = ann.endY || y1;
              return {
                  x: Math.min(x1, x2),
                  y: Math.min(y1, y2),
                  width: Math.abs(x2 - x1),
                  height: Math.abs(y2 - y1)
              };
          case 'pen':
               if (!ann.points) return null;
               let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
               for(let i=0; i<ann.points.length; i+=2) {
                   minX = Math.min(minX, ann.points[i]);
                   minY = Math.min(minY, ann.points[i+1]);
                   maxX = Math.max(maxX, ann.points[i]);
                   maxY = Math.max(maxY, ann.points[i+1]);
               }
               return {
                   x: minX,
                   y: minY,
                   width: maxX - minX,
                   height: maxY - minY
               };
      }
      return null;
  };

  const drawAnnotation = (ctx: CanvasRenderingContext2D, ann: Annotation) => {
    ctx.strokeStyle = ann.color;
    ctx.fillStyle = ann.color;
    ctx.lineWidth = ann.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();

    switch (ann.type) {
      case 'rect':
        if (ann.width !== undefined && ann.height !== undefined) {
          ctx.strokeRect(ann.x, ann.y, ann.width, ann.height);
        }
        break;
      case 'circle':
        if (ann.width !== undefined && ann.height !== undefined) {
            // Ellipse logic or just circle based on radius
            const centerX = ann.x + ann.width / 2;
            const centerY = ann.y + ann.height / 2;
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, Math.abs(ann.width / 2), Math.abs(ann.height / 2), 0, 0, 2 * Math.PI);
            ctx.stroke();
        }
        break;
      case 'arrow':
        if (ann.endX !== undefined && ann.endY !== undefined) {
          drawArrow(ctx, ann.x, ann.y, ann.endX, ann.endY, ann.strokeWidth);
        }
        break;
      case 'pen':
        if (ann.points && ann.points.length > 0) {
          ctx.beginPath();
          ctx.moveTo(ann.points[0], ann.points[1]);
          for (let i = 2; i < ann.points.length; i += 2) {
            ctx.lineTo(ann.points[i], ann.points[i + 1]);
          }
          ctx.stroke();
        }
        break;
      case 'text':
        if (ann.text) {
          ctx.font = `${ann.strokeWidth * 5 + 10}px sans-serif`;
          ctx.textBaseline = 'top';
          ctx.fillText(ann.text, ann.x, ann.y);
        }
        break;
      case 'highlight':
        if (ann.width !== undefined && ann.height !== undefined) {
            ctx.save();
            ctx.globalAlpha = 0.25;
            ctx.fillStyle = ann.color; // Usually yellow or neon
            ctx.fillRect(ann.x, ann.y, ann.width, ann.height);
            ctx.restore();
        }
        break;
      case 'blur':
        if (ann.width !== undefined && ann.height !== undefined) {
            // Draw a blurred version of the image at that spot
            // This is complex on canvas. Simple approximation: pixelate or just blur rectangle
            ctx.save();
            
            // Clip to the blur rectangle
            ctx.beginPath();
            ctx.rect(ann.x, ann.y, ann.width, ann.height);
            ctx.clip();
            
            // Apply blur filter
            ctx.filter = 'blur(10px)';
            
            // Draw the original image again at the same position
            // Note: drawing the full image again might be heavy, but it's the most accurate "blur" effect
            // We need to know the source image. We have it in 'image' prop but it's not passed to drawAnnotation directly.
            // But drawCanvas has 'image' in scope. We can pass it or use a closure if we were inside.
            // But drawAnnotation is defined inside the component so it closes over 'image'.
            // YES: 'image' is available here via closure.
            
            ctx.drawImage(image, 0, 0);
            
            // Add mask overlay
            ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
            ctx.fillRect(ann.x, ann.y, ann.width, ann.height);
            
            ctx.restore();
        }
        break;
      case 'pixelate':
        if (ann.width !== undefined && ann.height !== undefined) {
             ctx.save();
             ctx.beginPath();
             ctx.rect(ann.x, ann.y, ann.width, ann.height);
             ctx.clip();
             
             // Pixelate effect: draw image small then scale up with no smoothing
             const w = Math.abs(ann.width);
             const h = Math.abs(ann.height);
             const tinyW = Math.max(1, Math.floor(w / PIXELATE_BLOCK_SIZE));
             const tinyH = Math.max(1, Math.floor(h / PIXELATE_BLOCK_SIZE));
             
             // Reuse cached offscreen canvas to avoid GC pressure on every frame
             if (!offCanvasRef.current) {
                 offCanvasRef.current = document.createElement('canvas');
             }
             const offCanvas = offCanvasRef.current;
             offCanvas.width = tinyW;
             offCanvas.height = tinyH;
             const offCtx = offCanvas.getContext('2d');
             if (offCtx) {
                 const srcX = ann.width < 0 ? ann.x + ann.width : ann.x;
                 const srcY = ann.height < 0 ? ann.y + ann.height : ann.y;
                 
                 offCtx.drawImage(image, srcX, srcY, w, h, 0, 0, tinyW, tinyH);
                 
                 ctx.imageSmoothingEnabled = false;
                 ctx.drawImage(offCanvas, srcX, srcY, w, h);
                 ctx.imageSmoothingEnabled = true;
             }
             
             ctx.restore();
        }
        break;
      case 'magnifier':
        if (ann.width !== undefined && ann.height !== undefined) {
            const centerX = ann.x + ann.width / 2;
            const centerY = ann.y + ann.height / 2;
            const radius = Math.min(Math.abs(ann.width), Math.abs(ann.height)) / 2;
            
            ctx.save();
            
            // Draw circle clip
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            ctx.clip();
            
            // Draw white background first
            ctx.fillStyle = 'white';
            ctx.fill();
            
            // Draw magnified image
            // 2x magnification means we show an area of radius/2
            const zoomLevel = MAGNIFIER_ZOOM_FACTOR;
            const srcRadius = radius / zoomLevel;
            
            ctx.drawImage(
                image, 
                centerX - srcRadius, 
                centerY - srcRadius, 
                srcRadius * 2, 
                srcRadius * 2, 
                centerX - radius, 
                centerY - radius, 
                radius * 2, 
                radius * 2
            );
            
            // Draw border
            ctx.lineWidth = ann.strokeWidth;
            ctx.strokeStyle = ann.color; // Usually white or brand color
            ctx.stroke();
            
            ctx.restore();
            
            // Draw border again outside to be clean
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            ctx.strokeStyle = ann.color;
            ctx.lineWidth = ann.strokeWidth;
            ctx.stroke();
            
            // Draw a subtle shadow?
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetY = 4;
            ctx.strokeStyle = 'transparent';
            ctx.stroke(); // Just for shadow
            ctx.restore();
        }
        break;
      case 'counter':
        if (ann.width !== undefined && ann.height !== undefined && ann.text) {
             const centerX = ann.x + ann.width / 2;
             const centerY = ann.y + ann.height / 2;
             const radius = Math.min(Math.abs(ann.width), Math.abs(ann.height)) / 2;
             
             // Draw filled circle
             ctx.fillStyle = ann.color;
             ctx.beginPath();
             ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
             ctx.fill();
             
             // Draw number
             ctx.fillStyle = '#ffffff'; // Always white text
             ctx.font = `bold ${radius * 1.2}px sans-serif`;
             ctx.textAlign = 'center';
             ctx.textBaseline = 'middle';
             ctx.fillText(ann.text, centerX, centerY + (radius * 0.1)); // Slight adjustment for visual center
        }
        break;
      case 'sticker':
        if (ann.width !== undefined && ann.height !== undefined && ann.sticker) {
            const centerX = ann.x + ann.width / 2;
            const centerY = ann.y + ann.height / 2;
            // Use width/height as bounding box
            const size = Math.min(Math.abs(ann.width), Math.abs(ann.height));
            const half = size / 2;
            
            ctx.save();
            ctx.translate(centerX, centerY);
            
            // Draw sticker based on type
            ctx.fillStyle = ann.color;
            ctx.strokeStyle = ann.color;
            ctx.lineWidth = ann.strokeWidth;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            
            if (ann.sticker === 'check') {
                // Draw filled circle background
                ctx.beginPath();
                ctx.arc(0, 0, half, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw white checkmark
                ctx.beginPath();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = size * 0.1; // Thicker white line
                const s = size * 0.5;
                ctx.moveTo(-s * 0.5, 0);
                ctx.lineTo(-s * 0.1, s * 0.4);
                ctx.lineTo(s * 0.5, -s * 0.4);
                ctx.stroke();
            } 
            else if (ann.sticker === 'cross') {
                // Draw filled circle background
                ctx.beginPath();
                ctx.arc(0, 0, half, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw white X
                ctx.beginPath();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = size * 0.1;
                const s = size * 0.25;
                ctx.moveTo(-s, -s);
                ctx.lineTo(s, s);
                ctx.moveTo(s, -s);
                ctx.lineTo(-s, s);
                ctx.stroke();
            }
            else if (ann.sticker === 'star') {
                // Draw star
                const spikes = 5;
                const outerRadius = half;
                const innerRadius = half * 0.4;
                
                let rot = Math.PI / 2 * 3;
                let x = 0;
                let y = 0;
                const step = Math.PI / spikes;
                
                ctx.beginPath();
                ctx.moveTo(0, -outerRadius);
                
                for (let i = 0; i < spikes; i++) {
                    x = Math.cos(rot) * outerRadius;
                    y = Math.sin(rot) * outerRadius;
                    ctx.lineTo(x, y);
                    rot += step;
                    
                    x = Math.cos(rot) * innerRadius;
                    y = Math.sin(rot) * innerRadius;
                    ctx.lineTo(x, y);
                    rot += step;
                }
                ctx.lineTo(0, -outerRadius);
                ctx.closePath();
                ctx.fill(); // Filled star
            }
            else if (ann.sticker === 'alert') {
                // Triangle
                const h = size * 0.8;
                const w = size * 0.9;
                ctx.beginPath();
                ctx.moveTo(0, -h/2);
                ctx.lineTo(w/2, h/2);
                ctx.lineTo(-w/2, h/2);
                ctx.closePath();
                ctx.fill();
                
                // Exclamation mark (white)
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.rect(-w*0.05, -h*0.1, w*0.1, h*0.4);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(0, h*0.35, w*0.06, 0, Math.PI*2);
                ctx.fill();
            }
            else if (ann.sticker === 'question') {
                 // Circle filled
                 ctx.beginPath();
                 ctx.arc(0, 0, half, 0, Math.PI * 2);
                 ctx.fill();
                 
                 // Question mark
                 ctx.fillStyle = '#ffffff';
                 ctx.font = `bold ${size * 0.7}px sans-serif`;
                 ctx.textAlign = 'center';
                 ctx.textBaseline = 'middle';
                 ctx.fillText('?', 0, size * 0.05);
            }
            
            ctx.restore();
        }
        break;
    }
  };

  const drawArrow = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, width: number) => {
    const headLength = width * 4; // length of head in pixels
    const dx = x2 - x1;
    const dy = y2 - y1;
    const angle = Math.atan2(dy, dx);
    
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 6), y2 - headLength * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headLength * Math.cos(angle + Math.PI / 6), y2 - headLength * Math.sin(angle + Math.PI / 6));
    ctx.lineTo(x2, y2);
    ctx.fill();
  };

  const getCanvasCoordinates = (e: { clientX: number; clientY: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  /** Convert screen-px value to canvas-px so UI elements stay a constant physical size */
  const screenToCanvas = (screenPx: number): number => {
    const canvas = canvasRef.current;
    if (!canvas) return screenPx;
    const rect = canvas.getBoundingClientRect();
    // Average of X/Y scales for uniform sizing
    return screenPx * ((canvas.width / rect.width + canvas.height / rect.height) / 2);
  };

  const hitTest = (x: number, y: number): string | null => {
      // Iterate in reverse to select top-most
      // Scale-aware tolerance so small annotations are easier to tap on mobile
      const tolerance = screenToCanvas(HIT_TOLERANCE_SCREEN_PX);
      for (let i = annotations.length - 1; i >= 0; i--) {
          const ann = annotations[i];
          const bounds = getBounds(ann);
          if (bounds) {
              if (
                  x >= bounds.x - tolerance &&
                  x <= bounds.x + bounds.width + tolerance &&
                  y >= bounds.y - tolerance &&
                  y <= bounds.y + bounds.height + tolerance
              ) {
                  return ann.id;
              }
          }
      }
      return null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const { x, y } = getCanvasCoordinates(e);

    // If text input is active, clicking canvas should commit existing text first.
    if (textInput) {
        commitText();
        return;
    }

    // Prevent starting new text input if we just committed one (debounce)
    if (justCommittedRef.current) {
        justCommittedRef.current = false;
        return;
    }

    if (tool === 'select') {
        // Check if clicking a resize handle on the currently selected item
        if (selectedId) {
            const selectedAnn = annotations.find(a => a.id === selectedId);
            if (selectedAnn) {
                 const handle = getHandleAt(x, y, selectedAnn);
                 if (handle) {
                     setResizeHandle(handle.type);
                     setDragStart({ x, y, originalAnn: { ...selectedAnn } });
                     return;
                 }
            }
        }

        const hitId = hitTest(x, y);
        setSelectedId(hitId);
        
        // Double click simulation (not real dblclick event, but simple toggle for now)
        // If we select a text annotation, maybe we can edit it?
        // But for now, let's keep it simple.
        
        if (hitId) {
            const ann = annotations.find(a => a.id === hitId);
            if (ann) {
                setDragStart({ x, y, originalAnn: { ...ann } });
            }
        }
        return;
    }

    if (tool === 'text') {
        setTextInput({ x, y, text: '' });
        return;
    }

    if (tool === 'magnifier') {
        const size = 150; // Default magnifier size
        
        const newAnn: Annotation = {
            id: generateId(),
            type: 'magnifier',
            x: x - size/2, // Center on click
            y: y - size/2,
            width: size,
            height: size,
            color,
            strokeWidth
        };
        
        onAnnotationsChange([...annotations, newAnn]);
        setSelectedId(newAnn.id);
        
        // Switch back to select
        if (onToolChange) onToolChange('select');
        return;
    }

    if (tool === 'sticker') {
        const size = 64; 
        
        const newAnn: Annotation = {
            id: generateId(),
            type: 'sticker',
            sticker: stickerType,
            x: x - size/2,
            y: y - size/2,
            width: size,
            height: size,
            color,
            strokeWidth
        };
        
        onAnnotationsChange([...annotations, newAnn]);
        setSelectedId(newAnn.id);
        
        // Switch back to select
        if (onToolChange) onToolChange('select');
        return;
    }

    if (tool === 'counter') {
        // Use max existing counter number + 1 to avoid duplicates after deletion
        const existingNumbers = annotations
            .filter(a => a.type === 'counter' && a.text)
            .map(a => parseInt(a.text!, 10))
            .filter(n => !isNaN(n));
        const count = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
        const size = 24 + strokeWidth * 2; 
        
        const newAnn: Annotation = {
            id: generateId(),
            type: 'counter',
            x: x - size/2, // Center on click
            y: y - size/2,
            width: size,
            height: size,
            text: count.toString(),
            color,
            strokeWidth
        };
        
        onAnnotationsChange([...annotations, newAnn]);
        return;
    }

    setIsDrawing(true);
    
    // Create new annotation
    const newAnn: Annotation = {
      id: generateId(),
      type: tool,
      x,
      y,
      color,
      strokeWidth,
      points: tool === 'pen' ? [x, y] : undefined
    };

    setCurrentAnnotation(newAnn);
    // Deselect when drawing new
    setSelectedId(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const { x, y } = getCanvasCoordinates(e);

    if (tool === 'select' && dragStart && selectedId) {
        if (resizeHandle) {
             const updatedAnnotations = annotations.map(ann => {
                 if (ann.id === selectedId) {
                     const newAnn = { ...ann };
                     const original = dragStart.originalAnn;
                     
                     if (ann.type === 'line' || ann.type === 'arrow') {
                         if (resizeHandle === 'start') {
                             newAnn.x = x;
                             newAnn.y = y;
                         } else {
                             newAnn.endX = x;
                             newAnn.endY = y;
                         }
                     } else {
                         // Rect, Circle, Text, Pen
                         const bounds = getBounds(original);
                         if (!bounds) return ann;

                         let newX = bounds.x;
                         let newY = bounds.y;
                         let newW = bounds.width;
                         let newH = bounds.height;
                         
                         // Calculate new bounds based on handle
                         if (resizeHandle.includes('n')) {
                             newY = y;
                             newH = (bounds.y + bounds.height) - y;
                         } else if (resizeHandle.includes('s')) {
                             newH = y - bounds.y;
                         }
                         
                         if (resizeHandle.includes('w')) {
                             newX = x;
                             newW = (bounds.x + bounds.width) - x;
                         } else if (resizeHandle.includes('e')) {
                             newW = x - bounds.x;
                         }

                         // Apply updates based on type
                         if (ann.type === 'pen' && ann.points) {
                             // Scaling pen paths
                             const scaleX = newW / bounds.width;
                             const scaleY = newH / bounds.height;
                             
                             // Guard against div by zero
                             if (isFinite(scaleX) && isFinite(scaleY)) {
                                 newAnn.points = original.points?.map((p, i) => {
                                     if (i % 2 === 0) { // x
                                         return newX + (p - bounds.x) * scaleX;
                                     } else { // y
                                         return newY + (p - bounds.y) * scaleY;
                                     }
                                 });
                             }
                         } else if (ann.type === 'text') {
                             newAnn.x = newX;
                             newAnn.y = newY;
                             // Resizing text changes stroke width (font size)
                             // Ratio of height change
                             const ratio = newH / bounds.height;
                             newAnn.strokeWidth = Math.max(1, original.strokeWidth * ratio);
                         } else {
                             // Rect / Circle / Highlight / Blur
                             // Normalize if negative
                             newAnn.x = newW < 0 ? newX + newW : newX;
                             newAnn.y = newH < 0 ? newY + newH : newY;
                             newAnn.width = Math.abs(newW);
                             newAnn.height = Math.abs(newH);
                         }
                     }
                     
                     return newAnn;
                 }
                 return ann;
             });
             onAnnotationsChange(updatedAnnotations);
             return;
        }

        const dx = x - dragStart.x;
        const dy = y - dragStart.y;
        
        const updatedAnnotations = annotations.map(ann => {
            if (ann.id === selectedId) {
                const newAnn = { ...ann };
                newAnn.x = dragStart.originalAnn.x + dx;
                newAnn.y = dragStart.originalAnn.y + dy;
                
                if (ann.type === 'pen' && dragStart.originalAnn.points) {
                   // Move all points
                   newAnn.points = dragStart.originalAnn.points.map((p, i) => {
                       return i % 2 === 0 ? p + dx : p + dy;
                   });
                }
                
                if ((ann.type === 'arrow' || ann.type === 'line') && dragStart.originalAnn.endX !== undefined && dragStart.originalAnn.endY !== undefined) {
                    newAnn.endX = dragStart.originalAnn.endX + dx;
                    newAnn.endY = dragStart.originalAnn.endY + dy;
                }
                
                return newAnn;
            }
            return ann;
        });
        
        onAnnotationsChange(updatedAnnotations);
        return;
    }

    if (!isDrawing || !currentAnnotation) return;
    
    const updatedAnn = { ...currentAnnotation };

    if (tool === 'rect' || tool === 'circle' || tool === 'highlight' || tool === 'blur' || tool === 'pixelate' || tool === 'magnifier' || tool === 'sticker' || tool === 'counter') {
      updatedAnn.width = x - updatedAnn.x;
      updatedAnn.height = y - updatedAnn.y;
    } else if (tool === 'arrow' || tool === 'line') {
      updatedAnn.endX = x;
      updatedAnn.endY = y;
    } else if (tool === 'pen' && updatedAnn.points) {
      updatedAnn.points = [...updatedAnn.points, x, y];
    }

    setCurrentAnnotation(updatedAnn);
  };

  const handleMouseUp = () => {
    if (dragStart) {
        setDragStart(null);
        setResizeHandle(null);
        return;
    }

    if (!isDrawing || !currentAnnotation) return;
    
    setIsDrawing(false);
    
    // Validate minimum size
    const isValid = () => {
        if (tool === 'pen') return (currentAnnotation.points?.length || 0) > 4;
        if (tool === 'rect' || tool === 'circle' || tool === 'highlight' || tool === 'blur' || tool === 'pixelate' || tool === 'magnifier' || tool === 'sticker' || tool === 'counter') return Math.abs(currentAnnotation.width || 0) > 5 || Math.abs(currentAnnotation.height || 0) > 5;
        if (tool === 'arrow') return Math.abs((currentAnnotation.endX || 0) - currentAnnotation.x) > 5 || Math.abs((currentAnnotation.endY || 0) - currentAnnotation.y) > 5;
        return true;
    };

    if (isValid()) {
        onAnnotationsChange([...annotations, currentAnnotation]);
        setSelectedId(currentAnnotation.id); // Select the newly created item
        
        // Auto-switch back to select tool for everything except text (text handles itself)
        if (tool !== 'text' && onToolChange) {
            onToolChange('select');
        }
    }
    
    setCurrentAnnotation(null);
  };

  // ─── Touch event handlers for mobile ─────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return; // Ignore multi-touch
    e.preventDefault(); // Prevent scroll/zoom
    const touch = e.touches[0];
    // Synthesize a minimal object matching handleMouseDown's expectations
    handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY } as React.MouseEvent);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY } as React.MouseEvent);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    handleMouseUp();
  };

  const commitText = () => {
      // Prevent double commits
      if (justCommittedRef.current) return;
      
      justCommittedRef.current = true;
      setTimeout(() => { justCommittedRef.current = false; }, 200);

      // Use ref value if available to ensure we don't miss the last keystroke due to state batching
      const textToSave = inputRef.current ? inputRef.current.value : textInput?.text;

      if (textInput && textToSave && textToSave.trim()) {
          const newAnn: Annotation = {
            id: generateId(),
            type: 'text',
            x: textInput.x,
            y: textInput.y,
            text: textToSave, // Use the freshest text
            color,
            strokeWidth
          };
          onAnnotationsChange([...annotations, newAnn]);
          setSelectedId(newAnn.id);
          
          if (onToolChange) {
              onToolChange('select');
          }
      }
      setTextInput(null);
  };
  
  // Calculate text input position styles
  const getTextInputStyle = () => {
      if (!textInput || !canvasRef.current) return {};
      
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const scaleX = rect.width / canvas.width;
      const scaleY = rect.height / canvas.height;
      
      return {
          left: `${textInput.x * scaleX}px`,
          top: `${textInput.y * scaleY}px`,
          fontSize: `${(strokeWidth * 5 + 10) * scaleX}px`, // Scale font size too
          color: color,
          minWidth: '100px'
      };
  };

  const getCursor = () => {
    if (tool === 'select') {
      if (dragStart && resizeHandle) return 'crosshair';
      if (dragStart) return 'grabbing';
      
      // Check for hover over handle
      if (selectedId && !dragStart) { // Only check hover if not dragging
           // This is tricky because we don't track mouse move without drag usually
           // But let's leave it as default or rely on the helper if we added state for hover
           // Since we don't have hover state, we can't dynamic cursor easily without more renders
           // But we can check handles in handleMouseMove even if not dragging?
           // For now, simple return default
      }
      return 'default';
    }
    if (tool === 'text') return 'text';
    return 'crosshair';
  };

  const deleteSelected = () => {
      if (selectedId) {
          const newAnnotations = annotations.filter(a => a.id !== selectedId);
          onAnnotationsChange(newAnnotations);
          setSelectedId(null);
      }
  };

  const getSelectionButtonStyle = () => {
      if (!selectedId || !canvasRef.current) return { display: 'none' };
      
      const selectedAnn = annotations.find(a => a.id === selectedId);
      if (!selectedAnn) return { display: 'none' };
      
      const bounds = getBounds(selectedAnn);
      if (!bounds) return { display: 'none' };

      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const scaleX = rect.width / canvas.width;
      const scaleY = rect.height / canvas.height;
      
      // Position at top-right of selection
      return {
          left: `${(bounds.x + bounds.width) * scaleX}px`,
          top: `${bounds.y * scaleY}px`,
          transform: 'translate(-50%, -120%)' // Move up a bit
      };
  };

  return (
    <div 
        ref={containerRef} 
        className="relative shadow-2xl rounded-sm overflow-hidden bg-white inline-block origin-top-left flex-none"
        style={{ 
            width: image.naturalWidth * zoom, 
            height: image.naturalHeight * zoom
        }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="block touch-none"
        style={{ 
            width: '100%', 
            height: '100%',
            cursor: getCursor() 
        }}
      />
      
      {selectedId && !dragStart && (
          <div 
            className="absolute z-20"
            style={getSelectionButtonStyle()}
          >
              <button
                className="bg-white text-red-500 p-1.5 rounded-full shadow-md border border-red-100 hover:bg-red-50 transition-colors"
                onMouseDown={(e) => {
                    e.stopPropagation(); // Prevent canvas click
                    deleteSelected();
                }}
                onTouchStart={(e) => {
                    e.stopPropagation();
                    deleteSelected();
                }}
                title="Delete"
              >
                  <Trash2 size={16} />
              </button>
          </div>
      )}

      {textInput && (
          <div 
            className="absolute z-50"
            style={getTextInputStyle()}
          >
              <input
                ref={inputRef}
                autoFocus
                className="bg-white border-2 border-dashed border-indigo-500 text-indigo-900 px-1 py-0.5 outline-none rounded shadow-xl min-w-[50px]"
                value={textInput.text}
                onChange={(e) => setTextInput({ ...textInput, text: e.target.value })}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        commitText();
                    }
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        setTextInput(null);
                    }
                }}
              />
          </div>
      )}
    </div>
  );
}