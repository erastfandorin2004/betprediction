// OpenAI-compatible client for the laozhang (老张) API aggregator.
// Docs: https://docs.laozhang.ai — base https://api.laozhang.ai/v1, Bearer auth.
// Single LLM provider for the prediction ensemble. Used by worker and API.

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
  // Models that error/time out (slower ones like deepseek) get one retry.
  async fanOut(models: string[], messages: LlmMessage[]): Promise<ModelCallResult[]> {
    const call = (model: string) =>
      this.complete({
        model,
        messages,
        // 1600, чтобы gpt-5.5 не обрезал ответ на длину (на 1100 отдавал
        // усечённый JSON и выпадал из ансамбля).
        max_tokens: 1600,
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

    const results = await Promise.all(models.map(call));
    return Promise.all(
      results.map((r) => (r.error ? call(r.modelId) : Promise.resolve(r))),
    );
  }
}
