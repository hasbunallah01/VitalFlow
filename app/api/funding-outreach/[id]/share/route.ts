/**
 * POST /api/funding-outreach/[id]/share
 *
 * Create a ShareLink for an approved outreach and link it to the row.
 * Returns the public lender URL that the owner can copy / share.
 *
 * State machine: must be 'approved' (the human gate is required before
 * a real share link is issued). 'drafted' → 409. 'shared' is idempotent
 * — we just return the existing link.
 */

import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { prisma } from '@/lib/db/client';
import { getOrCreateDevSession } from '@/lib/auth/dev';

export const dynamic = 'force-dynamic';

const DEFAULT_TTL_DAYS = 14;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getOrCreateDevSession();
  try {
    const outreach = await prisma.fundingOutreach.findFirst({
      where: { id, organizationId: session.organizationId },
      include: { analysis: { select: { id: true } } },
    });
    if (!outreach) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (outreach.status === 'drafted') {
      return NextResponse.json(
        { error: 'Approve the outreach before sharing.' },
        { status: 409 },
      );
    }
    if (outreach.shareLinkId) {
      const existing = await prisma.shareLink.findUnique({ where: { id: outreach.shareLinkId } });
      if (existing && !existing.revokedAt) {
        return NextResponse.json({
          ok: true,
          shareLink: {
            id: existing.id,
            token: existing.token,
            url: publicUrl(existing.token),
            expiresAt: existing.expiresAt,
            accessCount: existing.accessCount,
          },
        });
      }
    }
    // Create a fresh Report + ShareLink for the lender view. The
    // share link tokens are 24 random bytes, base64url encoded.
    const report = await prisma.report.create({
      data: {
        analysisId: outreach.analysis.id,
        pdfRef: `dev-share/${id}`,
        model: { source: 'funding-outreach', outreachId: id } as object,
        pages: 1,
        disclaimerVersion: 'funding-outreach@1',
      },
    });
    const token = randomBytes(24).toString('base64url');
    const expiresAt = new Date(Date.now() + DEFAULT_TTL_DAYS * 24 * 60 * 60 * 1000);
    const link = await prisma.shareLink.create({
      data: {
        reportId: report.id,
        token,
        expiresAt,
      },
    });
    await prisma.fundingOutreach.update({
      where: { id },
      data: { status: 'shared', shareLinkId: link.id },
    });
    return NextResponse.json({
      ok: true,
      shareLink: {
        id: link.id,
        token: link.token,
        url: publicUrl(link.token),
        expiresAt: link.expiresAt,
        accessCount: 0,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

function publicUrl(token: string): string {
  // In production this would be the real lender-facing page. We don't
  // have a /lender/[token] route yet, so we return the public origin +
  // token. The UI surfaces this as a copy-able URL.
  return `/lender/${token}`;
}
