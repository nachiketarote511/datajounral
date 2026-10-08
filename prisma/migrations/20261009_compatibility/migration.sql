-- Add the fields needed by the current journal while retaining legacy columns
-- and all existing user/account/settings/ledger rows.
BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Trade" WHERE "direction" NOT IN ('LONG', 'SHORT')) THEN
    RAISE EXCEPTION 'Compatibility migration stopped: unknown legacy Trade.direction value';
  END IF;
  IF EXISTS (SELECT 1 FROM "Trade" WHERE "entryOrderType" NOT IN ('MAKER', 'TAKER') OR "exitOrderType" NOT IN ('MAKER', 'TAKER')) THEN
    RAISE EXCEPTION 'Compatibility migration stopped: unknown legacy Trade order type';
  END IF;
  IF EXISTS (SELECT 1 FROM "Trade" WHERE upper(COALESCE("fundingDirection", 'NONE')) NOT IN ('NONE', 'PAID', 'RECEIVED')) THEN
    RAISE EXCEPTION 'Compatibility migration stopped: unknown legacy funding direction';
  END IF;
  IF EXISTS (SELECT 1 FROM "FeeRecord" WHERE upper("feeType") NOT IN ('ENTRY', 'EXIT')) THEN
    RAISE EXCEPTION 'Compatibility migration stopped: unknown legacy fee type';
  END IF;
  IF EXISTS (SELECT 1 FROM "LedgerEntry" l LEFT JOIN "Trade" t ON t."id" = l."referenceTradeId" WHERE l."referenceTradeId" IS NOT NULL AND t."id" IS NULL) THEN
    RAISE EXCEPTION 'Compatibility migration stopped: orphaned legacy ledger trade reference';
  END IF;
  IF EXISTS (SELECT 1 FROM "LedgerEntry" WHERE "referenceTradeId" IS NOT NULL GROUP BY "referenceTradeId" HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Compatibility migration stopped: duplicate legacy ledger trade reference';
  END IF;
  IF EXISTS (SELECT 1 FROM "Account" a WHERE NOT EXISTS (SELECT 1 FROM pg_timezone_names z WHERE z.name = a."timezone")) THEN
    RAISE EXCEPTION 'Compatibility migration stopped: unknown account timezone';
  END IF;
END $$;

CREATE TYPE "TargetStatus" AS ENUM ('ACHIEVED', 'IN_PROGRESS', 'MISSED', 'NO_TRADES');

ALTER TABLE "FeeRecord"
  ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN "notionalUsd" DECIMAL(20,8) NOT NULL DEFAULT 0,
  ADD COLUMN "orderType" TEXT NOT NULL DEFAULT 'TAKER';

ALTER TABLE "Trade"
  ADD COLUMN "estimatedMarginInr" DECIMAL(20,8) NOT NULL DEFAULT 0,
  ADD COLUMN "fundingNetUsd" DECIMAL(20,8) NOT NULL DEFAULT 0,
  ADD COLUMN "totalFeesUsd" DECIMAL(20,8) NOT NULL DEFAULT 0,
  ADD COLUMN "tradingDate" DATE;

UPDATE "Trade" t
SET "tradingDate" = (t."closedAt" AT TIME ZONE COALESCE(NULLIF(a."timezone", ''), 'Asia/Kolkata'))::date
FROM "Account" a
WHERE a."id" = t."accountId" AND t."tradingDate" IS NULL;

UPDATE "Trade"
SET "totalFeesUsd" = COALESCE("entryFee", 0) + COALESCE("exitFee", 0),
    "fundingNetUsd" = CASE upper(COALESCE("fundingDirection", 'NONE'))
      WHEN 'PAID' THEN -ABS(COALESCE("fundingAmount", 0))
      WHEN 'RECEIVED' THEN ABS(COALESCE("fundingAmount", 0))
      ELSE 0 END;

ALTER TABLE "Trade"
  ALTER COLUMN "tradingDate" SET NOT NULL,
  ALTER COLUMN "capitalBefore" DROP NOT NULL,
  ALTER COLUMN "capitalAfter" DROP NOT NULL;

UPDATE "FeeRecord" f
SET "notionalUsd" = CASE upper(COALESCE(f."feeType", ''))
      WHEN 'ENTRY' THEN COALESCE(t."entryNotional", 0)
      WHEN 'EXIT' THEN COALESCE(t."exitNotional", 0)
      ELSE 0 END,
    "orderType" = CASE upper(COALESCE(f."feeType", ''))
      WHEN 'ENTRY' THEN upper(COALESCE(t."entryOrderType", 'TAKER'))
      WHEN 'EXIT' THEN upper(COALESCE(t."exitOrderType", 'TAKER'))
      ELSE 'TAKER' END
FROM "Trade" t
WHERE t."id" = f."tradeId";

ALTER TABLE "TradingDay"
  ADD COLUMN "targetRate" DECIMAL(10,8) NOT NULL DEFAULT 0.04,
  ADD COLUMN "targetStatus" "TargetStatus" NOT NULL DEFAULT 'NO_TRADES';

UPDATE "TradingDay" d
SET "targetRate" = s."dailyTargetRate"
FROM "TradingSettings" s
WHERE s."accountId" = d."accountId";

UPDATE "TradingDay"
SET "targetStatus" = CASE
  WHEN "targetAchieved" OR "actualNetPnl" >= "targetProfit" THEN 'ACHIEVED'::"TargetStatus"
  WHEN "tradeCount" = 0 THEN 'NO_TRADES'::"TargetStatus"
  ELSE 'MISSED'::"TargetStatus"
END;

ALTER TABLE "TradingSettings"
  ADD COLUMN "fxRateUsdToInr" DECIMAL(10,4) NOT NULL DEFAULT 83,
  ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata';

UPDATE "TradingSettings" s
SET "timezone" = a."timezone"
FROM "Account" a
WHERE a."id" = s."accountId";

CREATE UNIQUE INDEX "LedgerEntry_referenceTradeId_key" ON "LedgerEntry"("referenceTradeId");
CREATE INDEX "Trade_accountId_tradingDate_idx" ON "Trade"("accountId", "tradingDate");

ALTER TABLE "LedgerEntry"
  ADD CONSTRAINT "LedgerEntry_referenceTradeId_fkey"
  FOREIGN KEY ("referenceTradeId") REFERENCES "Trade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
