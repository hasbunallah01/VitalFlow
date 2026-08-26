/**
 * POST /api/funding-outreach/[id]/revoke
 *
 * Revoke a funding outreach at any state. Also revokes the share link
 * if one exists, so a lender's cached link stops working.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getOrCreateDevSession } from '@/lib/auth/dev';
import { revokeFundingOutreach } from '@/lib/db/persist-funding';

export const dynamic = 'force-dynamic';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getOrCreateDevSession();
  try {
    const current = await prisma.fundingOutreach.findFirst({
      where: { id, organizationId: session.organizationId },
    });
    if (!current) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (current.status === 'revoked') {
      return NextResponse.json({ ok: true, status: 'revoked', already: true });
    }
    await revokeFundingOutreach(prisma, id);
    return NextResponse.json({ ok: true, status: 'revoked' });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
