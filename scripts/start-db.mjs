/**
 * Starts an embedded PostgreSQL instance for development.
 * Run: node scripts/start-db.mjs
 *
 * Data is persisted in ./tmp/pgdata between restarts.
 *
 * If you prefer Docker, use: docker compose up -d
 */

import EmbeddedPostgres from 'embedded-postgres';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(fileURLToPath(import.meta.url), '../..');

const pg = new EmbeddedPostgres({
  databaseDir: resolve(root, 'tmp/pgdata'),
  user: 'aiscore',
  password: 'aiscore',
  port: 5432,
  persistent: true,
});

process.on('SIGINT', async () => {
  console.log('\nShutting down PostgreSQL...');
  await pg.stop().catch(() => {});
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await pg.stop().catch(() => {});
  process.exit(0);
});

console.log('Starting embedded PostgreSQL 18 on port 5432...');

try {
  await pg.initialise();
} catch {
  // Already initialised
}

await pg.start();
console.log('PostgreSQL ready at postgresql://aiscore:aiscore@127.0.0.1:5432/aiscore');

try {
  await pg.createDatabase('aiscore');
  console.log('Database "aiscore" created');
} catch {
  // Database already exists
}

console.log('\nPress Ctrl+C to stop.\n');

// Keep process alive
setInterval(() => {}, 30_000);
