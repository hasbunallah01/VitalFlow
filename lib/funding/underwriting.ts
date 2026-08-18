/**
 * Lender-facing underwriting API.
 *
 * This is what a lender's portal would call to retrieve a business's
 * evidence pack using only the share token. In production, this would
 * sit behind lender auth (the org's lender id must match a pre-shared
 * key). For the MVP we accept the token alone; the demo mock lender
 * dashboard uses it directly.
 *
 * Returns the evidence pack (built by buildEvidencePack) if and only
 * if the link is valid, unrevoked, and unexpired. Otherwise throws.
 */

import type { PrismaClient } from '@prisma/client';

type Db = PrismaClient;

export class ShareLinkInvalidError extends Error {
  constructor(reason: 'not_found' | 'revoked' | 'expired') {
    super(`Share link ${reason}`);
    this.name = 'ShareLinkInvalidError';
  }
}

export interface UnderwritingResponse {
  outreach: {
    id: string;
    status: string;
    organizationId: string;
    analysisId: string;
    plan: unknown;
    evidencePack: unknown;
    approvedAt: Date | null;
    firstViewedAt: Date | null;
    viewCount: number;
    lastViewedAt: Date | null;
  };
  shareLink: {
    token: string;
    expiresAt: Date;
    accessCount: number;
  };
  /** Convenience: when does this token expire (ISO string). */
  expiresAt: string;
}

export async function getUnderwritingProfile(
  db: Db,
  token: string,
): Promise<UnderwritingResponse> {
  const link = await db.shareLink.findUnique({ where: { token } });
  if (!link) throw new ShareLinkInvalidError('not_found');
  if (link.revokedAt) throw new ShareLinkInvalidError('revoked');
  if (link.expiresAt < new Date()) throw new ShareLinkInvalidError('expired');

  const outreach = await db.fundingOutreach.findFirst({
    where: { shareLinkId: link.id },
  });
  if (!outreach) {
    throw new Error('ShareLink has no associated outreach');
  }

  return {
    outreach: {
      id: outreach.id,
      status: outreach.status,
      organizationId: outreach.organizationId,
      analysisId: outreach.analysisId,
      plan: outreach.plan,
      evidencePack: outreach.evidencePack,
      approvedAt: outreach.approvedAt,
      firstViewedAt: outreach.firstViewedAt,
      viewCount: outreach.viewCount,
      lastViewedAt: outreach.lastViewedAt,
    },
    shareLink: {
      token: link.token,
      expiresAt: link.expiresAt,
      accessCount: link.accessCount,
    },
    expiresAt: link.expiresAt.toISOString(),
  };
}
