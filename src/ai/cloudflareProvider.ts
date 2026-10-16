import type { ImageGenerationProvider, GenerateOptions, GenerateResult } from './provider';
import type { ProviderId } from '../types';
import { getApiKey } from './keys';

const MODEL = '@cf/black-forest-labs/flux-1-schnell';

function accountId(): string {
  return localStorage.getItem('aipaintstudio.cfaccount') ?? '';
}

/**
 * Cloudflare Workers AI adapter — free daily allocation (neurons) with an
 * account ID + API token from https://dash.cloudflare.com (AI > API tokens).
 */
export class CloudflareProvider implements ImageGenerationProvider {
  id: ProviderId = 'cloudflare';
  label = 'Cloudflare Workers AI (free tier)';

  async generate(opts: GenerateOptions): Promise<GenerateResult> {
    const key = getApiKey('cloudflare');
    const account = accountId();
    if (!key) throw new Error('Add your Cloudflare API token in the key field above.');
    if (!account) throw new Error('Add your Cloudflare Account ID in the key field above.');

    const fullPrompt = opts.style ? `${opts.prompt}. Style: ${opts.style}` : opts.prompt;
    const res = await fetch(`/api/cloudflare/client/v4/accounts/${account}/ai/run/${MODEL}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: fullPrompt, steps: 4 }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Cloudflare request failed (${res.status}): ${text.slice(0, 300)}`);
    }
    const json = (await res.json()) as {
      success?: boolean;
      errors?: Array<{ message: string }>;
      result?: { image?: string };
    };
    if (!json.success || !json.result?.image) {
      throw new Error(json.errors?.[0]?.message ?? 'Cloudflare returned no image.');
    }
    return { images: [`data:image/png;base64,${json.result.image}`] };
  }
}
