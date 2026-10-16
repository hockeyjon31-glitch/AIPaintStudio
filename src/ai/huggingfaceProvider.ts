import type { ImageGenerationProvider, GenerateOptions, GenerateResult } from './provider';
import type { ProviderId } from '../types';
import { getApiKey } from './keys';

const DEFAULT_MODEL = 'stabilityai/stable-diffusion-xl-base-1.0';

/**
 * Hugging Face Inference adapter — free monthly credits with an account token
 * from https://huggingface.co/settings/tokens.
 */
export class HuggingFaceProvider implements ImageGenerationProvider {
  id: ProviderId = 'huggingface';
  label = 'Hugging Face (free tier)';

  async generate(opts: GenerateOptions): Promise<GenerateResult> {
    const key = getApiKey('huggingface');
    if (!key) throw new Error('Add your Hugging Face token in the key field above.');

    const fullPrompt = opts.style ? `${opts.prompt}, ${opts.style}` : opts.prompt;
    const [w, h] = opts.size.split('x').map(Number);
    const res = await fetch(`/api/huggingface/${DEFAULT_MODEL}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Accept: 'image/png',
      },
      body: JSON.stringify({
        inputs: fullPrompt,
        parameters: { width: Math.min(w, 1024), height: Math.min(h, 1024) },
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Hugging Face request failed (${res.status}): ${text.slice(0, 300)}`);
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
