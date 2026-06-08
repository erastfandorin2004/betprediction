import type { LvsDay, LvsHistoryItem } from '@ai-score/shared';

// Статический источник данных ЛВС (для GitHub Pages — без бэкенда).
// JSON генерирует scripts/lvs-cron.mjs (по крону через GitHub Actions) и кладёт
// в apps/web/public/data.
// Точечная нотация — Next инлайнит только process.env.NEXT_PUBLIC_* так.
// basePath на Pages всегда /betprediction; выводим его из STATIC (env-проброс
// basePath из next.config в клиентский бандл не инлайнится).
export const STATIC_MODE = process.env.NEXT_PUBLIC_STATIC === 'true';
const BASE = STATIC_MODE ? '/betprediction' : '';

// Базовый путь для статических ассетов в public/ (next/image с unoptimized
// не добавляет basePath сам — префиксуем вручную в src hero-картинок).
export const ASSET_BASE = BASE;

export async function fetchLvsFixtures(): Promise<LvsDay[]> {
  try {
    const res = await fetch(`${BASE}/data/lvs-fixtures.json`, { cache: 'no-store' });
    if (!res.ok) return [];
    return (await res.json()) as LvsDay[];
  } catch {
    return [];
  }
}

export async function fetchLvsHistory(): Promise<LvsHistoryItem[]> {
  try {
    const res = await fetch(`${BASE}/data/lvs-history.json`, { cache: 'no-store' });
    if (!res.ok) return [];
    return (await res.json()) as LvsHistoryItem[];
  } catch {
    return [];
  }
}
