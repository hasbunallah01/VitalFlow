'use client';

import { useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { bandTokens } from '@/lib/utils/format';

interface ScoreRingProps {
  score: number;
  band: string;
  size?: number;
}

/**
 * Full-circle score ring with brand gradient arc. Number animates
 * from 0 on mount. Calm, refined — no glow, no extra halo.
 */
export function ScoreRing({ score, band, size = 200 }: ScoreRingProps) {
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.max(0, Math.min(100, score)) / 100) * circumference;

  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => latest.toFixed(1));
  useEffect(() => {
    const controls = animate(count, score, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
    });
    return controls.stop;
  }, [count, score]);

  const tokens = bandTokens(band);
  const gradientId = `score-grad-${Math.round(score)}-${band}`;

  return (
    <div className="relative inline-flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#20C4E8" />
            <stop offset="100%" stopColor="#1268E8" />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#E6EAF0"
          strokeWidth={stroke}
        />
        {/* Filled */}
        <motion.circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - filled }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span className="text-num-lg font-bold leading-none tracking-tight text-text-primary">
          {rounded}
        </motion.span>
        <span className="mt-1 text-label-sm text-text-muted">/ 100</span>
      </div>
    </div>
  );
}
