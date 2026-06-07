// Seeds the two LVS TEST friendlies with their REAL API-Football fixture ids so
// the worker keeps their status/score in sync automatically. Идемпотентно.
// Run: node scripts/seed-lvs-test.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { Pool } = require('../packages/db/node_modules/pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://aiscore:aiscore@localhost:5432/aiscore',
});

const SPORT_ID = 1;
const FRIENDLIES_LEAGUE = 10; // уже есть в БД (API-Football «Friendlies»)

// [fixtureId, homeId, homeName, awayId, awayName, kickoffISO]
const MATCHES = [
  [1548446, 1552, 'Oman', 1512, 'Mozambique', '2026-06-07T13:00:00.000Z'],
  [1540590, 1117, 'Greece', 768, 'Italy', '2026-06-07T19:00:00.000Z'],
];

async function main() {
  await pool.query(
    `INSERT INTO sports (id, name, slug) VALUES ($1,'Football','football') ON CONFLICT (id) DO NOTHING`,
    [SPORT_ID],
  );
  // Лига Friendlies обычно уже есть; на всякий случай — upsert.
  await pool.query(
    `INSERT INTO leagues (id, sport_id, name, short_name, country, country_code, season, type)
     VALUES ($1,$2,'Friendlies','Friendlies','World','INT',2026,'Friendly')
     ON CONFLICT (id) DO NOTHING`,
    [FRIENDLIES_LEAGUE, SPORT_ID],
  );

  for (const [fid, hId, hName, aId, aName, kickoff] of MATCHES) {
    await pool.query(
      `INSERT INTO teams (id, name, short_name, country) VALUES ($1,$2,$2,$2),($3,$4,$4,$4)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
      [hId, hName, aId, aName],
    );
    await pool.query(
      `INSERT INTO fixtures (id, sport_id, league_id, home_team_id, away_team_id, starts_at, status, round)
       VALUES ($1,$2,$3,$4,$5,$6,'scheduled','Товарищеский матч')
       ON CONFLICT (id) DO UPDATE SET starts_at = EXCLUDED.starts_at`,
      [fid, SPORT_ID, FRIENDLIES_LEAGUE, hId, aId, kickoff],
    );
    console.log(`Seeded LVS test ${fid}: ${hName} — ${aName} @ ${kickoff}`);
  }
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
