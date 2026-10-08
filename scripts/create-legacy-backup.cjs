const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
require('dotenv').config();
const { Client } = require('pg');

const tables = ['User', 'Account', 'TradingSettings', 'Trade', 'FeeRecord', 'LedgerEntry', 'TradingDay'];

async function main() {
  const target = path.resolve(process.argv[2] || 'backups/legacy-20261008.json');
  if (!process.env.DIRECT_URL) throw new Error('DIRECT_URL is not configured');
  const client = new Client({ connectionString: process.env.DIRECT_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const columns = (await client.query(`
      SELECT table_name, column_name, ordinal_position, data_type, udt_name, is_nullable,
             column_default, numeric_precision, numeric_scale, character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ANY($1::text[])
      ORDER BY table_name, ordinal_position`, [tables])).rows;
    const constraints = (await client.query(`
      SELECT c.relname AS table_name, con.conname AS name, con.contype AS kind,
             pg_get_constraintdef(con.oid, true) AS definition
      FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = ANY($1::text[])
      ORDER BY c.relname, con.conname`, [tables])).rows;
    const indexes = (await client.query(`
      SELECT tablename AS table_name, indexname AS name, indexdef AS definition
      FROM pg_indexes WHERE schemaname = 'public' AND tablename = ANY($1::text[])
      ORDER BY tablename, indexname`, [tables])).rows;
    const data = {};
    for (const table of tables) {
      const result = await client.query(`SELECT * FROM public."${table}"`);
      data[table] = result.rows;
    }
    const payload = {
      format: 'delta-journal-schema-data-export-v1',
      capturedAt: new Date().toISOString(),
      schema: { columns, constraints, indexes },
      data,
    };
    const bytes = Buffer.from(JSON.stringify(payload, null, 2));
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, bytes, { flag: 'wx' });
    await client.query('COMMIT');
    const rowCounts = Object.fromEntries(tables.map((name) => [name, data[name].length]));
    process.stdout.write(JSON.stringify({ path: target, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), rowCounts }) + '\n');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`Backup failed: ${error.message}\n`);
  process.exitCode = 1;
});
