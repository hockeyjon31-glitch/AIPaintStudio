import type { ImageGenerationProvider, GenerateOptions, GenerateResult } from './provider';
import type { ProviderId } from '../types';
import { getApiKey } from './keys';

/**
 * Google Gemini (AI Studio) adapter — free tier available with a key from
 * https://aistudio.google.com/apikey. Uses the gemini-2.5-flash-image model
 * ("nano banana"), which returns inline base64 images.
 */
export class GeminiProvider implements ImageGenerationProvider {
  id: ProviderId = 'gemini';
  label = 'Google Gemini (free tier)';

  async generate(opts: GenerateOptions): Promise<GenerateResult> {
    const key = getApiKey('gemini');
    if (!key) throw new Error('Add your Google AI Studio API key in the key field above.');

    const fullPrompt = opts.style ? `${opts.prompt}. Style: ${opts.style}` : opts.prompt;
    const res = await fetch('/api/gemini/v1beta/models/gemini-2.5-flash-image:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { responseModalities: ['IMAGE'] },
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Gemini request failed (${res.status}): ${text.slice(0, 300)}`);
    }
    const json = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ inlineData?: { mimeType: string; data: string } }> };
      }>;
    };
    const parts = json.candidates?.[0]?.content?.parts ?? [];
    const images = parts
      .filter((p) => p.inlineData)
      .map((p) => `data:${p.inlineData!.mimeType};base64,${p.inlineData!.data}`);
    if (images.length === 0) throw new Error('Gemini returned no image (try rephrasing the prompt).');
    return { images };
  }
}
