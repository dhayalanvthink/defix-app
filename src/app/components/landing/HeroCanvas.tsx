import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Pen,
  ArrowUpRight,
  Square,
  Stamp,
  Eraser,
  RotateCcw,
  Eye,
  MousePointer2,
} from 'lucide-react';

/* ═══════════════════════════ constants & types ═══════════════════════════ */
const NAVY = '#080F5B';
const GREEN = '#15DB95';

type ToolType = 'pen' | 'arrow' | 'rect' | 'stamp';

interface Point { x: number; y: number }

interface PenStroke  { type: 'pen';   points: Point[]; color: string; width: number }
interface ArrowShape { type: 'arrow'; from: Point; to: Point; color: string }
interface RectShape  { type: 'rect';  from: Point; to: Point; color: string }
interface StampShape { type: 'stamp'; pos: Point; color: string }

type Annotation = PenStroke | ArrowShape | RectShape | StampShape;

const COLORS = [GREEN, '#EF4444', NAVY, '#F59E0B'];

const TOOLS: { id: ToolType; icon: React.ElementType; label: string }[] = [
  { id: 'pen',   icon: Pen,          label: 'Draw' },
  { id: 'arrow', icon: ArrowUpRight, label: 'Arrow' },
  { id: 'rect',  icon: Square,       label: 'Rectangle' },
  { id: 'stamp', icon: Stamp,        label: 'Stamp' },
];

interface GhostState {
  cursor: { x: number; y: number; opacity: number } | null;
  annotations: Annotation[];
  opacity: number;
}

/* ═══════════════════════════ utility ═══════════════════════════ */
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function easeOut(t: number) { return 1 - Math.pow(1 - t, 3); }
function easeInOut(t: number) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function clamp01(t: number) { return Math.max(0, Math.min(1, t)); }

/* ═══════════════════════════ drawing helpers ═══════════════════════════ */

