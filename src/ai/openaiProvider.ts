import type { ImageGenerationProvider, GenerateOptions, GenerateResult } from './provider';
import type { ProviderId } from '../types';

/**
 * OpenAI GPT-image / DALL·E adapter.
 *
 * Requests go through the Vite dev proxy (`/api/openai` -> api.openai.com) to
 * avoid CORS problems. The proxy injects the Authorization header from the
 * OPENAI_API_KEY env var, so the key never lives in the browser bundle.
 */
export class OpenAIProvider implements ImageGenerationProvider {
  id: ProviderId = 'openai';
  label = 'OpenAI (GPT-image)';

  async generate(opts: GenerateOptions): Promise<GenerateResult> {
    const res = await fetch('/api/openai/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: opts.style
          ? `${opts.prompt}. Style: ${opts.style}`
          : opts.prompt,
        size: opts.size,
        n: opts.n ?? 1,
        ...(opts.transparent ? { background: 'transparent' } : {}),
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenAI request failed (${res.status}): ${text.slice(0, 300)}`);
    }
    const json = (await res.json()) as { data: Array<{ url?: string; b64_json?: string }> };
    const images = json.data.map((d) =>
      d.b64_json ? `data:image/png;base64,${d.b64_json}` : d.url!
    );
    return { images };
  }
}
