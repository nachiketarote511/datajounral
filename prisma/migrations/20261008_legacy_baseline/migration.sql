-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Main Account',
    "baseCurrency" TEXT NOT NULL DEFAULT 'INR',
    "initialCapital" DECIMAL(20,8) NOT NULL DEFAULT 5000,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "isOnboarded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeRecord" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "feeType" TEXT NOT NULL,
    "amount" DECIMAL(20,8) NOT NULL,
    "rate" DECIMAL(10,8) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(20,8) NOT NULL,
    "balanceAfter" DECIMAL(20,8) NOT NULL,
    "referenceTradeId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "tradeNumber" SERIAL NOT NULL,
    "instrument" TEXT NOT NULL DEFAULT 'ETHUSD',
    "direction" TEXT NOT NULL,
    "entryPrice" DECIMAL(20,8) NOT NULL,
    "exitPrice" DECIMAL(20,8) NOT NULL,
    "lots" INTEGER NOT NULL,
    "ethQuantity" DECIMAL(20,8) NOT NULL,
    "leverage" INTEGER NOT NULL DEFAULT 25,
    "entryOrderType" TEXT NOT NULL,
    "exitOrderType" TEXT NOT NULL,
    "entryNotional" DECIMAL(20,8) NOT NULL,
    "exitNotional" DECIMAL(20,8) NOT NULL,
    "grossPnl" DECIMAL(20,8) NOT NULL,
    "entryFee" DECIMAL(20,8) NOT NULL,
    "exitFee" DECIMAL(20,8) NOT NULL,
    "gst" DECIMAL(20,8) NOT NULL,
    "netPnl" DECIMAL(20,8) NOT NULL,
    "fundingAmount" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "fundingDirection" TEXT NOT NULL DEFAULT 'NONE',
    "fxRate" DECIMAL(20,8) NOT NULL DEFAULT 1,
    "netPnlInr" DECIMAL(20,8) NOT NULL,
    "approxMargin" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "capitalBefore" DECIMAL(20,8) NOT NULL,
    "capitalAfter" DECIMAL(20,8) NOT NULL,
    "stopLoss" DECIMAL(20,8),
    "takeProfit" DECIMAL(20,8),
    "setup" TEXT,
    "emotion" TEXT,
    "mistakeTag" TEXT,
    "notes" TEXT,
    "screenshotUrl" TEXT,
    "externalTradeId" TEXT,
    "openedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradingDay" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startingCapital" DECIMAL(20,8) NOT NULL,
    "targetProfit" DECIMAL(20,8) NOT NULL,
    "targetCapital" DECIMAL(20,8) NOT NULL,
    "actualNetPnl" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "closingCapital" DECIMAL(20,8) NOT NULL,
    "targetDifference" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "targetAchieved" BOOLEAN NOT NULL DEFAULT false,
    "tradeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradingDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradingSettings" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "instrument" TEXT NOT NULL DEFAULT 'ETHUSD',
    "defaultLeverage" INTEGER NOT NULL DEFAULT 25,
    "lotsPerEth" INTEGER NOT NULL DEFAULT 100,
    "makerFeeRate" DECIMAL(10,8) NOT NULL DEFAULT 0.0002,
    "takerFeeRate" DECIMAL(10,8) NOT NULL DEFAULT 0.0005,
    "gstRate" DECIMAL(10,8) NOT NULL DEFAULT 0.18,
    "dailyTargetRate" DECIMAL(10,8) NOT NULL DEFAULT 0.04,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "FeeRecord_tradeId_idx" ON "FeeRecord"("tradeId");

-- CreateIndex
CREATE INDEX "LedgerEntry_accountId_createdAt_idx" ON "LedgerEntry"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "LedgerEntry_accountId_idx" ON "LedgerEntry"("accountId");

-- CreateIndex
CREATE INDEX "LedgerEntry_createdAt_idx" ON "LedgerEntry"("createdAt");

-- CreateIndex
CREATE INDEX "LedgerEntry_type_idx" ON "LedgerEntry"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Trade_externalTradeId_key" ON "Trade"("externalTradeId");

-- CreateIndex
CREATE INDEX "Trade_accountId_closedAt_idx" ON "Trade"("accountId", "closedAt");

-- CreateIndex
CREATE INDEX "Trade_accountId_idx" ON "Trade"("accountId");

-- CreateIndex
CREATE INDEX "Trade_closedAt_idx" ON "Trade"("closedAt");

-- CreateIndex
CREATE INDEX "Trade_createdAt_idx" ON "Trade"("createdAt");

-- CreateIndex
CREATE INDEX "Trade_direction_idx" ON "Trade"("direction");

-- CreateIndex
CREATE INDEX "Trade_instrument_idx" ON "Trade"("instrument");

-- CreateIndex
CREATE INDEX "Trade_setup_idx" ON "Trade"("setup");

-- CreateIndex
CREATE INDEX "TradingDay_accountId_date_idx" ON "TradingDay"("accountId", "date");

-- CreateIndex
CREATE INDEX "TradingDay_accountId_idx" ON "TradingDay"("accountId");

-- CreateIndex
CREATE INDEX "TradingDay_date_idx" ON "TradingDay"("date");

-- CreateIndex
CREATE UNIQUE INDEX "TradingDay_accountId_date_key" ON "TradingDay"("accountId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "TradingSettings_accountId_key" ON "TradingSettings"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeRecord" ADD CONSTRAINT "FeeRecord_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradingDay" ADD CONSTRAINT "TradingDay_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradingSettings" ADD CONSTRAINT "TradingSettings_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

