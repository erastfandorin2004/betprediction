export interface ORouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ORouterRequest {
  model: string;
  messages: ORouterMessage[];
  response_format?: { type: 'json_object' };
  max_tokens?: number;
  temperature?: number;
}

interface ORouterChoice {
  index: number;
  message: { role: string; content: string };
  finish_reason: string;
}

interface ORouterUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface ORouterResponse {
  id: string;
  model: string;
  choices: ORouterChoice[];
  usage?: ORouterUsage;
}

export interface ModelCallResult {
  modelId: string;
  content: string;
  tokens: number;
  latencyMs: number;
  error: string | null;
}

export class OpenRouterClient {
  private static readonly BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

  constructor(
    private readonly apiKey: string,
    private readonly timeoutMs = 30_000,
  ) {}

  async complete(request: ORouterRequest): Promise<ModelCallResult> {
    const start = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(OpenRouterClient.BASE_URL, {
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

      const data = (await res.json()) as ORouterResponse;
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

  // Fan-out to multiple models in parallel
  async fanOut(models: string[], messages: ORouterMessage[]): Promise<ModelCallResult[]> {
    const requests = models.map((model) =>
      this.complete({
        model,
        messages,
        response_format: { type: 'json_object' },
        max_tokens: 600,
        temperature: 0.3,
      }),
    );
    return Promise.all(requests);
  }
}