function drawArrowhead(ctx: CanvasRenderingContext2D, from: Point, to: Point, size: number) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - size * Math.cos(angle - Math.PI / 6), to.y - size * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(to.x - size * Math.cos(angle + Math.PI / 6), to.y - size * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

function renderAnnotation(ctx: CanvasRenderingContext2D, a: Annotation, dpr: number) {
  ctx.save();
  switch (a.type) {
    case 'pen': {
      if (a.points.length < 2) break;
      ctx.strokeStyle = a.color;
      ctx.lineWidth = a.width * dpr;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(a.points[0].x, a.points[0].y);
      for (let i = 1; i < a.points.length; i++) ctx.lineTo(a.points[i].x, a.points[i].y);
      ctx.stroke();
      break;
    }
    case 'arrow': {
      ctx.strokeStyle = a.color;
      ctx.fillStyle = a.color;
      ctx.lineWidth = 2.5 * dpr;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(a.from.x, a.from.y);
      ctx.lineTo(a.to.x, a.to.y);
      ctx.stroke();
      drawArrowhead(ctx, a.from, a.to, 12 * dpr);
      break;
    }
    case 'rect': {
      ctx.strokeStyle = a.color;
      ctx.lineWidth = 2.5 * dpr;
      ctx.lineJoin = 'round';
      const x = Math.min(a.from.x, a.to.x);
      const y = Math.min(a.from.y, a.to.y);
      const w = Math.abs(a.to.x - a.from.x);
      const h = Math.abs(a.to.y - a.from.y);
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = a.color + '15';
      ctx.fillRect(x, y, w, h);
      break;
    }
    case 'stamp': {
      const r = 22 * dpr;
      ctx.fillStyle = a.color + '20';
      ctx.strokeStyle = a.color;
      ctx.lineWidth = 2 * dpr;
      const sx = a.pos.x - r * 2;
      const sy = a.pos.y - r;
      ctx.beginPath();
      ctx.roundRect(sx, sy, r * 4, r * 2, 8 * dpr);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = a.color;
      ctx.font = `bold ${13 * dpr}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('APPROVED', a.pos.x, a.pos.y);
      break;
    }
  }
  ctx.restore();
}

/* ═══════════════════════════ programmatic mockup ═══════════════════════════ */

function drawMockupBackground(ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number) {
  // Workspace
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, 0, w, h);

  // Subtle dot grid
  ctx.fillStyle = '#cbd5e1';
  const step = 24 * dpr;
  for (let gx = step; gx < w; gx += step) {
    for (let gy = step; gy < h; gy += step) {
      ctx.beginPath();
      ctx.arc(gx, gy, 0.8 * dpr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Card
  const pad = 24 * dpr;
  const cw = w - pad * 2;
  const ch = h - pad * 2;
  const cx = pad;
  const cy = pad;

  // Card shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.08)';
  ctx.shadowBlur = 24 * dpr;
  ctx.shadowOffsetY = 6 * dpr;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(cx, cy, cw, ch, 10 * dpr);
  ctx.fill();
  ctx.restore();

  /* ─── Nav bar ─── */
  const navH = ch * 0.08;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(cx, cy, cw, navH, [10 * dpr, 10 * dpr, 0, 0]);
  ctx.fill();
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(cx, cy + navH - dpr, cw, dpr);

  // Nav logo
  ctx.fillStyle = NAVY;
  ctx.beginPath();
  ctx.arc(cx + 18 * dpr, cy + navH / 2, 5 * dpr, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#94a3b8';
  ctx.beginPath();
  ctx.roundRect(cx + 28 * dpr, cy + navH / 2 - 3 * dpr, 36 * dpr, 6 * dpr, 3 * dpr);
  ctx.fill();

  // Nav links
  const navLinkY = cy + navH / 2 - 3 * dpr;
  [0.25, 0.35, 0.45].forEach(pct => {
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.roundRect(cx + cw * pct, navLinkY, 28 * dpr, 6 * dpr, 3 * dpr);
    ctx.fill();
  });

  // Nav avatar with notification dot
  const avatarX = cx + cw - 80 * dpr;
  const avatarCY = cy + navH / 2;
  ctx.fillStyle = '#6366f1';
  ctx.beginPath();
  ctx.arc(avatarX, avatarCY, 7 * dpr, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c4b5fd';
  ctx.font = `bold ${6 * dpr}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('J', avatarX, avatarCY + 0.5 * dpr);
  // notification dot
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(avatarX + 5 * dpr, avatarCY - 5 * dpr, 2.5 * dpr, 0, Math.PI * 2);
  ctx.fill();

  // Nav CTA
  ctx.fillStyle = GREEN;
  ctx.beginPath();
  ctx.roundRect(cx + cw - 60 * dpr, cy + navH / 2 - 8 * dpr, 46 * dpr, 16 * dpr, 4 * dpr);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${6 * dpr}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Sign Up', cx + cw - 37 * dpr, cy + navH / 2);

  /* ─── Hero section ─── */
  const heroY = cy + navH;
  const heroH = ch * 0.3;
  const heroGrad = ctx.createLinearGradient(cx, heroY, cx + cw, heroY + heroH);
  heroGrad.addColorStop(0, NAVY);
  heroGrad.addColorStop(0.6, '#141b7a');
  heroGrad.addColorStop(1, '#1a237e');
  ctx.fillStyle = heroGrad;
  ctx.fillRect(cx, heroY, cw, heroH);

  // Subtle hero pattern — small floating circles
  ctx.globalAlpha = 0.06;
  const circles = [[0.15, 0.3, 20], [0.4, 0.8, 15], [0.7, 0.2, 12], [0.85, 0.6, 18], [0.55, 0.45, 10]];
  circles.forEach(([rx, ry, r]) => {
    ctx.fillStyle = GREEN;
    ctx.beginPath();
    ctx.arc(cx + cw * (rx as number), heroY + heroH * (ry as number), (r as number) * dpr, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Hero text placeholders
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  ctx.roundRect(cx + cw * 0.08, heroY + heroH * 0.22, cw * 0.42, 13 * dpr, 4 * dpr);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.roundRect(cx + cw * 0.08, heroY + heroH * 0.22 + 20 * dpr, cw * 0.32, 7 * dpr, 3 * dpr);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(cx + cw * 0.08, heroY + heroH * 0.22 + 32 * dpr, cw * 0.38, 7 * dpr, 3 * dpr);
  ctx.fill();

  // Hero button
  ctx.fillStyle = GREEN;
  ctx.beginPath();
  ctx.roundRect(cx + cw * 0.08, heroY + heroH * 0.68, 70 * dpr, 20 * dpr, 5 * dpr);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${7 * dpr}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Get Started', cx + cw * 0.08 + 35 * dpr, heroY + heroH * 0.68 + 10 * dpr);

  // Secondary button outline
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = dpr;
  ctx.beginPath();
  ctx.roundRect(cx + cw * 0.08 + 80 * dpr, heroY + heroH * 0.68, 60 * dpr, 20 * dpr, 5 * dpr);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = `${6 * dpr}px system-ui`;
  ctx.fillText('Learn More', cx + cw * 0.08 + 80 * dpr + 30 * dpr, heroY + heroH * 0.68 + 10 * dpr);

  /* ─── Hero right-side mini bar chart ─── */
  const chartX = cx + cw * 0.6;
  const chartY = heroY + heroH * 0.12;
  const chartW = cw * 0.32;
  const chartH = heroH * 0.76;

  // Chart container
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.beginPath();
  ctx.roundRect(chartX, chartY, chartW, chartH, 8 * dpr);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = dpr;
  ctx.beginPath();
  ctx.roundRect(chartX, chartY, chartW, chartH, 8 * dpr);
  ctx.stroke();

  // Chart title
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = `bold ${6 * dpr}px system-ui`;
  ctx.textAlign = 'left';
  ctx.fillText('Weekly Activity', chartX + 10 * dpr, chartY + 14 * dpr);

  // Chart value
  ctx.fillStyle = GREEN;
  ctx.font = `bold ${10 * dpr}px system-ui`;
  ctx.textAlign = 'right';
  ctx.fillText('+24%', chartX + chartW - 10 * dpr, chartY + 16 * dpr);

  // Horizontal grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = dpr * 0.5;
  const barAreaTop = chartY + 26 * dpr;
  const barAreaH = chartH - 40 * dpr;
  for (let gl = 0; gl <= 3; gl++) {
    const gy = barAreaTop + (barAreaH / 3) * gl;
    ctx.beginPath();
    ctx.moveTo(chartX + 8 * dpr, gy);
    ctx.lineTo(chartX + chartW - 8 * dpr, gy);
    ctx.stroke();
  }

  // Bars
  const barHeights = [0.45, 0.72, 0.38, 0.88, 0.6, 0.95, 0.55];
  const barCount = barHeights.length;
  const barGap = 4 * dpr;
  const barAreaW = chartW - 24 * dpr;
  const barW = (barAreaW - barGap * (barCount - 1)) / barCount;
  const barBaseY = barAreaTop + barAreaH;

  barHeights.forEach((bh, i) => {
    const bx = chartX + 12 * dpr + i * (barW + barGap);
    const bHeight = barAreaH * bh;
    const by = barBaseY - bHeight;
    // Bar body
    const barGrad = ctx.createLinearGradient(bx, by, bx, barBaseY);
    barGrad.addColorStop(0, GREEN);
    barGrad.addColorStop(1, GREEN + '60');
    ctx.fillStyle = barGrad;
    ctx.beginPath();
    ctx.roundRect(bx, by, barW, bHeight, [2 * dpr, 2 * dpr, 0, 0]);
    ctx.fill();
  });

  // Day labels
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = `${4 * dpr}px system-ui`;
  ctx.textAlign = 'center';
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  dayLabels.forEach((d, i) => {
    const dx = chartX + 12 * dpr + i * (barW + barGap) + barW / 2;
    ctx.fillText(d, dx, barBaseY + 9 * dpr);
  });

  /* ─── Content section ─── */
  const contentY = heroY + heroH + 16 * dpr;

  // Section heading
  ctx.fillStyle = NAVY;
  ctx.beginPath();
  ctx.roundRect(cx + cw * 0.08, contentY, cw * 0.25, 9 * dpr, 4 * dpr);
  ctx.fill();

  // Stat badges row
  const badgeY = contentY + 16 * dpr;
  const badges = [
    { val: '2.4k', label: 'Users', color: GREEN },
    { val: '98%', label: 'Uptime', color: '#6366f1' },
    { val: '1.2s', label: 'Avg', color: '#f59e0b' },
  ];
  let badgeXCur = cx + cw * 0.08;
  badges.forEach(b => {
    const bw = 52 * dpr;
    const bh = 18 * dpr;
    ctx.fillStyle = b.color + '12';
    ctx.strokeStyle = b.color + '30';
    ctx.lineWidth = dpr * 0.8;
    ctx.beginPath();
    ctx.roundRect(badgeXCur, badgeY, bw, bh, 9 * dpr);
    ctx.fill();
    ctx.stroke();
    // value
    ctx.fillStyle = b.color;
    ctx.font = `bold ${6 * dpr}px system-ui`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.val, badgeXCur + 8 * dpr, badgeY + bh / 2);
    // label
    ctx.fillStyle = '#94a3b8';
    ctx.font = `${5 * dpr}px system-ui`;
    ctx.fillText(b.label, badgeXCur + 30 * dpr, badgeY + bh / 2);
    badgeXCur += bw + 8 * dpr;
  });

  // Paragraph lines
  const paraY = badgeY + 28 * dpr;
  [0.72, 0.65, 0.58].forEach((pw, i) => {
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.roundRect(cx + cw * 0.08, paraY + i * 12 * dpr, cw * pw * 0.85, 5 * dpr, 3 * dpr);
    ctx.fill();
  });

  /* ─── Feature cards ─── */
  const cardsY = paraY + 3 * 12 * dpr + 14 * dpr;
  const cardGap = 12 * dpr;
  const cardCount = 3;
  const innerW = cw * 0.84;
  const fCardW = (innerW - cardGap * (cardCount - 1)) / cardCount;
  const fCardH = Math.min(ch * 0.24, 88 * dpr);
  const cardsX = cx + cw * 0.08;

  const iconColors = [GREEN, '#6366f1', '#f59e0b'];

  for (let i = 0; i < cardCount; i++) {
    const fcx = cardsX + i * (fCardW + cardGap);

    // Card bg
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = dpr;
    ctx.beginPath();
    ctx.roundRect(fcx, cardsY, fCardW, fCardH, 6 * dpr);
    ctx.fill();
    ctx.stroke();

    // Icon circle
    ctx.fillStyle = iconColors[i] + '20';
    ctx.beginPath();
    ctx.arc(fcx + 16 * dpr, cardsY + 16 * dpr, 8 * dpr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = iconColors[i];
    ctx.beginPath();
    ctx.arc(fcx + 16 * dpr, cardsY + 16 * dpr, 3 * dpr, 0, Math.PI * 2);
    ctx.fill();

    // Title placeholder
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(fcx + 10 * dpr, cardsY + 32 * dpr, fCardW * 0.55, 5 * dpr, 3 * dpr);
    ctx.fill();

    /* ─── Per-card detail ─── */
    if (i === 0) {
      // Sparkline (ascending trend)
      const slY = cardsY + 44 * dpr;
      const slH = 18 * dpr;
      const slW = fCardW - 20 * dpr;
      const slX = fcx + 10 * dpr;
      const sparkPts = [0.6, 0.45, 0.55, 0.3, 0.4, 0.2, 0.15, 0.08];
      ctx.strokeStyle = GREEN;
      ctx.lineWidth = 1.5 * dpr;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      sparkPts.forEach((v, si) => {
        const sx = slX + (si / (sparkPts.length - 1)) * slW;
        const sy = slY + v * slH;
        si === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
      });
      ctx.stroke();
      // Fill below
      ctx.lineTo(slX + slW, slY + slH);
      ctx.lineTo(slX, slY + slH);
      ctx.closePath();
      ctx.fillStyle = GREEN + '10';
      ctx.fill();
      // Value
      ctx.fillStyle = GREEN;
      ctx.font = `bold ${7 * dpr}px system-ui`;
      ctx.textAlign = 'right';
      ctx.fillText('+18%', fcx + fCardW - 10 * dpr, cardsY + 16 * dpr);
    }

    if (i === 1) {
      // Progress bar
      const pbX = fcx + 10 * dpr;
      const pbY = cardsY + 48 * dpr;
      const pbW = fCardW - 20 * dpr;
      const pbH = 6 * dpr;
      const fillPct = 0.72;
      // Track
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.roundRect(pbX, pbY, pbW, pbH, 3 * dpr);
      ctx.fill();
      // Fill
      const progGrad = ctx.createLinearGradient(pbX, pbY, pbX + pbW * fillPct, pbY);
      progGrad.addColorStop(0, '#6366f1');
      progGrad.addColorStop(1, '#818cf8');
      ctx.fillStyle = progGrad;
      ctx.beginPath();
      ctx.roundRect(pbX, pbY, pbW * fillPct, pbH, 3 * dpr);
      ctx.fill();
      // Percentage label
      ctx.fillStyle = '#6366f1';
      ctx.font = `bold ${7 * dpr}px system-ui`;
      ctx.textAlign = 'right';
      ctx.fillText('72%', fcx + fCardW - 10 * dpr, cardsY + 16 * dpr);
      // Sub-label
      ctx.fillStyle = '#94a3b8';
      ctx.font = `${5 * dpr}px system-ui`;
      ctx.textAlign = 'left';
      ctx.fillText('18 of 25 tasks', pbX, pbY + pbH + 10 * dpr);
    }

    if (i === 2) {
      // Circular progress (donut)
      const donutCX = fcx + fCardW / 2;
      const donutCY = cardsY + 54 * dpr;
      const donutR = 12 * dpr;
      const donutW = 3 * dpr;
      const donutPct = 0.87;
      // Track
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = donutW;
      ctx.beginPath();
      ctx.arc(donutCX, donutCY, donutR, 0, Math.PI * 2);
      ctx.stroke();
      // Progress arc
      ctx.strokeStyle = '#f59e0b';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(donutCX, donutCY, donutR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * donutPct);
      ctx.stroke();
      // Center text
      ctx.fillStyle = '#f59e0b';
      ctx.font = `bold ${7 * dpr}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('87%', donutCX, donutCY);
      // Top-right value
      ctx.textAlign = 'right';
      ctx.fillText('87%', fcx + fCardW - 10 * dpr, cardsY + 16 * dpr);
    }

    // Bottom text line (common)
    if (i !== 1) {
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.roundRect(fcx + 10 * dpr, cardsY + fCardH - 14 * dpr, fCardW * 0.6, 4 * dpr, 2 * dpr);
      ctx.fill();
    }
  }

  /* ─── Footer bar ─── */
  const footerH = ch * 0.06;
  const footerY = cy + ch - footerH;
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.roundRect(cx, footerY, cw, footerH, [0, 0, 10 * dpr, 10 * dpr]);
  ctx.fill();
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(cx, footerY, cw, dpr);

  // Footer logo text
  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.roundRect(cx + 14 * dpr, footerY + footerH / 2 - 3 * dpr, 40 * dpr, 6 * dpr, 3 * dpr);
  ctx.fill();

  // Footer social circles
  const socialX = cx + cw - 50 * dpr;
  const socialCY = footerY + footerH / 2;
  [0, 14, 28].forEach(offset => {
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(socialX + offset * dpr, socialCY, 4 * dpr, 0, Math.PI * 2);
    ctx.fill();
  });

  // Footer links
  ctx.fillStyle = '#cbd5e1';
  [0.3, 0.42].forEach(pct => {
    ctx.beginPath();
    ctx.roundRect(cx + cw * pct, footerY + footerH / 2 - 3 * dpr, 30 * dpr, 6 * dpr, 3 * dpr);
    ctx.fill();
  });
}

/* ═══════════════════════════ ghost cursor ═══════════════════════════ */

function drawGhostCursor(ctx: CanvasRenderingContext2D, x: number, y: number, opacity: number, dpr: number) {
  ctx.save();
  ctx.globalAlpha = opacity * 0.85;
  ctx.translate(x, y);
  const s = dpr * 0.9;

  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = 6 * dpr;
  ctx.shadowOffsetY = 2 * dpr;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 18 * s);
  ctx.lineTo(5 * s, 14 * s);
  ctx.lineTo(9 * s, 21 * s);
  ctx.lineTo(12 * s, 19 * s);
  ctx.lineTo(8 * s, 12 * s);
  ctx.lineTo(14 * s, 12 * s);
  ctx.closePath();

  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 1.2 * dpr;
  ctx.stroke();

  ctx.restore();
}

/* ═══════════════════════════ ghost auto-demo ═══════════════════════════ */
const GHOST_LOOP = 10;

function computeGhostState(elapsed: number, w: number, h: number, dpr: number): GhostState {
  const t = elapsed % GHOST_LOOP;
  const result: GhostState = { cursor: null, annotations: [], opacity: 1 };

  const pad = 24 * dpr;
  const cw = w - pad * 2;
  const ch = h - pad * 2;
  const cx = pad;
  const cy = pad;
  const navH = ch * 0.08;
  const heroY = cy + navH;
  const heroH = ch * 0.3;

  const penY = heroY + heroH * 0.22 + 17 * dpr;
  const penStartX = cx + cw * 0.08;
  const penEndX = cx + cw * 0.08 + cw * 0.42;

  const arrowStartX = cx + cw * 0.38;
  const contentBaseY = heroY + heroH + 16 * dpr;
  const arrowStartY = contentBaseY + 5 * dpr;
  const arrowEndX = cx + cw * 0.2;
  const badgeY = contentBaseY + 16 * dpr;
  const paraY = badgeY + 28 * dpr;
  const cardsBaseY = paraY + 3 * 12 * dpr + 14 * dpr;
  const arrowEndY = cardsBaseY + 10 * dpr;

  const stampX = cx + cw * 0.75;
  const stampY = cardsBaseY + 30 * dpr;

  // Helper: generate full pen stroke
  const makePenStroke = (): PenStroke => {
    const pts: Point[] = [];
    for (let i = 0; i <= 40; i++) {
      const pp = i / 40;
      pts.push({ x: lerp(penStartX, penEndX, pp), y: penY + Math.sin(pp * Math.PI * 4) * 2.5 * dpr });
    }
    return { type: 'pen', points: pts, color: '#EF4444', width: 3 };
  };

  const fullArrow: ArrowShape = {
    type: 'arrow',
    from: { x: arrowStartX, y: arrowStartY },
    to: { x: arrowEndX, y: arrowEndY },
    color: NAVY,
  };

  const fullStamp: StampShape = { type: 'stamp', pos: { x: stampX, y: stampY }, color: GREEN };

  // --- Phase 1: Cursor enters (0 → 0.6) ---
  if (t < 0.6) {
    const p = clamp01(t / 0.6);
    result.cursor = {
      x: lerp(cx - 20 * dpr, penStartX, easeOut(p)),
      y: lerp(heroY + heroH * 0.5, penY, easeOut(p)),
      opacity: clamp01(p * 2.5),
    };
  }
  // --- Phase 2: Pen underline (0.6 → 2.2) ---
  else if (t < 2.2) {
    const p = clamp01((t - 0.6) / 1.6);
    const curX = lerp(penStartX, penEndX, easeInOut(p));
    result.cursor = { x: curX, y: penY + Math.sin(p * Math.PI * 4) * 2 * dpr, opacity: 1 };
    const numPts = Math.max(2, Math.floor(p * 40));
    const pts: Point[] = [];
    for (let i = 0; i <= numPts; i++) {
      const pp = i / 40;
      pts.push({ x: lerp(penStartX, penEndX, pp), y: penY + Math.sin(pp * Math.PI * 4) * 2.5 * dpr });
    }
    result.annotations.push({ type: 'pen', points: pts, color: '#EF4444', width: 3 });
  }
  // --- Phase 3: Cursor to arrow start (2.2 → 2.8) ---
  else if (t < 2.8) {
    const p = clamp01((t - 2.2) / 0.6);
    result.cursor = {
      x: lerp(penEndX, arrowStartX, easeInOut(p)),
      y: lerp(penY, arrowStartY, easeInOut(p)),
      opacity: 1,
    };
    result.annotations.push(makePenStroke());
  }
  // --- Phase 4: Arrow drawn (2.8 → 4.0) ---
  else if (t < 4.0) {
    const p = clamp01((t - 2.8) / 1.2);
    const curEndX = lerp(arrowStartX, arrowEndX, easeOut(p));
    const curEndY = lerp(arrowStartY, arrowEndY, easeOut(p));
    result.cursor = { x: curEndX, y: curEndY, opacity: 1 };
    result.annotations.push(makePenStroke());
    result.annotations.push({ type: 'arrow', from: { x: arrowStartX, y: arrowStartY }, to: { x: curEndX, y: curEndY }, color: NAVY });
  }
  // --- Phase 5: Cursor to stamp (4.0 → 4.6) ---
  else if (t < 4.6) {
    const p = clamp01((t - 4.0) / 0.6);
    result.cursor = { x: lerp(arrowEndX, stampX, easeInOut(p)), y: lerp(arrowEndY, stampY, easeInOut(p)), opacity: 1 };
    result.annotations.push(makePenStroke(), fullArrow);
  }
  // --- Phase 6: Stamp placed + cursor fades (4.6 → 5.2) ---
  else if (t < 5.2) {
    const p = clamp01((t - 4.6) / 0.6);
    result.cursor = { x: stampX, y: stampY, opacity: 1 - easeOut(p) };
    result.annotations.push(makePenStroke(), fullArrow, fullStamp);
  }
  // --- Phase 7: Hold (5.2 → 7.5) ---
  else if (t < 7.5) {
    result.annotations.push(makePenStroke(), fullArrow, fullStamp);
  }
  // --- Phase 8: Fade out (7.5 → 8.3) ---
  else if (t < 8.3) {
    const p = clamp01((t - 7.5) / 0.8);
    result.opacity = 1 - easeOut(p);
    result.annotations.push(makePenStroke(), fullArrow, fullStamp);
  }
  // Phase 9 (8.3 → 10): empty pause

  return result;
}

/* ═══════════════════════════ component ═══════════════════════════ */

export function HeroInteractiveDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [activeTool, setActiveTool] = useState<ToolType>('pen');
  const [activeColor, setActiveColor] = useState(GREEN);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [demoActive, setDemoActive] = useState(false);
  const [showYourTurn, setShowYourTurn] = useState(false);

  // Refs for stale-closure safety
  const annotationsRef = useRef<Annotation[]>([]);
  const currentAnnotationRef = useRef<Annotation | null>(null);
  const hasInteractedRef = useRef(false);
  useEffect(() => { annotationsRef.current = annotations; }, [annotations]);
  useEffect(() => { currentAnnotationRef.current = currentAnnotation; }, [currentAnnotation]);
  useEffect(() => { hasInteractedRef.current = hasInteracted; }, [hasInteracted]);

  // "Your turn" badge — show on interaction, hide after 2.5s
  useEffect(() => {
    if (!hasInteracted) return;
    setDemoActive(false);
    setShowYourTurn(true);
    const timeout = setTimeout(() => setShowYourTurn(false), 2500);
    return () => clearTimeout(timeout);
  }, [hasInteracted]);

  /* ── canvas coordinate helper ── */
  const getCanvasPoint = useCallback((e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const clientX = 'touches' in e ? e.touches[0]?.clientX ?? (e as React.TouchEvent).changedTouches[0]?.clientX ?? 0 : e.clientX;
    const clientY = 'touches' in e ? e.touches[0]?.clientY ?? (e as React.TouchEvent).changedTouches[0]?.clientY ?? 0 : e.clientY;
    return { x: (clientX - rect.left) * dpr, y: (clientY - rect.top) * dpr };
  }, []);

  /* ── unified render ── */
  const renderAll = useCallback((ghost?: GhostState) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMockupBackground(ctx, canvas.width, canvas.height, dpr);

    if (ghost && ghost.annotations.length > 0) {
      ctx.save();
      ctx.globalAlpha = ghost.opacity;
      for (const a of ghost.annotations) renderAnnotation(ctx, a, dpr);
      ctx.restore();
    }
    if (ghost?.cursor) {
      drawGhostCursor(ctx, ghost.cursor.x, ghost.cursor.y, ghost.cursor.opacity * (ghost.opacity ?? 1), dpr);
    }

    for (const a of annotationsRef.current) renderAnnotation(ctx, a, dpr);
    if (currentAnnotationRef.current) renderAnnotation(ctx, currentAnnotationRef.current, dpr);
  }, []);

  /* ── resize ── */
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      renderAll();
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [renderAll]);

  /* ── re-render on user annotation changes ── */
  useEffect(() => { renderAll(); }, [annotations, currentAnnotation, renderAll]);

  /* ── ghost auto-demo ── */
  useEffect(() => {
    if (hasInteracted) return;

    let animId = 0;
    let startTime = 0;

    const timeoutId = setTimeout(() => {
      setDemoActive(true);
      startTime = performance.now();
      const tick = (now: number) => {
        if (hasInteractedRef.current) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dpr = window.devicePixelRatio || 1;
        const elapsed = (now - startTime) / 1000;
        const ghost = computeGhostState(elapsed, canvas.width, canvas.height, dpr);
        renderAll(ghost);
        animId = requestAnimationFrame(tick);
      };
      animId = requestAnimationFrame(tick);
    }, 3500);

    return () => {
      clearTimeout(timeoutId);
      cancelAnimationFrame(animId);
    };
  }, [hasInteracted, renderAll]);

  /* ── event handlers ── */
  const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!hasInteractedRef.current) setHasInteracted(true);
    const pt = getCanvasPoint(e);

    if (activeTool === 'stamp') {
      setAnnotations(prev => [...prev, { type: 'stamp', pos: pt, color: activeColor }]);
      return;
    }

    setIsDrawing(true);
    if (activeTool === 'pen') {
      setCurrentAnnotation({ type: 'pen', points: [pt], color: activeColor, width: 3 });
    } else if (activeTool === 'arrow') {
      setCurrentAnnotation({ type: 'arrow', from: pt, to: pt, color: activeColor });
    } else if (activeTool === 'rect') {
      setCurrentAnnotation({ type: 'rect', from: pt, to: pt, color: activeColor });
    }
  }, [activeTool, activeColor, getCanvasPoint]);

  const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !currentAnnotation) return;
    e.preventDefault();
    const pt = getCanvasPoint(e);

    if (currentAnnotation.type === 'pen') {
      setCurrentAnnotation(prev => prev?.type === 'pen' ? { ...prev, points: [...prev.points, pt] } : prev);
    } else if (currentAnnotation.type === 'arrow') {
      setCurrentAnnotation(prev => prev?.type === 'arrow' ? { ...prev, to: pt } : prev);
    } else if (currentAnnotation.type === 'rect') {
      setCurrentAnnotation(prev => prev?.type === 'rect' ? { ...prev, to: pt } : prev);
    }
  }, [isDrawing, currentAnnotation, getCanvasPoint]);

  const handlePointerUp = useCallback(() => {
    if (!isDrawing || !currentAnnotation) { setIsDrawing(false); return; }
    setAnnotations(prev => [...prev, currentAnnotation]);
    setCurrentAnnotation(null);
    setIsDrawing(false);
  }, [isDrawing, currentAnnotation]);

  const handleClear = () => { setAnnotations([]); setCurrentAnnotation(null); };
  const handleUndo  = () => { setAnnotations(prev => prev.slice(0, -1)); };

  /* ═══════════════════════════ JSX ═══════════════════════════ */
  return (
    <div className="relative">
      {/* Browser chrome */}
      <div
        className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-200/60"
        style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #0a1270 50%, ${NAVY} 100%)` }}
      >
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 sm:px-5 py-3 sm:py-3.5 border-b border-white/10">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-400/80" />
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-400/80" />
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-400/80" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="bg-white/10 rounded-lg px-4 py-1 text-xs sm:text-sm text-white/60 font-mono">
              defix.app/editor
            </div>
          </div>
        </div>

        {/* Canvas area */}
        <div
          ref={containerRef}
          className="relative aspect-[4/3] sm:aspect-[16/9.5] md:aspect-[16/9] cursor-crosshair select-none"
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
          />

          {/* "Try it live" hint overlay — acts as click-through to canvas */}
          <AnimatePresence>
            {!hasInteracted && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex items-center justify-center z-10 cursor-crosshair"
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
                onTouchStart={handlePointerDown}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
              >
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-2xl px-4 py-3 sm:px-6 sm:py-4 flex items-center gap-2.5 sm:gap-3 border border-white/60 pointer-events-none"
                >
                  <div
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${GREEN}20` }}
                  >
                    <Pen className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: GREEN }} />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold" style={{ color: NAVY }}>Try it live</div>
                    <div className="text-[10px] sm:text-xs text-slate-500">Draw, annotate & stamp right here</div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating toolbar */}
          <div className="absolute bottom-2 sm:bottom-3 md:bottom-5 left-1/2 -translate-x-1/2 z-20 max-w-[calc(100%-1rem)] sm:max-w-none">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="flex items-center gap-0.5 sm:gap-1 md:gap-1.5 bg-white/95 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-2xl border border-white/60 px-1.5 sm:px-2 md:px-3 py-1.5 sm:py-2"
            >
              {/* Status badge */}
              <AnimatePresence mode="wait">
                {demoActive && !hasInteracted && (
                  <motion.div
                    key="demo-badge"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.3 }}
                    className="hidden sm:flex items-center gap-1.5 overflow-hidden"
                  >
                    <div className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-lg bg-slate-50 border border-slate-100 shrink-0">
                      <Eye className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="hidden md:inline text-[10px] font-medium text-slate-400 whitespace-nowrap">
                        Watching demo
                      </span>
                      <span className="relative flex h-1.5 w-1.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: GREEN }} />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: GREEN }} />
                      </span>
                    </div>
                    <div className="w-px h-5 bg-slate-200 shrink-0" />
                  </motion.div>
                )}
                {showYourTurn && (
                  <motion.div
                    key="your-turn-badge"
                    initial={{ opacity: 0, scale: 0.8, width: 0 }}
                    animate={{ opacity: 1, scale: 1, width: 'auto' }}
                    exit={{ opacity: 0, scale: 0.9, width: 0 }}
                    transition={{ duration: 0.3 }}
                    className="hidden sm:flex items-center gap-1.5 overflow-hidden"
                  >
                    <div className="flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-lg shrink-0" style={{ background: `${GREEN}15` }}>
                      <MousePointer2 className="w-3 h-3 shrink-0" style={{ color: GREEN }} />
                      <span className="hidden md:inline text-[10px] font-semibold whitespace-nowrap" style={{ color: GREEN }}>
                        Your turn
                      </span>
                    </div>
                    <div className="w-px h-5 bg-slate-200 shrink-0" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tool buttons */}
              {TOOLS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTool(t.id)}
                  className={`relative p-1.5 sm:p-2 md:p-2.5 rounded-lg sm:rounded-xl transition-all duration-200 ${
                    activeTool === t.id ? 'shadow-md' : 'hover:bg-slate-100'
                  }`}
                  style={activeTool === t.id ? { background: `${GREEN}18`, color: GREEN } : { color: '#64748b' }}
                  title={t.label}
                >
                  <t.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-[18px] md:h-[18px]" />
                  {activeTool === t.id && (
                    <motion.div
                      layoutId="hero-tool-indicator"
                      className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                      style={{ background: GREEN }}
                    />
                  )}
                </button>
              ))}

              <div className="w-px h-5 sm:h-6 bg-slate-200 mx-0.5 sm:mx-1" />

              {/* Color swatches — hidden on very small screens, show active color indicator on mobile */}
              <div className="hidden xs:contents sm:contents">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setActiveColor(c)}
                    className={`hidden sm:block w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full border-2 transition-all duration-200 ${
                      activeColor === c ? 'scale-110 border-slate-400 shadow-sm' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ background: c }}
                  />
                ))}
              </div>
              {/* Mobile: single active color indicator that cycles colors on tap */}
              <button
                onClick={() => {
                  const idx = COLORS.indexOf(activeColor);
                  setActiveColor(COLORS[(idx + 1) % COLORS.length]);
                }}
                className="sm:hidden w-5 h-5 rounded-full border-2 border-slate-300 shadow-sm transition-all duration-200"
                style={{ background: activeColor }}
                title="Cycle color"
              />

              <div className="w-px h-5 sm:h-6 bg-slate-200 mx-0.5 sm:mx-1" />

              <button
                onClick={handleUndo}
                disabled={annotations.length === 0}
                className="p-1.5 sm:p-2 md:p-2.5 rounded-lg sm:rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all disabled:opacity-30 disabled:pointer-events-none"
                title="Undo"
              >
                <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-[18px] md:h-[18px]" />
              </button>

              <button
                onClick={handleClear}
                disabled={annotations.length === 0}
                className="p-1.5 sm:p-2 md:p-2.5 rounded-lg sm:rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-30 disabled:pointer-events-none"
                title="Clear all"
              >
                <Eraser className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-[18px] md:h-[18px]" />
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Glow */}
      <div
        className="absolute -inset-4 sm:-inset-8 -z-10 rounded-3xl sm:rounded-[2rem] blur-3xl opacity-15"
        style={{ background: `linear-gradient(135deg, ${GREEN}, ${NAVY})` }}
      />
    </div>
  );
}