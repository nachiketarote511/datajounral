import { NextResponse } from 'next/server';
import { Decimal } from 'decimal.js';
import prisma from '@/lib/db/prisma';
import { getAuthenticatedAccount } from '@/lib/auth/session';
import { ledgerAdjustmentSchema } from '@/lib/validators/schemas';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { error, account } = await getAuthenticatedAccount();
    if (error) return error;
    const parsed = ledgerAdjustmentSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid ledger entry.' }, { status: 400 });
    const amount = new Decimal(parsed.data.amountInr);
    const signed = parsed.data.type === 'WITHDRAWAL' ? amount.neg() : amount;
    const entry = await prisma.$transaction(async (tx) => {
      const prior = await tx.ledgerEntry.findMany({ where: { accountId: account!.id } });
      const balance = prior.reduce((sum, row) => sum.add(row.amountInr.toString()), new Decimal(0));
      return tx.ledgerEntry.create({ data: {
        accountId: account!.id,
        type: parsed.data.type,
        amountInr: signed.toFixed(8),
        balanceAfter: balance.add(signed).toFixed(8),
        description: parsed.data.description,
      } });
    });
    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  } catch (error) {
    console.error('Ledger adjustment failed', error);
    return NextResponse.json({ error: 'Unable to add ledger adjustment.' }, { status: 500 });
  }
}
