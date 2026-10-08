const fs = require('node:fs');
require('dotenv').config();
const { Client } = require('pg');

const backupPath = process.argv[2] || 'backups/legacy-20261008.json';
const tables = ['User', 'Account', 'TradingSettings', 'Trade', 'FeeRecord', 'LedgerEntry', 'TradingDay'];

function normalize(value) {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalize(item)]));
  return value;
}

async function main() {
  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  const client = new Client({ connectionString: process.env.DIRECT_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const checks = {};
    for (const table of tables) {
      const before = backup.data[table];
      const after = (await client.query(`SELECT * FROM public."${table}"`)).rows;
      const columns = backup.schema.columns.filter((column) => column.table_name === table).map((column) => column.column_name);
      const project = (rows) => rows.map((row) => Object.fromEntries(columns.map((column) => [column, normalize(row[column])]))).sort((a, b) => String(a.id).localeCompare(String(b.id)));
      checks[table] = {before: before.length, after: after.length, preserved: JSON.stringify(project(before)) === JSON.stringify(project(after))};
    }
    process.stdout.write(JSON.stringify({checks, allPreserved: Object.values(checks).every((check) => check.preserved)}) + '\n');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`Preservation verification failed: ${error.message}\n`);
  process.exitCode = 1;
});
