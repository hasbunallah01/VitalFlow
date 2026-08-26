'use client';

import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect } from 'react';
import { bandColor } from '@/lib/utils/format';

interface ScoreGaugeProps {
  score: number;
  band: string;
  size?: number;
  showLabel?: boolean;
}

/**
 * Score gauge v2 — a clean semicircular gauge with a thick teal-to-blue
 * arc that fills based on the score. The number is large and tabular,
 * the arc is the brand gradient, and there's a soft ambient glow
 * behind the gauge. The number animates from 0 to the target on mount.
 */
export function ScoreGauge({ score, band, size = 280, showLabel = true }: ScoreGaugeProps) {
  const stroke = 18;
  const radius = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2 + 14;
  const startAngle = 180;
  const endAngle = 360;
  const totalArc = endAngle - startAngle;
  const filledArc = (Math.max(0, Math.min(100, score)) / 100) * totalArc;

  const bgPath = describeArc(cx, cy, radius, startAngle, endAngle);
  const fillPath = describeArc(cx, cy, radius, startAngle, startAngle + filledArc);

  const colors = bandColor(band);
  const bandHex = bandHexColor(band);

  // Animated counter
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => latest.toFixed(0));
  useEffect(() => {
    const controls = animate(count, score, {
      duration: 1.1,
      ease: [0.4, 0, 0.2, 1],
    });
    return controls.stop;
  }, [count, score]);

  return (
    <div className="relative inline-flex flex-col items-center" style={{ width: size }}>
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 -z-10 h-3/4 w-3/4 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-50 blur-3xl animate-glow-breathe"
        style={{ background: `radial-gradient(circle, ${bandHex}33 0%, transparent 70%)` }}
      />

      <svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size * 0.65}`} className="overflow-visible">
        <defs>
          <linearGradient id="score-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#16B8A6" />
            <stop offset="55%" stopColor="#2F80ED" />
            <stop offset="100%" stopColor="#155EEF" />
          </linearGradient>
        </defs>
        <path
          d={bgPath}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <motion.path
          d={fillPath}
          fill="none"
          stroke="url(#score-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, ease: [0.4, 0, 0.2, 1] }}
          style={{ filter: 'drop-shadow(0 4px 12px rgba(47,128,237,0.35))' }}
        />
      </svg>

      <div className="-mt-16 text-center">
        <div className="flex items-baseline justify-center gap-1">
          <motion.span className="text-[64px] font-bold leading-none tracking-tight text-brand-navy">
            {rounded}
          </motion.span>
          <span className="text-h3 text-text-secondary">/ 100</span>
        </div>
        {showLabel ? (
          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 shadow-card">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: bandHex }}
            />
            <span className={`text-meta-sm font-semibold uppercase tracking-wider ${colors.text}`}>
              {band}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 180) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function bandHexColor(band: string): string {
  const b = (band ?? '').toLowerCase();
  if (b === 'strong') return '#16B8A6';
  if (b === 'healthy') return '#22C55E';
  if (b === 'watch') return '#F59E0B';
  if (b === 'fragile') return '#EA580C';
  if (b === 'critical') return '#DC2626';
  return '#94A3B8';
}
