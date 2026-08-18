/**
 * Caribbean funding programs — hardcoded.
 *
 * Why hardcoded: for the MVP, the agent's eligibility engine evaluates a
 * fixed list of real Caribbean funding programs against the business's
 * analysis. Each program carries its real rules (revenue caps, sectors,
 * collateral requirements, geography). At demo time, we judge by the
 * realism of the match, not the freshness of the list.
 *
 * Sourcing: see the public program pages referenced per program. If the
 * real program's rules change in the wild, this file becomes stale.
 * That is the cost of avoiding a per-program integration for the demo.
 *
 * Money convention: limits in MAJOR UNITS of the program's currency.
 * e.g. { maxAmountMinor: '30_000_000n', currency: 'JMD' } for J$30M.
 */

import type { CurrencyCode } from '../../types/money';

export type Sector =
  | 'agriculture'
  | 'agro_processing'
  | 'manufacturing'
  | 'tourism'
  | 'ict'
  | 'creative_industries'
  | 'health'
  | 'energy'
  | 'infrastructure'
  | 'services'
  | 'retail_distribution'
  | 'mining';

export const ALL_SECTORS: ReadonlyArray<Sector> = [
  'agriculture', 'agro_processing', 'manufacturing', 'tourism', 'ict',
  'creative_industries', 'health', 'energy', 'infrastructure', 'services',
  'retail_distribution', 'mining',
];

export type Country =
  | 'JM'  // Jamaica
  | 'BB'  // Barbados
  | 'TT'  // Trinidad and Tobago
  | 'GD'  // Grenada
  | 'LC'  // Saint Lucia
  | 'VC'  // Saint Vincent
  | 'AG'  // Antigua and Barbuda
  | 'DM'  // Dominica
  | 'KN'  // Saint Kitts and Nevis
  | 'BS'  // Bahamas
  | 'GY'  // Guyana
  | 'BZ'  // Belize
  | 'HT'  // Haiti
  | 'TC'  // Turks and Caicos
  | 'BB_BVI'  // British Virgin Islands
  | 'SX'  // Sint Maarten
  | 'CW'  // CuraçaOECS';

export type CaribbeanRegion = 'OECS' | 'CARICOM' | 'CARIBBEAN';

export interface FundingProgram {
  /** Stable id, used in DB and URLs. Lowercase kebab. */
  readonly id: string;
  /** Display name. */
  readonly name: string;
  /** Issuing institution. */
  readonly institution: string;
  /** Country(ies) where this program is available. */
  readonly countries: ReadonlyArray<Country>;
  /** Optional region scope (broader than country). */
  readonly region?: CaribbeanRegion;
  /** Sectors the program funds. */
  readonly sectors: ReadonlyArray<Sector>;
  /**
   * Maximum annual revenue (in program's currency) for eligibility.
   * null = no cap. A business with revenue above this is NOT eligible.
   */
  readonly maxAnnualRevenue?: { amount: number; currency: CurrencyCode } | null;
  /**
   * Maximum amount the program will lend/grant per applicant.
   */
  readonly maxLoanAmount: { amount: number; currency: CurrencyCode };
  /** Typical interest rate as a percentage. null = grant. */
  readonly interestRatePercent: { min: number; max: number } | null;
  /** Repayment term in months. */
  readonly termMonths: { min: number; max: number };
  /** Whether collateral is required. */
  readonly collateralRequired: boolean;
  /** Whether the program requires the business to be in operation for at least N months. */
  readonly minMonthsInOperation: number;
  /** Whether the program is for hurricane/disaster recovery specifically. */
  readonly disasterRecovery?: { event: string; programYear: string };
  /** One-paragraph description. LLM is allowed to paraphrase this. */
  readonly description: string;
  /** Source URL where the program is documented. */
  readonly sourceUrl: string;
  /**
   * Required pillar score thresholds. A business must have at least this
   * score in each listed pillar. The defaults below are conservative;
   * the rules engine checks both these AND the program-specific rules.
   */
  readonly minimumScores: {
    cashflow: number;  // 0-25
    revenue: number;   // 0-25
    expenses: number;  // 0-20
    liquidity: number; // 0-20
    risk: number;      // 0-10
  };
}

