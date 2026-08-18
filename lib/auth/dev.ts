/**
 * Dev user — the "current user" for the demo.
 *
 * No real auth in this milestone. The dashboard runs as a single
 * hardcoded user that owns a single Organization. The first request
 * that hits the app creates the row; subsequent requests reuse it.
 *
 * Per the user's instruction: do NOT add authentication yet. The
 * dev-user approach is the explicit choice for the buildathon demo.
 * Real NextAuth + Google OAuth lands in the polish phase.
 */

import { prisma } from '../db/client';

const DEV_USER_ID = 'dev-user-1';
const DEV_ORG_ID = 'dev-org-1';
const DEV_ORG_NAME = "Amara's Catering";

/**
 * Returns the dev user + their org, creating them on first call.
 * Idempotent: safe to call on every request.
 */
export async function getOrCreateDevSession(): Promise<{
  userId: string;
  organizationId: string;
  organizationName: string;
}> {
  await prisma.user.upsert({
    where: { id: DEV_USER_ID },
    create: {
      id: DEV_USER_ID,
      email: 'dev@amara-catering.example',
      name: 'Amara Joseph',
    },
    update: {},
  });
  await prisma.organization.upsert({
    where: { id: DEV_ORG_ID },
    create: {
      id: DEV_ORG_ID,
      name: DEV_ORG_NAME,
      defaultCurrency: 'XCD',
      country: 'AG',
      sector: 'catering',
    },
    update: {},
  });
  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: DEV_USER_ID, organizationId: DEV_ORG_ID } },
    create: { userId: DEV_USER_ID, organizationId: DEV_ORG_ID, role: 'owner' },
    update: {},
  });
  return {
    userId: DEV_USER_ID,
    organizationId: DEV_ORG_ID,
    organizationName: DEV_ORG_NAME,
  };
}
