/**
 * GET /api/dev/session
 *
 * Returns the dev-user session (id, orgId, orgName). Created on first
 * call. No auth in this milestone.
 */

import { NextResponse } from 'next/server';
import { getOrCreateDevSession } from '@/lib/auth/dev';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getOrCreateDevSession();
  return NextResponse.json({
    user: { id: session.userId },
    organization: {
      id: session.organizationId,
      name: session.organizationName,
    },
  });
}
