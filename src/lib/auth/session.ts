import { auth } from '@/lib/auth/auth';
import prisma from '@/lib/db/prisma';
import { NextResponse } from 'next/server';

/**
 * Get the authenticated user's account, or return an error response.
 * This is the central helper for all protected API routes.
 */
export async function getAuthenticatedAccount() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      ),
      account: null,
      userId: null,
    };
  }

  const userId = session.user.id;

  // Get or create the user's account
  let account = await prisma.account.findFirst({
    where: { userId },
    include: { tradingSettings: true },
  });

  if (!account) {
    // First-login bootstrap is atomic so the account cannot exist without its opening ledger balance.
    account = await prisma.$transaction(async (tx) => {
      const created = await tx.account.create({
        data: {
          userId,
          name: 'My Trading Account',
          initialCapital: 5000,
          baseCurrency: 'INR',
          tradingSettings: { create: { fxRateUsdToInr: 83, makerFeeRate: 0.0002, takerFeeRate: 0.0005, gstRate: 0.18, lotsPerEth: 100, defaultLeverage: 25, dailyTargetRate: 0.04, timezone: 'Asia/Kolkata' } },
        }, include: { tradingSettings: true },
      });
      await tx.ledgerEntry.create({ data: { accountId: created.id, type: 'INITIAL_CAPITAL', amountInr: 5000, balanceAfter: 5000, description: 'Initial trading capital deposit', timestamp: new Date('2000-01-01T00:00:00.000Z') } });
      return created;
    });
  }

  return { error: null, account, userId };
}
