// Ручная статистика матча (угловые/карточки), введённая пользователем по факту.
// Нужна для проверки прогноза по угловым/карточкам на тестовых (синтетических)
// матчах, у которых нет статистики у провайдера. Счёт берётся из таблицы fixtures.
// Ключ — fixtureId.

export interface ManualStats {
  corners: number | null;
  cards: number | null; // всего жёлтых (+ красных) карточек в матче
}

const MANUAL_STATS: Record<number, ManualStats> = {
  990100: { corners: 5, cards: 2 }, // Швеция 2:2 Греция
  990101: { corners: 10, cards: 1 }, // Франция 1:2 Кот-д'Ивуар
  990102: { corners: 7, cards: 4 }, // Мексика 5:1 Сербия
  990105: { corners: null, cards: 3 }, // Румыния 1:1 Уэльс (угловые не даны)
};

export function manualStatsFor(fixtureId: number): ManualStats | null {
  return MANUAL_STATS[fixtureId] ?? null;
}
