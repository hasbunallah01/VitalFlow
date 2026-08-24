/**
 * Funding readiness gap.
 *
 * Given the deterministic eligibility outcome (eligible + almost
 * + evaluated arrays from `evaluatePrograms`), and the assessment's
 * pillar scores, this module quantifies "how close" a business is
 * to qualifying for each program they don't yet qualify for.
 *
 * The output is an array of `FundingReadinessEntry` per program. Each
 * entry says: which pillar(s) are short, by how many points, and the
 * estimated time-to-eligibility (rough heuristic based on the
 * shortfall magnitude and the per-month score sensitivity).
 *
 * A "blocker" rule (e.g. "Program is not available in AG") is reported
 * separately as `blockerReason` — these cannot be resolved by
 * improving the score, only by relocating or registering in a
 * different country.
 */

import type { HealthAssessment } from '../../types/analysis';
import type { FundingProgram } from '../funding/programs';
import type { EvaluationOutcome, EligibilityResult } from '../../agents/funding-outreach/rules';

export type PillarId = 'cashflow' | 'revenue' | 'expenses' | 'liquidity' | 'risk';

export interface PillarGap {
  pillar: PillarId;
  /** Current 0-100 normalised score for this pillar. */
  currentScore: number;
  /** Program's minimum 0-100 normalised score for this pillar. */
  requiredScore: number;
  /** required - current. 0 if already meets the threshold. */
  gap: number;
}

export interface FundingReadinessEntry {
  programId: string;
  programName: string;
  institution: string;
  /** True if the program is currently eligible. */
  eligible: boolean;
  /** "1 step away", "2 steps away", "reachable in ~N months", or "blocked". */
  status: 'eligible' | 'almost' | 'gap_small' | 'gap_medium' | 'gap_large' | 'blocked';
  /** Pillar-level gap (sums to the total point gap for this program). */
  pillarGaps: PillarGap[];
  /** Sum of pillarGaps.gap. */
  totalPointsShort: number;
  /** Non-pillar rule that cannot be improved by Amara (e.g. geography). */
  blockerReason: string | null;
  /** Free-form advice string the LLM produced (already on the draft). */
  advice: string | null;
  /** Estimated months to eligibility, rough heuristic. */
  estimatedMonthsToEligibility: number | null;
}

const PILLAR_ORDER: ReadonlyArray<PillarId> = ['cashflow', 'revenue', 'expenses', 'liquidity', 'risk'];

/**
 * Detect non-pillar rules. These are blockers — no amount of score
 * improvement will make Amara eligible.
 */
function blockerReason(ruleMissed: ReadonlyArray<string>): string | null {
  for (const r of ruleMissed) {
    if (/not available in/i.test(r)) return r;
    if (/not funded by this program/i.test(r)) return r;
    if (/currency .* cannot be compared/i.test(r)) return r;
  }
  return null;
}

/**
 * Per-pillar gap, derived from the `EligibilityResult.pillarScores`
 * (0-100 normalised) and the program's `minimumScores` (also 0-100
 * normalised). For ineligible programs, the gap is the sum of
 * shortfall on each pillar the business is under the minimum on.
 */
function pillarGaps(result: EligibilityResult): PillarGap[] {
  const ps = result.pillarScores;
  const min = result.program.minimumScores;
  const gaps: PillarGap[] = [];
  for (const pillar of PILLAR_ORDER) {
    // minimumScores values are 0..maxPoints (e.g. cashflow 0..25). The
    // pillarScores in the result are 0..100 (normalised). Normalise the
    // minimum by multiplying by (100 / max) for the pillar.
    // Pillar max points from types/analysis PILLAR_MAX:
    const maxPoints: Record<PillarId, number> = {
      cashflow: 25, revenue: 25, expenses: 20, liquidity: 20, risk: 10,
    };
    const requiredNorm = (min[pillar] / maxPoints[pillar]) * 100;
    const currentNorm = ps[pillar];
    const gap = Math.max(0, requiredNorm - currentNorm);
    if (requiredNorm > 0) {
      gaps.push({
        pillar,
        currentScore: Math.round(currentNorm * 10) / 10,
        requiredScore: Math.round(requiredNorm * 10) / 10,
        gap: Math.round(gap * 10) / 10,
      });
    }
  }
  return gaps;
}

