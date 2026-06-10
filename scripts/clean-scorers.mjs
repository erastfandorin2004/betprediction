// Разовая чистка уже сохранённых прогнозов ЛВС: приводит имена бомбардиров к
// латинице и схлопывает дубли (один игрок латиницей и кириллицей от разных
// моделей). Точная карта берётся из player-names-ru.ts, остальное романизируется.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import shared from '../packages/shared/dist/index.js';

const { romanizeCyrillic, romanizeNormalized, isLatinName, isPlaceholderName } = shared;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// reverse-карта кириллица → латиница из web/player-names-ru.ts (KNOWN).
const namesSrc = readFileSync(resolve(ROOT, 'apps/web/src/lib/player-names-ru.ts'), 'utf8');
const RU2LAT = new Map();
for (const m of namesSrc.matchAll(/'([^']+)':\s*'([^']+)'/g)) {
  const [, lat, ru] = m;
  if (/[а-яё]/i.test(ru) && !RU2LAT.has(ru)) RU2LAT.set(ru, lat);
}

const titleCase = (s) => s.replace(/\b([a-z])/g, (_, c) => c.toUpperCase());
function canonicalize(name) {
  if (isLatinName(name)) return name;
  if (RU2LAT.has(name)) return RU2LAT.get(name);
  return titleCase(romanizeCyrillic(name.normalize('NFD').replace(/[̀-ͯ]/g, '')));
}
const surname = (n) => { const t = romanizeNormalized(n).split(' ').filter((x) => x.length >= 4); return t.length ? t[t.length - 1] : ''; };
const firstName = (n) => { const t = romanizeNormalized(n).split(' ').filter((x) => x.length >= 3); return t.length ? t[0] : ''; };

// Один ли это игрок. a/b — {name(латиница после canon), latin(исходный алфавит)}.
function isSamePlayer(a, b) {
  if (romanizeNormalized(a.name) === romanizeNormalized(b.name)) return true;
  const sa = surname(a.name), sb = surname(b.name);
  if (sa !== '' && sa === sb) return true;
  // Кросс-алфавит: один исходно латиницей, другой кириллицей, совпало имя —
  // почти наверняка романизация того же игрока (Haaland / Холанн).
  if (a.latin !== b.latin) {
    const fa = firstName(a.name), fb = firstName(b.name);
    if (fa !== '' && fa === fb) return true;
  }
  return false;
}

// Возвращает почищенный массив бомбардиров (латиница, без дублей).
function cleanScorers(scorers) {
  const out = [];
  let changed = false;
  for (const s of scorers) {
    if (isPlaceholderName(s.name)) { changed = true; continue; } // выкидываем заглушки
    const name = canonicalize(s.name);
    const latin = isLatinName(s.name);
    if (name !== s.name) changed = true;
    const dup = out.find((o) => isSamePlayer(o, { name, latin }));
    if (dup) {
      changed = true;
      if (s.probability > dup.probability) dup.probability = s.probability;
      if (!dup.position && s.position) dup.position = s.position;
      // Предпочитаем исходно-латинское написание для отображения.
      if (!dup.latin && latin) { dup.name = name; dup.latin = true; }
    } else {
      out.push({ name, team: s.team, position: s.position || null, probability: s.probability, latin });
    }
  }
  out.sort((a, b) => b.probability - a.probability);
  return { scorers: out.map(({ latin: _l, ...rest }) => rest), changed };
}

let total = 0;
for (const file of ['apps/web/public/data/lvs-fixtures.json', 'apps/web/public/data/predictions.json']) {
  const path = resolve(ROOT, file);
  const json = JSON.parse(readFileSync(path, 'utf8'));
  let fileChanged = 0;

  // lvs-fixtures: [{date, fixtures:[{prediction:{scorers}}]}]
  const preds = file.includes('lvs-fixtures')
    ? json.flatMap((d) => d.fixtures).map((f) => f.prediction).filter(Boolean)
    : Object.values(json);

  for (const p of preds) {
    if (!Array.isArray(p.scorers) || !p.scorers.length) continue;
    const { scorers, changed } = cleanScorers(p.scorers);
    if (changed) { p.scorers = scorers; fileChanged++; }
  }

  if (fileChanged) writeFileSync(path, JSON.stringify(json));
  console.log(`${file}: обновлено прогнозов ${fileChanged}`);
  total += fileChanged;
}
console.log(`Всего: ${total}. Карта имён: ${RU2LAT.size} записей.`);
