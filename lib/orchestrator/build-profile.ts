/**
 * Build a BusinessProfile for the Funding Outreach Agent from DB state.
 *
 * The `BusinessProfile` shape is what `evaluatePrograms(assessment, profile)`
 * expects. The orchestrator derives each field from real DB data —
 * no hardcoded values, no defaults that mask missing data.
 *
 * Source of truth:
 *   - country             ← Organization.country (ISO alpha-2)
 *   - sector              ← Organization.sector (validated against the
 *                           Sector union; invalid sectors default to
 *                           'services' so eligibility still evaluates)
 *   - monthsInOperation   ← earliest Statement.periodStart in this org,
 *                           measured in calendar months to "now"
 *   - annualRevenue        ← sum of monthly inflow × (12 / monthsAnalyzed),
 *                           i.e. annualised from the latest analysis
 *   - currency             ← Organization.defaultCurrency
 *
 * If the org has no statements yet, we cannot derive monthsInOperation
 * or annualRevenue — we throw, because funding eligibility against
 * the hardcoded programs genuinely needs both.
 */

import type { PrismaClient } from '@prisma/client';
import type { BusinessProfile } from '../../agents/funding-outreach/rules';
import { ALL_SECTORS, type Sector, type Country } from '../funding/programs';
import { toMajorNumber } from '../analysis/money';
import { reconstructHealthAssessment } from './build-assessment';

type Db = PrismaClient;

const VALID_COUNTRIES: ReadonlyArray<string> = [
  'JM', 'BB', 'TT', 'GD', 'LC', 'VC', 'AG', 'DM', 'KN', 'BS',
  'GY', 'BZ', 'HT', 'TC', 'BB_BVI', 'SX', 'CW',
];

function asCountry(s: string | null | undefined): Country | null {
  if (!s) return null;
  if (VALID_COUNTRIES.includes(s)) return s as Country;
  return null;
}

function asSector(s: string | null | undefined): Sector {
  if (!s) return 'services';
  if ((ALL_SECTORS as ReadonlyArray<string>).includes(s)) {
    return s as Sector;
  }
  // The Organization.sector is a free String. The Caribbean program
  // catalog only recognises the 12 values in the Sector union. A real
  // MSME with an unrecognised sector still gets evaluated — we map
  // unknown sectors to 'services' (broadest match across all 7
  // programs). The frontend can show the original sector text from
  // Organization.sector independently.
  return 'services';
}

function monthsBetween(from: Date, to: Date): number {
  const years = to.getFullYear() - from.getFullYear();
  const months = to.getMonth() - from.getMonth();
  const dayAdjust = to.getDate() < from.getDate() ? -1 : 0;
  return years * 12 + months + dayAdjust;
}

export class ProfileUnavailableError extends Error {
  constructor(reason: string) {
    super(`Cannot build BusinessProfile: ${reason}`);
    this.name = 'ProfileUnavailableError';
  }
}

/**
 * Build the BusinessProfile. Requires the org to have at least one
 * completed analysis (so we can derive monthsInOperation and
 * annualRevenue). Throws ProfileUnavailableError otherwise.
 */
export async function buildBusinessProfile(
  db: Db,
  organizationId: string,
): Promise<BusinessProfile> {
  const org = await db.organization.findUnique({ where: { id: organizationId } });
  if (!org) throw new ProfileUnavailableError('organization not found');

  const country = asCountry(org.country);
  if (!country) {
    throw new ProfileUnavailableError(
      `organization.country "${org.country}" is not a recognised Caribbean country code`,
    );
  }
  const sector = asSector(org.sector);

  // Find the earliest statement to derive monthsInOperation.
  const earliest = await db.statement.findFirst({
    where: { organizationId },
    orderBy: { periodStart: 'asc' },
  });
  if (!earliest?.periodStart) {
    throw new ProfileUnavailableError('organization has no statements with a periodStart');
  }
  const monthsInOperation = Math.max(1, monthsBetween(earliest.periodStart, new Date()));

  // Find the latest completed analysis to derive annualRevenue.
  const latest = await db.analysis.findFirst({
    where: { organizationId, status: 'completed' },
    orderBy: { completedAt: 'desc' },
  });
  if (!latest) {
    throw new ProfileUnavailableError('organization has no completed analysis');
  }
  // Reconstruct the assessment (so we get the same monthly aggregates
  // the score pipeline produced) and annualise the inflow.
  const reconstructed = await reconstructHealthAssessment(db, latest.id, organizationId);
  if (!reconstructed) {
    throw new ProfileUnavailableError('cannot reconstruct latest assessment');
  }
  const { assessment } = reconstructed;
  if (assessment.monthly.length === 0) {
    throw new ProfileUnavailableError('latest assessment has no monthly data');
  }
  const totalInflowMinor = assessment.monthly.reduce(
    (s, m) => s + toMajorNumber(m.inflow),
    0,
  );
  // Annualise: if we have 12 months, this is the year's inflow; if 6,
  // it's half a year, so multiply by 12/6 = 2. If 1, multiply by 12.
  const annualRevenueMajor = totalInflowMinor * (12 / assessment.monthly.length);

  return {
    country,
    sector,
    monthsInOperation,
    annualRevenue: {
      amount: Math.round(annualRevenueMajor),
      currency: org.defaultCurrency,
    },
  };
}