// ---------------------------------------------------------------------------
// Hardcoded programs
// ---------------------------------------------------------------------------

/**
 * Jamaica DBJ ORBIT — collateral-free up to J$30M for manufacturing,
 * agro-processing, health, and creative industries. Source:
 * https://jis.gov.jm/dbj-unveils-2b-orbit-loan-facility-to-boost-msmes-in-key-growth-sectors/
 */
const DBJ_ORBIT: FundingProgram = {
  id: 'dbj-orbit',
  name: 'DBJ ORBIT Loan Facility',
  institution: 'Development Bank of Jamaica (DBJ)',
  countries: ['JM'],
  sectors: ['manufacturing', 'agro_processing', 'health', 'creative_industries'],
  maxAnnualRevenue: { amount: 425_000_000, currency: 'JMD' }, // J$425M MSME cap
  maxLoanAmount: { amount: 30_000_000, currency: 'JMD' },
  interestRatePercent: { min: 8.0, max: 8.0 },
  termMonths: { min: 12, max: 120 }, // up to 10 years
  collateralRequired: false, // backed by DBJ's Credit Enhancement Fund
  minMonthsInOperation: 12,
  description: 'Collateral-free financing for Jamaican MSMEs in manufacturing, agro-processing, health, and creative industries. Up to J$30 million at 8% interest over 10 years. Backed by DBJ\'s Credit Enhancement Fund. At least 60% of the loan must be used for equipment or machinery.',
  sourceUrl: 'https://jis.gov.jm/dbj-unveils-2b-orbit-loan-facility-to-boost-msmes-in-key-growth-sectors/',
  minimumScores: {
    cashflow: 12, revenue: 10, expenses: 10, liquidity: 8, risk: 5,
  },
};

/**
 * Jamaica DBJ AFI (Approved Financial Institutions) — general MSME
 * financing for productive sectors. Source: https://dbankjm.com
 */
const DBJ_AFI: FundingProgram = {
  id: 'dbj-afi',
  name: 'DBJ Approved Financial Institutions Loan',
  institution: 'Development Bank of Jamaica (DBJ)',
  countries: ['JM'],
  sectors: ['agriculture', 'agro_processing', 'manufacturing', 'mining', 'ict', 'infrastructure', 'services', 'tourism', 'retail_distribution', 'energy'],
  maxAnnualRevenue: { amount: 425_000_000, currency: 'JMD' },
  maxLoanAmount: { amount: 50_000_000, currency: 'JMD' }, // typical SME cap
  interestRatePercent: { min: 9.5, max: 10.0 },
  termMonths: { min: 12, max: 120 },
  collateralRequired: true,
  minMonthsInOperation: 12,
  description: 'Working capital and equipment financing for Jamaican MSMEs in productive sectors, channelled through DBJ-approved banks (JN, JMMB, NCB, First Global Bank). Up to 90% of project cost. Requires tax compliance (TCC) and demonstrated financial viability.',
  sourceUrl: 'https://dbankjm.com/services/direct-loans/',
  minimumScores: {
    cashflow: 10, revenue: 10, expenses: 8, liquidity: 6, risk: 4,
  },
};

/**
 * Jamaica DBJ M5 — Hurricane Melissa recovery, launching 2026/27.
 * Source: https://jis.gov.jm/dbj-to-launch-m5-business-recovery-programme-in-2026-2027/
 */
