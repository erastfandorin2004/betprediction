// Seeds the AI-prediction TEST fixtures (товарищеские, сегодня).
// Idempotent — safe to re-run. Run: node scripts/seed-test-match.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { Pool } = require('../packages/db/node_modules/pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://aiscore:aiscore@localhost:5432/aiscore',
});

const SPORT_ID = 1;
const LEAGUE_ID = 990001;

// Kickoff a few hours from now → unambiguously "today" in any timezone.
const startsAt = new Date(Date.now() + 3 * 60 * 60 * 1000);

// [fixtureId, homeId, homeName, homeShort, awayId, awayName, awayShort]
const MATCHES = [
  [990100, 990010, 'Sweden', 'SWE', 990011, 'Greece', 'GRE'],
  [990101, 990020, 'France', 'FRA', 990021, "Cote d'Ivoire", 'CIV'],
  [990102, 990022, 'Mexico', 'MEX', 990023, 'Serbia', 'SRB'],
  [990103, 990024, 'Moldova', 'MDA', 990025, 'Bulgaria', 'BUL'],
];

async function main() {
  await pool.query(
    `INSERT INTO sports (id, name, slug) VALUES ($1,'Football','football') ON CONFLICT (id) DO NOTHING`,
    [SPORT_ID],
  );
  await pool.query(
    `INSERT INTO leagues (id, sport_id, name, short_name, country, country_code, season, type)
     VALUES ($1,$2,'Товарищеские матчи (сборные)','Friendlies','International','INT',2026,'Friendly')
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type`,
    [LEAGUE_ID, SPORT_ID],
  );

  for (const [fid, hId, hName, hShort, aId, aName, aShort] of MATCHES) {
    await pool.query(
      `INSERT INTO teams (id, name, short_name, country) VALUES ($1,$2,$3,$2),($4,$5,$6,$5)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
      [hId, hName, hShort, aId, aName, aShort],
    );
    await pool.query(
      `INSERT INTO fixtures (id, sport_id, league_id, home_team_id, away_team_id, starts_at, status, round)
       VALUES ($1,$2,$3,$4,$5,$6,'scheduled','Товарищеский матч')
       ON CONFLICT (id) DO UPDATE SET starts_at = EXCLUDED.starts_at, status = 'scheduled',
         score_home = NULL, score_away = NULL`,
      [fid, SPORT_ID, LEAGUE_ID, hId, aId, startsAt.toISOString()],
    );
    console.log(`Seeded ${fid}: ${hName} — ${aName} @ ${startsAt.toISOString()}`);
  }
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
