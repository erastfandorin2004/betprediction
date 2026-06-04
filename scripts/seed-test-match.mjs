// Seeds the AI-prediction TEST fixture: Швеция — Греция (товарищеский, сегодня).
// Idempotent — safe to re-run. Run: node scripts/seed-test-match.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { Pool } = require('../packages/db/node_modules/pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://aiscore:aiscore@localhost:5432/aiscore',
});

const SPORT_ID = 1;
const LEAGUE_ID = 990001;
const SWEDEN_ID = 990010;
const GREECE_ID = 990011;
const FIXTURE_ID = 990100;

// Kickoff a few hours from now → unambiguously "today" in any timezone.
const startsAt = new Date(Date.now() + 3 * 60 * 60 * 1000);

async function main() {
  await pool.query(
    `INSERT INTO sports (id, name, slug) VALUES ($1,'Football','football')
     ON CONFLICT (id) DO NOTHING`,
    [SPORT_ID],
  );
  await pool.query(
    `INSERT INTO leagues (id, sport_id, name, short_name, country, country_code, season, type)
     VALUES ($1,$2,'Товарищеские матчи (сборные)','Friendlies','International','INT',2026,'Friendly')
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type`,
    [LEAGUE_ID, SPORT_ID],
  );
  await pool.query(
    `INSERT INTO teams (id, name, short_name, country) VALUES
       ($1,'Sweden','SWE','Sweden'),
       ($2,'Greece','GRE','Greece')
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
    [SWEDEN_ID, GREECE_ID],
  );
  await pool.query(
    `INSERT INTO fixtures (id, sport_id, league_id, home_team_id, away_team_id, starts_at, status, round)
     VALUES ($1,$2,$3,$4,$5,$6,'scheduled','Товарищеский матч')
     ON CONFLICT (id) DO UPDATE SET starts_at = EXCLUDED.starts_at, status = 'scheduled'`,
    [FIXTURE_ID, SPORT_ID, LEAGUE_ID, SWEDEN_ID, GREECE_ID, startsAt.toISOString()],
  );

  console.log(`Seeded test fixture ${FIXTURE_ID}: Sweden — Greece @ ${startsAt.toISOString()}`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
