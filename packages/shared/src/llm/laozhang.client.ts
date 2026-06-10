// OpenAI-compatible client for the laozhang (老张) API aggregator.
// Docs: https://docs.laozhang.ai — base https://api.laozhang.ai/v1, Bearer auth.
// Single LLM provider for the prediction ensemble. Used by worker and API.

import { isParseableJson } from './json';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmRequest {
  model: string;
  messages: LlmMessage[];
  response_format?: { type: 'json_object' };
  max_tokens?: number;
  temperature?: number;
  // Только для reasoning-моделей gpt-5.x — урезает «размышления», иначе они
  // съедают весь бюджет токенов и JSON обрывается. Допустимо: low/medium/high.
  reasoning_effort?: 'low' | 'medium' | 'high';
}

interface ChatChoice {
  index: number;
  message: { role: string; content: string };
  finish_reason: string;
}

interface ChatUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface ChatResponse {
  id: string;
  model: string;
  choices: ChatChoice[];
  usage?: ChatUsage;
}

export interface ModelCallResult {
  modelId: string;
  content: string;
  tokens: number;
  latencyMs: number;
  error: string | null;
}

export class LaozhangClient {
  private readonly endpoint: string;

  constructor(
    private readonly apiKey: string,
    baseUrl = 'https://api.laozhang.ai/v1',
    private readonly timeoutMs = 60_000,
  ) {
    this.endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
  }

  async complete(request: LlmRequest): Promise<ModelCallResult> {
    const start = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(this.endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://ai-score.app',
          'X-Title': 'AI-Score Prediction Engine',
        },
        body: JSON.stringify(request),
      });

      const latencyMs = Date.now() - start;

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return {
          modelId: request.model,
          content: '',
          tokens: 0,
          latencyMs,
          error: `HTTP ${res.status}: ${body.slice(0, 200)}`,
        };
      }

      const data = (await res.json()) as ChatResponse;
      const content = data.choices[0]?.message.content ?? '';
      const tokens = data.usage?.total_tokens ?? 0;

      return { modelId: request.model, content, tokens, latencyMs, error: null };
    } catch (err) {
      return {
        modelId: request.model,
        content: '',
        tokens: 0,
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    } finally {
      clearTimeout(timer);
    }
  }

  // Fan-out to multiple models in parallel — each is an independent prediction.
  // Модели, которые ошиблись/вышли по таймауту ИЛИ вернули невалидный JSON
  // (частый случай у claude — неэкранированные символы в строках → раньше
  // карточка показывала «Модель не дала ответ»), получают до 2 ретраев.
  async fanOut(models: string[], messages: LlmMessage[]): Promise<ModelCallResult[]> {
    const MAX_ATTEMPTS = 3; // 1 основной вызов + до 2 ретраев
    // Ответ непригоден, если ошибка или из content не извлекается валидный JSON.
    const needsRetry = (r: ModelCallResult) => r.error !== null || !isParseableJson(r.content);

    const call = (model: string) => {
      // gpt-5.x — reasoning-модели: без reasoning_effort:'low' «размышления»
      // съедают весь бюджет токенов и JSON обрывается (даже при 8000 ток).
      // С 'low' gpt-5.x отдаёт полный JSON (~1300 ток вывода). Параметр шлём
      // ТОЛЬКО этим моделям — claude/deepseek/grok отвечают на него HTTP 400.
      const isGpt5 = /^gpt-5/i.test(model);
      return this.complete({
        model,
        messages,
        // 2500: запас под reasoning gpt-5.x + полный JSON по 8 рынкам.
        // Обычным моделям этот лимит не мешает (реальный вывод ~700–1400 ток).
        max_tokens: 2500,
        ...(isGpt5 ? { reasoning_effort: 'low' as const } : {}),
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });
    };

    const run = async (model: string): Promise<ModelCallResult> => {
      let r = await call(model);
      for (let attempt = 1; attempt < MAX_ATTEMPTS && needsRetry(r); attempt++) {
        r = await call(model);
      }
      return r;
    };
    return Promise.all(models.map(run));
  }
}
