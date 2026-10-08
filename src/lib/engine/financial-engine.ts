/**
 * Delta Journal — Financial Calculation Engine
 * 
 * AUTHORITATIVE server-side financial calculation engine.
 * All financial arithmetic uses decimal.js for precision.
 * Frontend may have a preview calculator for UX, but this is the source of truth.
 * 
 * FORMULAS:
 * ---------
 * ETH quantity = lots / lotsPerEth
 * Entry notional = entryPrice * ethQuantity
 * Exit notional = exitPrice * ethQuantity
 * 
 * LONG gross P&L = (exitPrice - entryPrice) * ethQuantity
 * SHORT gross P&L = (entryPrice - exitPrice) * ethQuantity
 * 
 * Entry fee = entryNotional * applicableFeeRate
 * Exit fee = exitNotional * applicableFeeRate
 * GST = totalFees * gstRate
 * 
 * Funding: PAID = negative, RECEIVED = positive, NONE = 0
 * 
 * Net P&L USD = grossPnl - totalFees - GST + fundingNet
 * Net P&L INR = netPnlUsd * fxRate
 * 
 * Estimated Margin = (entryNotional / leverage) * fxRate
 */

import { Decimal } from 'decimal.js';
import type { TradeCalculationInput, TradeCalculationResult, TradingSettingsInput } from '@/types';

// Configure decimal.js for financial calculations
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// ============================================================
// TRADE FINANCIAL CALCULATIONS
// ============================================================

export function calculateTradeFinancials(
  input: TradeCalculationInput,
  settings: TradingSettingsInput
): TradeCalculationResult {
  const { direction, entryPriceUsd, exitPriceUsd, lots, leverage, entryOrderType, exitOrderType, fundingType, fundingAmountUsd } = input;
  const { fxRateUsdToInr, makerFeeRate, takerFeeRate, gstRate, lotsPerEth } = settings;

  // ETH Quantity
  const ethQuantity = new Decimal(lots).div(lotsPerEth);

  // Notionals
  const entryNotionalUsd = entryPriceUsd.mul(ethQuantity);
  const exitNotionalUsd = exitPriceUsd.mul(ethQuantity);

  // Gross P&L
  let grossPnlUsd: Decimal;
  if (direction === 'LONG') {
    grossPnlUsd = exitPriceUsd.sub(entryPriceUsd).mul(ethQuantity);
  } else {
    grossPnlUsd = entryPriceUsd.sub(exitPriceUsd).mul(ethQuantity);
  }

  // Fees — based on notional, NOT margin, NOT multiplied by leverage
  const entryFeeRate = entryOrderType === 'MAKER' ? makerFeeRate : takerFeeRate;
  const exitFeeRate = exitOrderType === 'MAKER' ? makerFeeRate : takerFeeRate;

  const entryFeeUsd = entryNotionalUsd.mul(entryFeeRate);
  const exitFeeUsd = exitNotionalUsd.mul(exitFeeRate);
  const totalFeesUsd = entryFeeUsd.add(exitFeeUsd);

  // GST on trading fees
  const gstUsd = totalFeesUsd.mul(gstRate);

  // Funding
  let fundingNetUsd: Decimal;
  if (fundingType === 'PAID') {
    fundingNetUsd = fundingAmountUsd.abs().neg();
  } else if (fundingType === 'RECEIVED') {
    fundingNetUsd = fundingAmountUsd.abs();
  } else {
    fundingNetUsd = new Decimal(0);
  }

  // Net P&L
  const netPnlUsd = grossPnlUsd.sub(totalFeesUsd).sub(gstUsd).add(fundingNetUsd);
  const netPnlInr = netPnlUsd.mul(fxRateUsdToInr);

  // Estimated Margin
  const estimatedMarginInr = entryNotionalUsd.div(leverage).mul(fxRateUsdToInr);

  return {
    ethQuantity,
    entryNotionalUsd,
    exitNotionalUsd,
    grossPnlUsd,
    entryFeeUsd,
    exitFeeUsd,
    totalFeesUsd,
    gstUsd,
    fundingNetUsd,
    netPnlUsd,
    netPnlInr,
    estimatedMarginInr,
    fxRateUsed: fxRateUsdToInr,
  };
}

// ============================================================
// CAPITAL FROM LEDGER
// ============================================================

export interface LedgerSummary {
  currentCapital: Decimal;
  totalDeposits: Decimal;
  totalWithdrawals: Decimal;
  totalTradePnl: Decimal;
  totalAdjustments: Decimal;
}

