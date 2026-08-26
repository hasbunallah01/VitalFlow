/**
 * POST /api/funding-outreach/[id]/approve
 *
 * Human-in-the-loop gate. Transitions a drafted FundingOutreach to
 * 'approved'. Idempotent: re-approving an already-approved outreach
 * is a no-op. Same response shape as GET /[id] for the UI to refresh.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getOrCreateDevSession } from '@/lib/auth/dev';
import { approveFundingOutreach } from '@/lib/db/persist-funding';

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
    if (current.status === 'approved') {
      // Idempotent: already approved, return current state.
      return NextResponse.json({ ok: true, status: 'approved', already: true });
    }
    if (current.status !== 'drafted') {
      return NextResponse.json(
        { error: `Cannot approve: status is "${current.status}", expected "drafted"` },
        { status: 409 },
      );
    }
    await approveFundingOutreach(prisma, {
      outreachId: id,
      approverUserId: session.userId,
    });
    return NextResponse.json({ ok: true, status: 'approved' });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
