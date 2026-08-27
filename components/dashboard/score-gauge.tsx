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
 * Score gauge — clean semicircular gauge with a brand-gradient arc.
 * Subtle, refined. No ambient glow halo (the new brief says no huge
 * glowing effects). Number animates from 0 to the target on mount.
 */
export function ScoreGauge({ score, band, size = 240, showLabel = true }: ScoreGaugeProps) {
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2 + 12;
  const startAngle = 180;
  const endAngle = 360;
  const totalArc = endAngle - startAngle;
  const filledArc = (Math.max(0, Math.min(100, score)) / 100) * totalArc;

  const bgPath = describeArc(cx, cy, radius, startAngle, endAngle);
  const fillPath = describeArc(cx, cy, radius, startAngle, startAngle + filledArc);

  const colors = bandColor(band);
  const bandHex = bandHexColor(band);

  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => latest.toFixed(0));
  useEffect(() => {
    const controls = animate(count, score, {
      duration: 0.9,
      ease: [0.4, 0, 0.2, 1],
    });
    return controls.stop;
  }, [count, score]);

  return (
    <div className="relative inline-flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size * 0.65}`}>
        <defs>
          <linearGradient id="score-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#48D8C2" />
            <stop offset="55%" stopColor="#20BFE8" />
            <stop offset="100%" stopColor="#1677E8" />
          </linearGradient>
        </defs>
        <path d={bgPath} fill="none" stroke="#E6ECF3" strokeWidth={stroke} strokeLinecap="round" />
        <motion.path
          d={fillPath}
          fill="none"
          stroke="url(#score-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
        />
      </svg>

      <div className="-mt-12 text-center">
        <div className="flex items-baseline justify-center gap-1">
          <motion.span className="text-score font-bold leading-none tracking-tight text-text-primary">
            {rounded}
          </motion.span>
          <span className="text-h3 text-text-muted">/ 100</span>
        </div>
        {showLabel ? (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-pill bg-card px-2.5 py-0.5 shadow-card">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: bandHex }} />
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
  if (b === 'strong') return '#18A875';
  if (b === 'healthy') return '#48D8C2';
  if (b === 'watch') return '#F4A62A';
  if (b === 'fragile') return '#F07A3F';
  if (b === 'critical') return '#E85C5C';
  return '#8A98AA';
}