export function calculateCapitalFromLedger(
  ledgerEntries: { type: string; amountInr: Decimal | string | number }[]
): LedgerSummary {
  let currentCapital = new Decimal(0);
  let totalDeposits = new Decimal(0);
  let totalWithdrawals = new Decimal(0);
  let totalTradePnl = new Decimal(0);
  let totalAdjustments = new Decimal(0);

  for (const entry of ledgerEntries) {
    const amount = new Decimal(entry.amountInr);
    currentCapital = currentCapital.add(amount);

    switch (entry.type) {
      case 'INITIAL_CAPITAL':
      case 'DEPOSIT':
        totalDeposits = totalDeposits.add(amount);
        break;
      case 'WITHDRAWAL':
        totalWithdrawals = totalWithdrawals.add(amount);
        break;
      case 'TRADE_PROFIT':
      case 'TRADE_LOSS':
        totalTradePnl = totalTradePnl.add(amount);
        break;
      case 'ADJUSTMENT':
        totalAdjustments = totalAdjustments.add(amount);
        break;
    }
  }

  return {
    currentCapital,
    totalDeposits,
    totalWithdrawals,
    totalTradePnl,
    totalAdjustments,
  };
}

// ============================================================
// DAILY PERFORMANCE
// ============================================================

export interface DailyPerformance {
  beginningCapital: Decimal;
  targetProfit: Decimal;
  actualPnl: Decimal;
  endingCapital: Decimal;
  difference: Decimal;
  targetProgressPct: Decimal;
  targetStatus: 'ACHIEVED' | 'IN_PROGRESS' | 'NO_TRADES';
  tradeCount: number;
  wins: number;
  losses: number;
  grossPnlInr: Decimal;
  feesInr: Decimal;
  gstInr: Decimal;
  fundingInr: Decimal;
}

export function calculateDailyPerformance(
  trades: {
    netPnlInr: Decimal | string | number;
    grossPnlUsd: Decimal | string | number;
    totalFeesUsd: Decimal | string | number;
    gstUsd: Decimal | string | number;
    fundingNetUsd: Decimal | string | number;
    fxRateUsed: Decimal | string | number;
  }[],
  beginningCapital: Decimal,
  dailyTargetRate: Decimal
): DailyPerformance {
  let actualPnl = new Decimal(0);
  let grossPnlInr = new Decimal(0);
  let feesInr = new Decimal(0);
  let gstInr = new Decimal(0);
  let fundingInr = new Decimal(0);
  let wins = 0;
  let losses = 0;

  for (const trade of trades) {
    const netInr = new Decimal(trade.netPnlInr);
    const fxRate = new Decimal(trade.fxRateUsed);

    actualPnl = actualPnl.add(netInr);
    grossPnlInr = grossPnlInr.add(new Decimal(trade.grossPnlUsd).mul(fxRate));
    feesInr = feesInr.add(new Decimal(trade.totalFeesUsd).mul(fxRate));
    gstInr = gstInr.add(new Decimal(trade.gstUsd).mul(fxRate));
    fundingInr = fundingInr.add(new Decimal(trade.fundingNetUsd).mul(fxRate));

    if (netInr.gte(0)) wins++;
    else losses++;
  }

  const targetProfit = beginningCapital.mul(dailyTargetRate);
  const endingCapital = beginningCapital.add(actualPnl);
  const difference = actualPnl.sub(targetProfit);
  const targetProgressPct = targetProfit.gt(0)
    ? actualPnl.div(targetProfit).mul(100)
    : new Decimal(0);

  let targetStatus: 'ACHIEVED' | 'IN_PROGRESS' | 'NO_TRADES';
  if (trades.length === 0) {
    targetStatus = 'NO_TRADES';
  } else if (targetProgressPct.gte(100)) {
    targetStatus = 'ACHIEVED';
  } else {
    targetStatus = 'IN_PROGRESS';
  }

  return {
    beginningCapital,
    targetProfit,
    actualPnl,
    endingCapital,
    difference,
    targetProgressPct,
    targetStatus,
    tradeCount: trades.length,
    wins,
    losses,
    grossPnlInr,
    feesInr,
    gstInr,
    fundingInr,
  };
}

// ============================================================
// ANALYTICS
// ============================================================

export interface AnalyticsResult {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: Decimal;
  avgWinner: Decimal;
  avgLoser: Decimal;
  largestWinner: Decimal;
  largestLoser: Decimal;
  profitFactor: Decimal;
  expectancy: Decimal;
  totalFeesInr: Decimal;
  totalGstInr: Decimal;
  totalFundingInr: Decimal;
  maxDrawdownPct: Decimal;
  maxDrawdownAmount: Decimal;
  winStreak: number;
  lossStreak: number;
  setupPerformance: Map<string, { pnl: Decimal; count: number }>;
  mistakeCost: Map<string, { cost: Decimal; count: number }>;
  emotionAnalysis: Map<string, { pnl: Decimal; count: number }>;
}

