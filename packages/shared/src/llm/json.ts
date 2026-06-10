// Извлечение и «ремонт» JSON из ответа LLM. Модели иногда оборачивают ответ в
// markdown, оставляют хвостовые запятые или не экранируют переводы строк внутри
// строковых значений — из-за чего JSON.parse падает и модель помечается как
// «не давшая ответ». Здесь — устойчивый разбор с парой типовых починок.

/** Вырезает первый сбалансированный JSON-объект из текста (срезая markdown). */
export function extractJsonObject(raw: string): string {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1]!.trim();
  const start = s.indexOf('{');
  if (start === -1) return s;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i]!;
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') inStr = true;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return s.slice(start, i + 1);
  }
  return s.slice(start);
}

// Типовые починки: экранирование «голых» управляющих символов внутри строк и
// удаление хвостовых запятых перед } или ].
function repairJson(s: string): string {
  let out = '', inStr = false, esc = false;
  for (const ch of s) {
    if (inStr) {
      if (esc) { out += ch; esc = false; continue; }
      if (ch === '\\') { out += ch; esc = true; continue; }
      if (ch === '"') { inStr = false; out += ch; continue; }
      if (ch === '\n') { out += '\\n'; continue; }
      if (ch === '\r') { out += '\\r'; continue; }
      if (ch === '\t') { out += '\\t'; continue; }
      out += ch;
    } else {
      if (ch === '"') inStr = true;
      out += ch;
    }
  }
  return out.replace(/,(\s*[}\]])/g, '$1');
}

/** Разбирает JSON из ответа LLM, при ошибке пробует починенную версию. */
export function parseJsonLoose(raw: string): unknown {
  const s = extractJsonObject(raw);
  try {
    return JSON.parse(s);
  } catch {
    return JSON.parse(repairJson(s));
  }
}

/** true, если из ответа удаётся извлечь валидный JSON-объект. */
export function isParseableJson(raw: string): boolean {
  if (!raw || !raw.includes('{')) return false;
  try {
    parseJsonLoose(raw);
    return true;
  } catch {
    return false;
  }
}
