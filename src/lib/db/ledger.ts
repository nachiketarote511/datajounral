import { Decimal } from 'decimal.js';
import type { Prisma } from '@/generated/prisma/client';

/** Rebuild persisted running balances after a ledger amount is changed or removed. */
export async function reconcileLedgerBalances(tx: Prisma.TransactionClient, accountId: string) {
  const entries = await tx.ledgerEntry.findMany({
    where: { accountId },
    orderBy: [{ timestamp: 'asc' }, { id: 'asc' }],
  });
  let balance = new Decimal(0);
  for (const entry of entries) {
    balance = balance.add(entry.amountInr.toString());
    if (!new Decimal(entry.balanceAfter.toString()).eq(balance)) {
      await tx.ledgerEntry.update({ where: { id: entry.id }, data: { balanceAfter: balance.toFixed(8) } });
    }
  }
}