export function calculateAnalytics(
  trades: {
    netPnlInr: Decimal | string | number;
    grossPnlUsd: Decimal | string | number;
    totalFeesUsd: Decimal | string | number;
    gstUsd: Decimal | string | number;
    fundingNetUsd: Decimal | string | number;
    fxRateUsed: Decimal | string | number;
    setup?: string | null;
    mistake?: string | null;
    emotion?: string | null;
  }[],
  initialCapital: Decimal
): AnalyticsResult {
  if (trades.length === 0) {
    return {
      totalTrades: 0,
      wins: 0,
      losses: 0,
      winRate: new Decimal(0),
      avgWinner: new Decimal(0),
      avgLoser: new Decimal(0),
      largestWinner: new Decimal(0),
      largestLoser: new Decimal(0),
      profitFactor: new Decimal(0),
      expectancy: new Decimal(0),
      totalFeesInr: new Decimal(0),
      totalGstInr: new Decimal(0),
      totalFundingInr: new Decimal(0),
      maxDrawdownPct: new Decimal(0),
      maxDrawdownAmount: new Decimal(0),
      winStreak: 0,
      lossStreak: 0,
      setupPerformance: new Map(),
      mistakeCost: new Map(),
      emotionAnalysis: new Map(),
    };
  }

  let wins = 0;
  let losses = 0;
  let grossWinsInr = new Decimal(0);
  let grossLossesInr = new Decimal(0);
  let largestWinner = new Decimal(0);
  let largestLoser = new Decimal(0);
  let totalFeesInr = new Decimal(0);
  let totalGstInr = new Decimal(0);
  let totalFundingInr = new Decimal(0);

  // Drawdown tracking
  let runningCapital = new Decimal(initialCapital);
  let peakCapital = new Decimal(initialCapital);
  let maxDrawdownPct = new Decimal(0);
  let maxDrawdownAmount = new Decimal(0);

  // Streak tracking
  let currentWinStreak = 0;
  let currentLossStreak = 0;
  let maxWinStreak = 0;
  let maxLossStreak = 0;

  // Category tracking
  const setupPerformance = new Map<string, { pnl: Decimal; count: number }>();
  const mistakeCost = new Map<string, { cost: Decimal; count: number }>();
  const emotionAnalysis = new Map<string, { pnl: Decimal; count: number }>();

  for (const trade of trades) {
    const netInr = new Decimal(trade.netPnlInr);
    const fxRate = new Decimal(trade.fxRateUsed);
    const feesInr = new Decimal(trade.totalFeesUsd).mul(fxRate);
    const gstInr = new Decimal(trade.gstUsd).mul(fxRate);
    const fundingInr = new Decimal(trade.fundingNetUsd).mul(fxRate);

    totalFeesInr = totalFeesInr.add(feesInr);
    totalGstInr = totalGstInr.add(gstInr);
    totalFundingInr = totalFundingInr.add(fundingInr);

    if (netInr.gte(0)) {
      wins++;
      grossWinsInr = grossWinsInr.add(netInr);
      if (netInr.gt(largestWinner)) largestWinner = netInr;
      currentWinStreak++;
      currentLossStreak = 0;
      if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
    } else {
      losses++;
      grossLossesInr = grossLossesInr.add(netInr.abs());
      if (netInr.abs().gt(largestLoser)) largestLoser = netInr.abs();
      currentLossStreak++;
      currentWinStreak = 0;
      if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
    }

    // Drawdown
    runningCapital = runningCapital.add(netInr);
    if (runningCapital.gt(peakCapital)) {
      peakCapital = runningCapital;
    }
    const drawdownAmount = peakCapital.sub(runningCapital);
    const drawdownPct = peakCapital.gt(0) ? drawdownAmount.div(peakCapital).mul(100) : new Decimal(0);
    if (drawdownPct.gt(maxDrawdownPct)) {
      maxDrawdownPct = drawdownPct;
      maxDrawdownAmount = drawdownAmount;
    }

    // Setup performance
    if (trade.setup) {
      const existing = setupPerformance.get(trade.setup) || { pnl: new Decimal(0), count: 0 };
      existing.pnl = existing.pnl.add(netInr);
      existing.count++;
      setupPerformance.set(trade.setup, existing);
    }

    // Mistake cost
    if (trade.mistake && trade.mistake !== 'None') {
      const existing = mistakeCost.get(trade.mistake) || { cost: new Decimal(0), count: 0 };
      existing.cost = existing.cost.add(netInr.lt(0) ? netInr.abs() : new Decimal(0));
      existing.count++;
      mistakeCost.set(trade.mistake, existing);
    }

    // Emotion analysis
    if (trade.emotion) {
      const existing = emotionAnalysis.get(trade.emotion) || { pnl: new Decimal(0), count: 0 };
      existing.pnl = existing.pnl.add(netInr);
      existing.count++;
      emotionAnalysis.set(trade.emotion, existing);
    }
  }

  const totalTrades = trades.length;
  const winRate = totalTrades > 0 ? new Decimal(wins).div(totalTrades).mul(100) : new Decimal(0);
  const avgWinner = wins > 0 ? grossWinsInr.div(wins) : new Decimal(0);
  const avgLoser = losses > 0 ? grossLossesInr.div(losses) : new Decimal(0);

  // Profit Factor = Gross Winning P&L / |Gross Losing P&L|
  const profitFactor = grossLossesInr.gt(0)
    ? grossWinsInr.div(grossLossesInr)
    : grossWinsInr.gt(0)
      ? new Decimal(999.99) // No losses but has wins — display as very high
      : new Decimal(0);

  // Expectancy = (win probability × avg win) - (loss probability × avg loss)
  const winProb = totalTrades > 0 ? new Decimal(wins).div(totalTrades) : new Decimal(0);
  const lossProb = totalTrades > 0 ? new Decimal(losses).div(totalTrades) : new Decimal(0);
  const expectancy = winProb.mul(avgWinner).sub(lossProb.mul(avgLoser));

  return {
    totalTrades,
    wins,
    losses,
    winRate,
    avgWinner,
    avgLoser,
    largestWinner,
    largestLoser,
    profitFactor,
    expectancy,
    totalFeesInr,
    totalGstInr,
    totalFundingInr,
    maxDrawdownPct,
    maxDrawdownAmount,
    winStreak: maxWinStreak,
    lossStreak: maxLossStreak,
    setupPerformance,
    mistakeCost,
    emotionAnalysis,
  };
}

