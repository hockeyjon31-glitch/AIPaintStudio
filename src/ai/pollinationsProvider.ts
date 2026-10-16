import type { ImageGenerationProvider, GenerateOptions, GenerateResult } from './provider';
import type { ProviderId } from '../types';

/**
 * Pollinations.ai adapter — completely FREE, no API key, no signup.
 *
 * Uses the simple GET endpoint: https://image.pollinations.ai/prompt/{prompt}
 * Supported models include 'flux' (quality) and 'turbo' (fast).
 */
export class PollinationsProvider implements ImageGenerationProvider {
  id: ProviderId = 'pollinations';
  label = 'Pollinations (free, no key)';

  async generate(opts: GenerateOptions): Promise<GenerateResult> {
    const [w, h] = opts.size.split('x').map(Number);
    const fullPrompt = opts.style
      ? `${opts.prompt}, ${opts.style}`
      : opts.prompt;
    const params = new URLSearchParams({
      width: String(w),
      height: String(h),
      model: 'flux',
      nologo: 'true',
      seed: String(Math.floor(Math.random() * 1_000_000)),
    });
    const url = `/api/pollinations/prompt/${encodeURIComponent(fullPrompt)}?${params}`;

    const fetchWithTimeout = async (ms: number): Promise<Response> => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), ms);
      try {
        return await fetch(url, { signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }
    };

    // Free tier allows 1 image per 45s per IP — retry automatically once.
    // 503 usually means the free flux model is busy; retry after a short wait.
    let res: Response;
    try {
      res = await fetchWithTimeout(90_000);
      if (res.status === 402 || res.status === 429) {
        await new Promise((r) => setTimeout(r, 46_000));
        res = await fetchWithTimeout(90_000);
      } else if (res.status === 503 || res.status === 502 || res.status === 504) {
        await new Promise((r) => setTimeout(r, 10_000));
        res = await fetchWithTimeout(90_000);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error('Pollinations timed out (the free model is busy). Try again, or switch provider.');
      }
      throw err;
    }
    if (!res.ok) {
      if (res.status === 402 || res.status === 429) {
        throw new Error('Free tier limit reached (1 image / 45s). Wait a moment and try again.');
      }
      if (res.status === 503 || res.status === 502 || res.status === 504) {
        throw new Error('Pollinations free model is overloaded right now (503). Try again shortly, or use Gemini/Hugging Face/Cloudflare.');
      }
      throw new Error(`Pollinations request failed (${res.status}). Try again in a moment.`);
    }
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return { images: [dataUrl] };
  }
}