const DBJ_M5: FundingProgram = {
  id: 'dbj-m5',
  name: 'DBJ M5 Business Recovery Programme',
  institution: 'Development Bank of Jamaica (DBJ)',
  countries: ['JM'],
  sectors: ['agriculture', 'manufacturing', 'tourism', 'health'],
  maxAnnualRevenue: { amount: 425_000_000, currency: 'JMD' },
  maxLoanAmount: { amount: 5_000_000, currency: 'JMD' },
  interestRatePercent: { min: 2.0, max: 5.0 }, // concessional
  termMonths: { min: 24, max: 84 },
  collateralRequired: false, // grants + concessional loans
  minMonthsInOperation: 6,
  disasterRecovery: { event: 'Hurricane Melissa', programYear: '2026/27' },
  description: 'Hurricane Melissa recovery programme. Grants, concessional loans, and blended financing through Approved Financial Institutions. Targeted at agriculture, manufacturing, tourism, and health. Caribbean-specific post-disaster resilience.',
  sourceUrl: 'https://jis.gov.jm/dbj-to-launch-m5-business-recovery-programme-in-2026-2027/',
  minimumScores: {
    cashflow: 6, revenue: 6, expenses: 4, liquidity: 4, risk: 2,
  }, // intentionally low for disaster recovery
};

/**
 * CDB PROPEL — Caribbean Development Bank MSME technical assistance.
 * Source: https://www.caribank.org/newsroom/news-and-events/caribbean-development-bank-launches-cdb-propel-transform-msme-support-across-caribbean
 */
const CDB_PROPEL: FundingProgram = {
  id: 'cdb-propel',
  name: 'CDB PROPEL Technical Assistance',
  institution: 'Caribbean Development Bank (CDB)',
  countries: ['AG', 'BB', 'DM', 'GD', 'GY', 'HT', 'JM', 'KN', 'LC', 'TT', 'VC'],
  region: 'CARICOM',
  sectors: ALL_SECTORS, // all productive sectors
  maxAnnualRevenue: null, // no cap (TA-focused)
  maxLoanAmount: { amount: 250_000, currency: 'USD' }, // typical TA grant
  interestRatePercent: null, // grant, not loan
  termMonths: { min: 1, max: 36 },
  collateralRequired: false,
  minMonthsInOperation: 0,
  description: 'CDB\'s Special Development Fund (SDF 11) cycle — US$5 million allocated for MSME technical assistance 2025-2028. Helps Caribbean MSMEs access business development services, capacity building, and market access support.',
  sourceUrl: 'https://www.caribank.org/newsroom/news-and-events/caribbean-development-bank-launches-cdb-propel-transform-msme-support-across-caribbean',
  minimumScores: {
    cashflow: 0, revenue: 0, expenses: 0, liquidity: 0, risk: 0, // TA has no score requirement
  },
};

/**
 * CDB / DFL T&T Line of Credit — Trinidad and Tobago SME financing.
 * Source: https://www.caribank.org/newsroom/news-and-events/caribbean-development-bank-approves-us10-million-line-credit-support-smes-trinidad-and-tobago
 */
const CDB_TT_DFL: FundingProgram = {
  id: 'cdb-tt-dfl',
  name: 'CDB Line of Credit to Development Finance Limited (T&T)',
  institution: 'Caribbean Development Bank (CDB) / Development Finance Limited',
  countries: ['TT'],
  sectors: ['agriculture', 'manufacturing', 'tourism', 'energy'],
  maxAnnualRevenue: null,
  maxLoanAmount: { amount: 500_000, currency: 'USD' },
  interestRatePercent: { min: 6.0, max: 9.0 },
  termMonths: { min: 12, max: 84 },
  collateralRequired: true,
  minMonthsInOperation: 12,
  description: 'US$10 million CDB line of credit on-lent by Development Finance Limited to Trinidad & Tobago SMEs in agriculture, manufacturing, tourism, and energy efficiency. Especially benefits women-owned businesses and green/sustainable initiatives.',
  sourceUrl: 'https://www.caribank.org/newsroom/news-and-events/caribbean-development-bank-approves-us10-million-line-credit-support-smes-trinidad-and-tobago',
  minimumScores: {
    cashflow: 10, revenue: 8, expenses: 8, liquidity: 6, risk: 4,
  },
};