// ============================================================
// EQUITY CURVE
// ============================================================

export interface EquityCurvePointRaw {
  label: string;
  date: string;
  actualCapital: Decimal;
  targetCapital: Decimal;
}

export function calculateEquityCurve(
  tradingDays: { date: string; actualPnl: Decimal | string | number }[],
  initialCapital: Decimal,
  dailyTargetRate: Decimal
): EquityCurvePointRaw[] {
  const points: EquityCurvePointRaw[] = [
    {
      label: 'Start',
      date: tradingDays.length > 0 ? tradingDays[0].date : new Date().toISOString().split('T')[0],
      actualCapital: initialCapital,
      targetCapital: initialCapital,
    },
  ];

  let runningActual = new Decimal(initialCapital);
  let runningTarget = new Decimal(initialCapital);

  for (let i = 0; i < tradingDays.length; i++) {
    const day = tradingDays[i];
    runningActual = runningActual.add(new Decimal(day.actualPnl));
    runningTarget = runningTarget.mul(new Decimal(1).add(dailyTargetRate));

    points.push({
      label: `Day ${i + 1}`,
      date: day.date,
      actualCapital: runningActual,
      targetCapital: runningTarget,
    });
  }

  return points;
}

// ============================================================
// COMPOUNDING TRAJECTORY
// ============================================================

export interface CompoundingDayRaw {
  day: number;
  date: string | null;
  startCapital: Decimal;
  targetProfit: Decimal;
  targetCapital: Decimal;
  actualDayPnl: Decimal | null;
  actualCapital: Decimal | null;
  variance: Decimal | null;
  status: 'AHEAD' | 'BELOW_GOAL' | 'PENDING';
}

export function calculateCompounding(
  tradingDays: { date: string; actualPnl: Decimal | string | number }[],
  initialCapital: Decimal,
  dailyTargetRate: Decimal,
  numDays: number = 30
): CompoundingDayRaw[] {
  const result: CompoundingDayRaw[] = [];
  let currentCapTarget = new Decimal(initialCapital);
  let currentCapActual = new Decimal(initialCapital);

  for (let day = 1; day <= numDays; day++) {
    const startCap = currentCapTarget;
    const targetProfit = startCap.mul(dailyTargetRate);
    const targetEndCap = startCap.add(targetProfit);
    currentCapTarget = targetEndCap;

    const dayData = tradingDays[day - 1] || null;
    const actualDayPnl = dayData ? new Decimal(dayData.actualPnl) : null;
    const dayDate = dayData ? dayData.date : null;

    if (actualDayPnl !== null) {
      currentCapActual = currentCapActual.add(actualDayPnl);
    }

    const actualCapForDay = actualDayPnl !== null ? currentCapActual : null;
    const variance = actualCapForDay !== null ? actualCapForDay.sub(targetEndCap) : null;

    let status: 'AHEAD' | 'BELOW_GOAL' | 'PENDING';
    if (variance === null) {
      status = 'PENDING';
    } else if (variance.gte(0)) {
      status = 'AHEAD';
    } else {
      status = 'BELOW_GOAL';
    }

    result.push({
      day,
      date: dayDate,
      startCapital: startCap,
      targetProfit,
      targetCapital: targetEndCap,
      actualDayPnl,
      actualCapital: actualCapForDay,
      variance,
      status,
    });
  }

  return result;
}
