import { Decimal } from 'decimal.js';

// ============================================================
// TRADING SETTINGS INPUT
// ============================================================
export interface TradingSettingsInput {
  fxRateUsdToInr: Decimal;
  makerFeeRate: Decimal;
  takerFeeRate: Decimal;
  gstRate: Decimal;
  lotsPerEth: number;
  defaultLeverage: number;
  dailyTargetRate: Decimal;
  timezone: string;
}

// ============================================================
// TRADE CALCULATION INPUT
// ============================================================
export interface TradeCalculationInput {
  direction: 'LONG' | 'SHORT';
  entryPriceUsd: Decimal;
  exitPriceUsd: Decimal;
  lots: number;
  leverage: number;
  entryOrderType: 'MAKER' | 'TAKER';
  exitOrderType: 'MAKER' | 'TAKER';
  fundingType: 'NONE' | 'PAID' | 'RECEIVED';
  fundingAmountUsd: Decimal;
}

// ============================================================
// TRADE CALCULATION RESULT
// ============================================================
export interface TradeCalculationResult {
  ethQuantity: Decimal;
  entryNotionalUsd: Decimal;
  exitNotionalUsd: Decimal;
  grossPnlUsd: Decimal;
  entryFeeUsd: Decimal;
  exitFeeUsd: Decimal;
  totalFeesUsd: Decimal;
  gstUsd: Decimal;
  fundingNetUsd: Decimal;
  netPnlUsd: Decimal;
  netPnlInr: Decimal;
  estimatedMarginInr: Decimal;
  fxRateUsed: Decimal;
}

// ============================================================
// DASHBOARD DATA
// ============================================================
export interface DashboardData {
  currentCapital: string;
  lifetimePnl: string;
  lifetimePnlPct: string;
  initialCapital: string;
  totalTradesCount: number;
  todayBodCapital: string;
  todayTargetProfit: string;
  todayActualPnl: string;
  todayDifference: string;
  targetProgressPct: string;
  targetStatus: string;
  tradesToday: number;
  todayWins: number;
  todayLosses: number;
  winRate: string;
  profitFactor: string;
  totalFeesInr: string;
  maxDrawdownPct: string;
  todayGrossPnlInr: string;
  todayFeesInr: string;
  todayGstInr: string;
  todayFundingInr: string;
  todayNetPnlInr: string;
  todayEndingCapital: string;
  recentTrades: TradeListItem[];
}

export interface TradeListItem {
  id: string;
  timestamp: string;
  tradingDate: string;
  direction: 'LONG' | 'SHORT';
  entryPriceUsd: string;
  exitPriceUsd: string;
  lots: number;
  ethQuantity: string;
  leverage: number;
  entryOrderType: string;
  exitOrderType: string;
  grossPnlUsd: string;
  totalFeesUsd: string;
  gstUsd: string;
  fundingNetUsd: string;
  netPnlUsd: string;
  netPnlInr: string;
  fxRateUsed: string;
  entryNotionalUsd: string;
  exitNotionalUsd: string;
  estimatedMarginInr: string;
  setup: string | null;
  emotion: string | null;
  mistake: string | null;
  notes: string | null;
}

// ============================================================
// ANALYTICS DATA
// ============================================================
export interface AnalyticsData {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: string;
  avgWinner: string;
  avgLoser: string;
  largestWinner: string;
  largestLoser: string;
  profitFactor: string;
  expectancy: string;
  totalFeesInr: string;
  totalGstInr: string;
  totalFundingInr: string;
  maxDrawdownPct: string;
  maxDrawdownAmount: string;
  winStreak: number;
  lossStreak: number;
  setupPerformance: { setup: string; pnl: string; count: number }[];
  mistakeCost: { mistake: string; cost: string; count: number }[];
  emotionAnalysis: { emotion: string; pnl: string; count: number }[];
}

// ============================================================
// COMPOUNDING DATA
// ============================================================
export interface CompoundingDay {
  day: number;
  date: string | null;
  startCapital: string;
  targetProfit: string;
  targetCapital: string;
  actualDayPnl: string | null;
  actualCapital: string | null;
  variance: string | null;
  status: 'AHEAD' | 'BELOW_GOAL' | 'PENDING';
}

export interface CompoundingData {
  days: CompoundingDay[];
  targetRate: string;
  initialCapital: string;
}

// ============================================================
// EQUITY CURVE
// ============================================================
export interface EquityCurvePoint {
  label: string;
  date: string;
  actualCapital: string;
  targetCapital: string;
}

export interface EquityCurveData {
  points: EquityCurvePoint[];
}

// ============================================================
// SETTINGS
// ============================================================
export interface SettingsData {
  accountName: string;
  initialCapital: string;
  baseCurrency: string;
  fxRateUsdToInr: string;
  makerFeeRate: string;
  takerFeeRate: string;
  gstRate: string;
  lotsPerEth: number;
  defaultLeverage: number;
  dailyTargetRate: string;
  timezone: string;
}

// ============================================================
// API RESPONSE
// ============================================================
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
