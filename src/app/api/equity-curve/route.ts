import { NextResponse } from 'next/server';
import { Decimal } from 'decimal.js';
import prisma from '@/lib/db/prisma';
import { getAuthenticatedAccount } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { error, account } = await getAuthenticatedAccount();
    if (error) return error;
    const [entries, trades] = await Promise.all([
      prisma.ledgerEntry.findMany({ where: { accountId: account!.id }, orderBy: [{ timestamp: 'asc' }, { id: 'asc' }] }),
      prisma.trade.findMany({ where: { accountId: account!.id }, orderBy: [{ timestamp: 'asc' }, { id: 'asc' }] }),
    ]);
    const targetRate = new Decimal(account!.tradingSettings!.dailyTargetRate.toString());
    const initial = new Decimal(account!.initialCapital.toString());
    let capital = new Decimal(0);
    let theoretical = initial;
    let lastDate = '';
    const points = entries.map((entry) => {
      capital = capital.add(entry.amountInr.toString());
      const date = new Intl.DateTimeFormat('en-CA', { timeZone: account!.tradingSettings!.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(entry.timestamp);
      if (date !== lastDate) {
        if (lastDate) theoretical = theoretical.mul(new Decimal(1).add(targetRate));
        lastDate = date;
      }
      return { timestamp: entry.timestamp.toISOString(), date, actualCapital: capital.toFixed(2), targetCapital: theoretical.toFixed(2), type: entry.type };
    });
    return NextResponse.json({ success: true, data: { points, initialCapital: initial.toFixed(2), tradeCount: trades.length, targetRate: targetRate.toString() } });
  } catch (cause) {
    console.error('Equity curve load failed', cause);
    return NextResponse.json({ success: false, error: 'Unable to load the equity curve.' }, { status: 500 });
  }
}