/**
 * IDB Invest via IPED Guyana — Micro and small enterprise financing.
 * Source: https://idbinvest.org/en/news-media/idb-invest-and-iped-partner-expand-access-financing-micro-and-small-businesses-guyana
 */
const IDB_INVEST_IPED_GY: FundingProgram = {
  id: 'idb-invest-iped-gy',
  name: 'IDB Invest / IPED Micro-Finance (Guyana)',
  institution: 'IDB Invest / Institute of Private Enterprise Development',
  countries: ['GY'],
  sectors: ALL_SECTORS,
  maxAnnualRevenue: { amount: 1_000_000, currency: 'USD' }, // MSE definition
  maxLoanAmount: { amount: 50_000, currency: 'USD' },
  interestRatePercent: { min: 8.0, max: 14.0 },
  termMonths: { min: 6, max: 60 },
  collateralRequired: false, // character-based lending common for micro
  minMonthsInOperation: 6,
  description: 'IDB Invest + JICA TADAC Fund providing $5M total to IPED for on-lending to micro and small enterprises in Guyana. Focus on women, youth, and rural entrepreneurs. Includes technical assistance for market study and sustainability.',
  sourceUrl: 'https://idbinvest.org/en/news-media/idb-invest-and-iped-partner-expand-access-financing-micro-and-small-businesses-guyana',
  minimumScores: {
    cashflow: 6, revenue: 6, expenses: 4, liquidity: 4, risk: 3,
  },
};

/**
 * CDB Saint Lucia MSME Loan-Grant Facility — example of country-specific.
 * Source: https://www.caribank.org/newsroom/news-and-events/cdb-strengthening-saint-lucias-private-sector-support-msmes
 */
const CDB_LC_MSME: FundingProgram = {
  id: 'cdb-lc-msme',
  name: 'CDB Saint Lucia MSME Loan-Grant Facility',
  institution: 'Caribbean Development Bank (CDB) / Government of Saint Lucia',
  countries: ['LC'],
  region: 'OECS',
  sectors: ALL_SECTORS,
  maxAnnualRevenue: { amount: 500_000, currency: 'USD' },
  maxLoanAmount: { amount: 100_000, currency: 'USD' },
  interestRatePercent: { min: 3.0, max: 6.0 },
  termMonths: { min: 24, max: 96 },
  collateralRequired: false, // explicitly for those unable to meet traditional collateral
  minMonthsInOperation: 12,
  description: 'Blended loan-grant facility for Saint Lucian entrepreneurs and OECS businesses that cannot meet traditional collateral or lending requirements. Government of Saint Lucia partners with CDB to provide concessional financing plus grant components.',
  sourceUrl: 'https://www.caribank.org/newsroom/news-and-events/cdb-strengthening-saint-lucias-private-sector-support-msmes',
  minimumScores: {
    cashflow: 8, revenue: 6, expenses: 6, liquidity: 4, risk: 3,
  },
};

// ---------------------------------------------------------------------------
// The catalog — add to this list to add new programs
// ---------------------------------------------------------------------------

export const FUNDING_PROGRAMS: ReadonlyArray<FundingProgram> = [
  DBJ_ORBIT,
  DBJ_AFI,
  DBJ_M5,
  CDB_PROPEL,
  CDB_TT_DFL,
  IDB_INVEST_IPED_GY,
  CDB_LC_MSME,
];

export function getProgramById(id: string): FundingProgram | undefined {
  return FUNDING_PROGRAMS.find((p) => p.id === id);
}

export function programsForCountry(country: Country): ReadonlyArray<FundingProgram> {
  return FUNDING_PROGRAMS.filter((p) => p.countries.includes(country));
}
