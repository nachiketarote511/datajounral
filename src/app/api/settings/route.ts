import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { reconcileLedgerBalances } from '@/lib/db/ledger';
import { getAuthenticatedAccount } from '@/lib/auth/session';
import { updateSettingsSchema } from '@/lib/validators/schemas';
export const dynamic = 'force-dynamic';

const result = (data: unknown, status = 200) => NextResponse.json({ success: status < 400, data }, { status });
function shape(account: NonNullable<Awaited<ReturnType<typeof getAuthenticatedAccount>>['account']>) {
  const settings = account.tradingSettings!;
  return { accountName: account.name, initialCapital: account.initialCapital.toString(), baseCurrency: account.baseCurrency,
    fxRateUsdToInr: settings.fxRateUsdToInr.toString(), makerFeeRate: settings.makerFeeRate.toString(),
    takerFeeRate: settings.takerFeeRate.toString(), gstRate: settings.gstRate.toString(), lotsPerEth: settings.lotsPerEth,
    defaultLeverage: settings.defaultLeverage, dailyTargetRate: settings.dailyTargetRate.toString(), timezone: settings.timezone };
}
export async function GET() {
  const { error, account } = await getAuthenticatedAccount();
  if (error) return error;
  return result(shape(account!));
}
export async function PUT(req: Request) {
  try {
    const { error, account } = await getAuthenticatedAccount();
    if (error) return error;
    const parsed = updateSettingsSchema.safeParse(await req.json());
    if (!parsed.success) return result({ error: 'Invalid settings.', details: parsed.error.flatten() }, 400);
    const { accountName, initialCapital, ...values } = parsed.data;
    const updated = await prisma.$transaction(async tx => {
      const updatedAccount = accountName || initialCapital !== undefined
        ? await tx.account.update({ where: { id: account!.id }, data: {
          ...(accountName ? { name: accountName } : {}),
          ...(initialCapital !== undefined ? { initialCapital } : {}),
        } })
        : account!;
      if (initialCapital !== undefined) await tx.ledgerEntry.updateMany({
        where: { accountId: account!.id, type: 'INITIAL_CAPITAL' }, data: { amountInr: initialCapital },
      });
      if (initialCapital !== undefined) await reconcileLedgerBalances(tx, account!.id);
      const settings = Object.keys(values).length
        ? await tx.tradingSettings.update({ where: { accountId: account!.id }, data: values })
        : account!.tradingSettings!;
      return { account: updatedAccount, tradingSettings: settings };
    });
    return result(shape({ ...updated.account, tradingSettings: updated.tradingSettings }));
  } catch (e) {
    console.error('Settings update failed', e);
    return result({ error: 'Unable to save settings.' }, 500);
  }
}
