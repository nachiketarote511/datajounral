import { z } from 'zod';

// ============================================================
// TRADE INPUT VALIDATION
// ============================================================

export const createTradeSchema = z.object({
  direction: z.enum(['LONG', 'SHORT']),
  entryPriceUsd: z.number().positive('Entry price must be positive'),
  exitPriceUsd: z.number().positive('Exit price must be positive'),
  lots: z.number().int().positive('Lots must be a positive integer'),
  leverage: z.number().int().min(1).max(200),
  entryOrderType: z.enum(['MAKER', 'TAKER']),
  exitOrderType: z.enum(['MAKER', 'TAKER']),
  fundingType: z.enum(['NONE', 'PAID', 'RECEIVED']),
  fundingAmountUsd: z.number().min(0).default(0),
  setup: z.string().optional().nullable(),
  emotion: z.string().optional().nullable(),
  mistake: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  timestamp: z.string().datetime().optional(),
});

export type CreateTradeInput = z.infer<typeof createTradeSchema>;

export const updateTradeSchema = createTradeSchema.partial().extend({
  id: z.string(),
});

export type UpdateTradeInput = z.infer<typeof updateTradeSchema>;

// ============================================================
// SETTINGS VALIDATION
// ============================================================

export const updateSettingsSchema = z.object({
  accountName: z.string().min(1).max(100).optional(),
  initialCapital: z.number().positive().optional(),
  fxRateUsdToInr: z.number().positive().optional(),
  makerFeeRate: z.number().min(0).max(1).optional(),   // as decimal (0.0002)
  takerFeeRate: z.number().min(0).max(1).optional(),   // as decimal (0.0005)
  gstRate: z.number().min(0).max(1).optional(),         // as decimal (0.18)
  lotsPerEth: z.number().int().positive().optional(),
  defaultLeverage: z.number().int().min(1).max(200).optional(),
  dailyTargetRate: z.number().min(0).max(1).optional(), // as decimal (0.04)
  timezone: z.string().optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

// ============================================================
// LEDGER ADJUSTMENT VALIDATION
// ============================================================

export const ledgerAdjustmentSchema = z.object({
  type: z.enum(['DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT']),
  amountInr: z.number().positive('Amount must be positive'),
  description: z.string().min(1).max(500),
});

export type LedgerAdjustmentInput = z.infer<typeof ledgerAdjustmentSchema>;

// ============================================================
// AUTH VALIDATION
// ============================================================

export const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
