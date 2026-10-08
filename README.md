# Delta Journal

A private ETHUSD perpetual trading journal for manual trade entry and performance review. It does not connect to an exchange, execute orders, generate signals, or provide financial advice. The 4% daily figure is a configurable personal mathematical benchmark, never a forecast or guaranteed return.

## Stack

- Next.js App Router, React, TypeScript, Tailwind CSS
- PostgreSQL and Prisma with Decimal financial calculations
- NextAuth credentials sessions and Zod request validation
- Recharts for the actual equity curve

## Local setup

1. Use Node.js 20 or newer and install dependencies with `npm ci`.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`, `DIRECT_URL`, and a long random `AUTH_SECRET`. Keep these values server-side; never prefix secrets with `NEXT_PUBLIC_`.
3. Create a PostgreSQL database, then run `npx prisma migrate dev --name init` and `npx prisma generate`.
4. Run `npm run dev` and open `http://localhost:3000`.
5. Create a private account on `/login`. New accounts start with ₹5,000 initial capital and zero trades.

Use `npm run build` for a production build and `npm start` to serve it. Deploy the Next.js application to Vercel and PostgreSQL to Supabase. Use a pooled connection for application traffic and the direct connection for migrations where the provider recommends that setup.

## Data and calculations

Trades, fee records, ledger entries, and trading-day summaries are written together in a database transaction. The capital total is derived from the account ledger. Trade P&L, fees, GST, funding, conversion, margin, and historical FX rates are calculated on the server with `decimal.js`; PostgreSQL fields use `NUMERIC` through Prisma Decimal. The client preview is indicative only and the server recalculates every submitted trade.

Every protected query is scoped to the authenticated user's account. Initial capital and defaults are created for a new user in the registration transaction. The database starts with no trade sample data.

## API

Implemented endpoints include `/api/dashboard`, `/api/trades` (list/create), `/api/trades/:id` (read/update/delete), `/api/analytics`, `/api/compounding`, `/api/trading-days`, `/api/settings`, `/api/ledger/adjustment`, and `/api/export` (CSV). JSON APIs return `{ success, data }` for successful responses and a safe error message for failures.

## Environment variables

See `.env.example`. Set `AUTH_SECRET` to a unique random value for each environment. No database credential belongs in the browser bundle.
