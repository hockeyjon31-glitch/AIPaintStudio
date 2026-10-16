import type { ProviderId } from '../types';

const STORAGE_KEY = 'aipaintstudio.apikeys';

type KeyMap = Partial<Record<ProviderId, string>>;

function readAll(): KeyMap {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as KeyMap;
  } catch {
    return {};
  }
}

export function getApiKey(provider: ProviderId): string {
  return readAll()[provider] ?? '';
}

export function setApiKey(provider: ProviderId, key: string): void {
  const all = readAll();
  if (key) all[provider] = key;
  else delete all[provider];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

/** Providers that need a key before they can generate. */
export const KEY_PROVIDERS: ProviderId[] = ['openai', 'gemini', 'huggingface', 'cloudflare'];
