'use client';

import { motion } from 'framer-motion';
import { bandColor } from '@/lib/utils/format';

interface ScoreGaugeProps {
  score: number;
  band: string;
  size?: number;
  showLabel?: boolean;
}

/**
 * Score gauge — a clean semicircular gauge with a thick teal-to-blue
 * arc that fills based on the score. Number is large and tabular.
 */
export function ScoreGauge({ score, band, size = 200, showLabel = true }: ScoreGaugeProps) {
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2 + 10;
  const startAngle = 180;
  const endAngle = 360;
  const totalArc = endAngle - startAngle;
  const filledArc = (Math.max(0, Math.min(100, score)) / 100) * totalArc;

  // Path for the full background arc (light gray)
  const bgPath = describeArc(cx, cy, radius, startAngle, endAngle);
  // Path for the filled portion
  const fillPath = describeArc(cx, cy, radius, startAngle, startAngle + filledArc);

  const colors = bandColor(band);

  return (
    <div className="relative inline-flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size * 0.65}`}>
        <defs>
          <linearGradient id="score-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#16B8A6" />
            <stop offset="100%" stopColor="#155EEF" />
          </linearGradient>
        </defs>
        <path d={bgPath} fill="none" stroke="#E2E8F0" strokeWidth={stroke} strokeLinecap="round" />
        <motion.path
          d={fillPath}
          fill="none"
          stroke="url(#score-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </svg>
      <div className="-mt-12 text-center">
        <div className="text-number-lg font-bold text-brand-navy tabular-nums">
          {Math.round(score)}
        </div>
        {showLabel ? (
          <div className="mt-1 flex items-center justify-center gap-1.5">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${colors.bg} ring-1 ${colors.ring}`} style={{ backgroundColor: 'currentColor' }} />
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
