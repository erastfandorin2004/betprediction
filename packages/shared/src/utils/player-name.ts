// Унификация имён игроков из ответов разных LLM. Модели иногда возвращают
// одного и того же футболиста то латиницей («Jamal Musiala»), то кириллицей
// («Джамал Мусиала») — без нормализации это даёт дубли в списке бомбардиров.
// Здесь: романизация кириллицы → латиница, проверка алфавита и слияние
// бомбардиров с предпочтением латинского написания для отображения.

const CYR_DIGRAPHS: [string, string][] = [
  ['щ', 'shch'], ['ж', 'zh'], ['х', 'kh'], ['ц', 'ts'],
  ['ч', 'ch'], ['ш', 'sh'], ['ю', 'yu'], ['я', 'ya'], ['ё', 'e'],
];
const CYR_SINGLE: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', ъ: '', ы: 'y', ь: '', э: 'e',
};

/** Фонетическая романизация кириллицы в латиницу (lowercase-результат). */
export function romanizeCyrillic(input: string): string {
  let s = input.toLowerCase();
  for (const [c, l] of CYR_DIGRAPHS) s = s.split(c).join(l);
  let out = '';
  for (const ch of s) out += CYR_SINGLE[ch] ?? ch;
  return out;
}

/** true, если в имени нет кириллицы. */
export function isLatinName(name: string): boolean {
  return !/[а-яёА-ЯЁ]/.test(name);
}

/** Нормализованная латинская форма: романизация + без диакритики, только [a-z0-9 ]. */
export function romanizeNormalized(name: string): string {
  const noDiacritics = name.normalize('NFD').replace(/[̀-ͯ]/g, '');
  return romanizeCyrillic(noDiacritics)
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Фамилия для слияния: последний значимый токен (≥4 символов), чтобы не
// схлопывать разных игроков по коротким общим слогам (напр. корейские имена).
function surnameToken(normalized: string): string {
  const toks = normalized.split(' ').filter((t) => t.length >= 4);
  return toks.length ? toks[toks.length - 1]! : '';
}

/** Имя в Title Case для отображения (используется при романизации кириллицы). */
function titleCase(s: string): string {
  return s.replace(/\b([a-z])/g, (_, c: string) => c.toUpperCase());
}

export interface RawScorer {
  name: string;
  team: 'home' | 'away';
  position?: string | null;
  probability?: number | null;
}
export interface MergedScorer {
  name: string;
  team: 'home' | 'away';
  position: string | null;
  weight: number;
}

// Сливает бомбардиров из всех ответов моделей: одинаковые игроки (в т.ч.
// записанные в разных алфавитах) объединяются, веса суммируются. Для показа
// берём латинское написание; чисто кириллическое имя романизируем в латиницу.
export function mergeScorers(all: RawScorer[]): MergedScorer[] {
  interface Acc extends MergedScorer { key: string; sur: string; latin: boolean }
  const accs: Acc[] = [];

  for (const s of all) {
    if (!s?.name) continue;
    const key = romanizeNormalized(s.name);
    if (!key) continue;
    const sur = surnameToken(key);
    const latin = isLatinName(s.name);
    const w = s.probability || 0.3;

    const e = accs.find((a) => a.key === key || (sur !== '' && a.sur === sur));
    if (e) {
      e.weight += w;
      if (!e.position && s.position) e.position = s.position;
      // Предпочитаем латинское написание для отображения.
      if (!e.latin && latin) { e.name = s.name; e.latin = true; }
    } else {
      const display = latin ? s.name : titleCase(romanizeCyrillic(s.name.normalize('NFD').replace(/[̀-ͯ]/g, '')));
      accs.push({ name: display, team: s.team, position: s.position || null, weight: w, key, sur, latin });
    }
  }

  return accs.map(({ name, team, position, weight }) => ({ name, team, position, weight }));
}