function statusFor(totalGap: number, blocker: string | null): FundingReadinessEntry['status'] {
  if (blocker) return 'blocked';
  if (totalGap <= 0) return 'eligible';
  if (totalGap < 5) return 'almost';
  if (totalGap < 15) return 'gap_small';
  if (totalGap < 30) return 'gap_medium';
  return 'gap_large';
}

/**
 * Rough heuristic: a 1-point score improvement takes ~1 month of
 * consistent behaviour. A 30-point gap is ~30 months. But we cap at
 * 24 months and floor at 1 month.
 */
function estimatedMonths(totalGap: number): number | null {
  if (totalGap <= 0) return 0;
  return Math.min(24, Math.max(1, Math.round(totalGap)));
}

export interface BuildFundingReadinessInput {
  outcome: EvaluationOutcome;
  assessment: HealthAssessment;
  /**
   * The LLM-generated advice strings for the almost tier, keyed by
   * programId. Optional — the deterministic fields still work without
   * it.
   */
  almostAdvice?: Map<string, string>;
}

/**
 * Build the readiness array. One entry per program (eligible + almost
 * + remaining), suitable for the Funding tab UI.
 */
export function buildFundingReadiness(input: BuildFundingReadinessInput): FundingReadinessEntry[] {
  const { outcome, assessment } = input;
  const out: FundingReadinessEntry[] = [];

  // Eligible programs: no gap, no advice needed.
  for (const r of outcome.eligible) {
    out.push({
      programId: r.program.id,
      programName: r.program.name,
      institution: r.program.institution,
      eligible: true,
      status: 'eligible',
      pillarGaps: pillarGaps(r),
      totalPointsShort: 0,
      blockerReason: null,
      advice: null,
      estimatedMonthsToEligibility: 0,
    });
  }

  // Almost tier: 1-2 rule misses. Could be blockers or improvable.
  for (const r of outcome.almost) {
    const blocker = blockerReason(r.ruleMissed);
    const gaps = pillarGaps(r);
    const totalGap = gaps.reduce((s, g) => s + g.gap, 0);
    out.push({
      programId: r.program.id,
      programName: r.program.name,
      institution: r.program.institution,
      eligible: false,
      status: statusFor(totalGap, blocker),
      pillarGaps: gaps,
      totalPointsShort: Math.round(totalGap * 10) / 10,
      blockerReason: blocker,
      advice: input.almostAdvice?.get(r.program.id) ?? null,
      estimatedMonthsToEligibility: blocker ? null : estimatedMonths(totalGap),
    });
  }

  // Beyond-almost: more than 2 rule misses. Still surface the
  // blockers and the gap so the UI can say "X points away" even if
  // the path is long.
  const almostAndEligibleIds = new Set<string>([
    ...outcome.eligible.map((r) => r.program.id),
    ...outcome.almost.map((r) => r.program.id),
  ]);
  for (const r of outcome.evaluated) {
    if (almostAndEligibleIds.has(r.program.id)) continue;
    if (r.eligible) continue;
    const blocker = blockerReason(r.ruleMissed);
    const gaps = pillarGaps(r);
    const totalGap = gaps.reduce((s, g) => s + g.gap, 0);
    out.push({
      programId: r.program.id,
      programName: r.program.name,
      institution: r.program.institution,
      eligible: false,
      status: statusFor(totalGap, blocker),
      pillarGaps: gaps,
      totalPointsShort: Math.round(totalGap * 10) / 10,
      blockerReason: blocker,
      advice: null,
      estimatedMonthsToEligibility: blocker ? null : estimatedMonths(totalGap),
    });
  }

  // Sort: eligible first (by fit score, descending), then by totalGap
  // ascending (closest first), then blocked last.
  out.sort((a, b) => {
    if (a.eligible && !b.eligible) return -1;
    if (!a.eligible && b.eligible) return 1;
    if (a.blockerReason && !b.blockerReason) return 1;
    if (!a.blockerReason && b.blockerReason) return -1;
    return a.totalPointsShort - b.totalPointsShort;
  });

  return out;
}
