-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('LONG', 'SHORT');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('MAKER', 'TAKER');

-- CreateEnum
CREATE TYPE "FundingType" AS ENUM ('NONE', 'PAID', 'RECEIVED');

-- CreateEnum
CREATE TYPE "FeeType" AS ENUM ('ENTRY', 'EXIT');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('INITIAL_CAPITAL', 'TRADE_PROFIT', 'TRADE_LOSS', 'DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "TargetStatus" AS ENUM ('ACHIEVED', 'IN_PROGRESS', 'MISSED', 'NO_TRADES');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'My Trading Account',
    "initialCapital" DECIMAL(18,4) NOT NULL DEFAULT 5000,
    "baseCurrency" TEXT NOT NULL DEFAULT 'INR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trading_settings" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "fxRateUsdToInr" DECIMAL(10,4) NOT NULL DEFAULT 83.00,
    "makerFeeRate" DECIMAL(10,6) NOT NULL DEFAULT 0.0002,
    "takerFeeRate" DECIMAL(10,6) NOT NULL DEFAULT 0.0005,
    "gstRate" DECIMAL(6,4) NOT NULL DEFAULT 0.18,
    "lotsPerEth" INTEGER NOT NULL DEFAULT 100,
    "defaultLeverage" INTEGER NOT NULL DEFAULT 25,
    "dailyTargetRate" DECIMAL(6,4) NOT NULL DEFAULT 0.04,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',

    CONSTRAINT "trading_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trades" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tradingDate" DATE NOT NULL,
    "direction" "Direction" NOT NULL,
    "entryPriceUsd" DECIMAL(18,4) NOT NULL,
    "exitPriceUsd" DECIMAL(18,4) NOT NULL,
    "lots" INTEGER NOT NULL,
    "ethQuantity" DECIMAL(18,8) NOT NULL,
    "leverage" INTEGER NOT NULL,
    "entryOrderType" "OrderType" NOT NULL,
    "exitOrderType" "OrderType" NOT NULL,
    "entryNotionalUsd" DECIMAL(18,4) NOT NULL,
    "exitNotionalUsd" DECIMAL(18,4) NOT NULL,
    "grossPnlUsd" DECIMAL(18,4) NOT NULL,
    "entryFeeUsd" DECIMAL(18,6) NOT NULL,
    "exitFeeUsd" DECIMAL(18,6) NOT NULL,
    "totalFeesUsd" DECIMAL(18,6) NOT NULL,
    "gstUsd" DECIMAL(18,6) NOT NULL,
    "fundingType" "FundingType" NOT NULL DEFAULT 'NONE',
    "fundingAmountUsd" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "fundingNetUsd" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "netPnlUsd" DECIMAL(18,4) NOT NULL,
    "fxRateUsed" DECIMAL(10,4) NOT NULL,
    "netPnlInr" DECIMAL(18,4) NOT NULL,
    "estimatedMarginInr" DECIMAL(18,4) NOT NULL,
    "setup" TEXT,
    "emotion" TEXT,
    "mistake" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_records" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "feeType" "FeeType" NOT NULL,
    "orderType" "OrderType" NOT NULL,
    "rate" DECIMAL(10,6) NOT NULL,
    "notionalUsd" DECIMAL(18,4) NOT NULL,
    "feeAmountUsd" DECIMAL(18,6) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fee_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "tradeId" TEXT,
    "type" "LedgerEntryType" NOT NULL,
    "amountInr" DECIMAL(18,4) NOT NULL,
    "description" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trading_days" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "beginningCapital" DECIMAL(18,4) NOT NULL,
    "targetRate" DECIMAL(6,4) NOT NULL,
    "targetProfit" DECIMAL(18,4) NOT NULL,
    "actualPnl" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "endingCapital" DECIMAL(18,4) NOT NULL,
    "targetStatus" "TargetStatus" NOT NULL DEFAULT 'NO_TRADES',
    "tradeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trading_days_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "trading_settings_accountId_key" ON "trading_settings"("accountId");

-- CreateIndex
CREATE INDEX "trades_accountId_tradingDate_idx" ON "trades"("accountId", "tradingDate");

-- CreateIndex
CREATE INDEX "trades_accountId_timestamp_idx" ON "trades"("accountId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_entries_tradeId_key" ON "ledger_entries"("tradeId");

-- CreateIndex
CREATE INDEX "ledger_entries_accountId_timestamp_idx" ON "ledger_entries"("accountId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "trading_days_accountId_date_key" ON "trading_days"("accountId", "date");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trading_settings" ADD CONSTRAINT "trading_settings_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_records" ADD CONSTRAINT "fee_records_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "trades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "trades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trading_days" ADD CONSTRAINT "trading_days_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
