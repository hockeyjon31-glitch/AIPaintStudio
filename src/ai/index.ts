import type { ImageGenerationProvider } from './provider';
import { OpenAIProvider } from './openaiProvider';
import { PollinationsProvider } from './pollinationsProvider';
import { GeminiProvider } from './geminiProvider';
import { HuggingFaceProvider } from './huggingfaceProvider';
import { CloudflareProvider } from './cloudflareProvider';
import { ComfyUIProvider, SDWebUIProvider } from './localSDProviders';
import type { ProviderId } from '../types';

const providers: Record<ProviderId, () => ImageGenerationProvider> = {
  pollinations: () => new PollinationsProvider(),
  openai: () => new OpenAIProvider(),
  gemini: () => new GeminiProvider(),
  huggingface: () => new HuggingFaceProvider(),
  cloudflare: () => new CloudflareProvider(),
  comfyui: () => new ComfyUIProvider(),
  sdwebui: () => new SDWebUIProvider(),
  custom: () => {
    throw new Error('Custom provider not configured yet.');
  },
};

export function getProvider(id: ProviderId): ImageGenerationProvider {
  const factory = providers[id];
  if (!factory) throw new Error(`Unknown provider: ${id}`);
  return factory();
}

export { STYLE_PRESETS, toDataUrl } from './provider';
export type { GenerateOptions, GenerateResult, ImageGenerationProvider } from './provider';

export const AVAILABLE_PROVIDERS: { id: ProviderId; label: string }[] = [
  { id: 'pollinations', label: 'Pollinations (free, no key)' },
  { id: 'comfyui', label: 'Local ComfyUI (offline, free)' },
  { id: 'sdwebui', label: 'Local SD WebUI (offline, free)' },
  { id: 'gemini', label: 'Google Gemini (free tier)' },
  { id: 'huggingface', label: 'Hugging Face (free tier)' },
  { id: 'cloudflare', label: 'Cloudflare Workers AI (free tier)' },
  { id: 'openai', label: 'OpenAI (paid)' },
];
