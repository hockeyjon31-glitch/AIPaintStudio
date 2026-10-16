import { useState } from 'react';
import { useEditor } from '../store/editorStore';
import { getProvider, STYLE_PRESETS, toDataUrl } from '../ai';
import { getApiKey, setApiKey } from '../ai/keys';
import type { ImageSize, ProviderId } from '../types';

interface GalleryItem {
  url: string;
  prompt: string;
}

/** Providers that require a user-supplied API key. */
const NEEDS_KEY: Partial<Record<ProviderId, string>> = {
  gemini: 'Google AI Studio key (free) — aistudio.google.com/apikey',
  huggingface: 'Hugging Face token (free) — huggingface.co/settings/tokens',
  cloudflare: 'Cloudflare API token (free) — dash.cloudflare.com',
};

export default function AIPromptPanel() {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState(STYLE_PRESETS[0].suffix);
  const [size, setSize] = useState<ImageSize>('1024x1024');
  const [transparent, setTransparent] = useState(false);
  const [provider, setProvider] = useState<ProviderId>('pollinations');
  const [apiKey, setApiKeyState] = useState('');
  const [cfAccount, setCfAccount] = useState(localStorage.getItem('aipaintstudio.cfaccount') ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const addImageLayer = useEditor((s) => s.addImageLayer);

  const hasKey = !NEEDS_KEY[provider] || !!getApiKey(provider);

  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const p = getProvider(provider);
      const preset = STYLE_PRESETS.find((s) => s.suffix === style);
      const res = await p.generate({
        prompt,
        size,
        style: preset?.suffix || undefined,
        transparent,
        n: 1,
      });
      const items = await Promise.all(
        res.images.map(async (url) => ({ url: await toDataUrl(url), prompt }))
      );
      setGallery((g) => [...items, ...g].slice(0, 24));
      setHistory((h) => [prompt, ...h.filter((p) => p !== prompt)].slice(0, 8));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel ai-panel">
      <div className="panel-title">✨ AI Prompt</div>
      <textarea
        className="ai-prompt-input"
        placeholder="Describe the image or icon to generate… e.g. 'a friendly robot mascot head, glowing blue eyes'"
        value={prompt}
        rows={3}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void generate();
        }}
      />
      <div className="ai-controls">
        <select value={style} onChange={(e) => setStyle(e.target.value)}>
          {STYLE_PRESETS.map((s) => (
            <option key={s.label} value={s.suffix}>
              {s.label}
            </option>
          ))}
        </select>
        <select value={size} onChange={(e) => setSize(e.target.value as ImageSize)}>
          <option value="256x256">256px</option>
          <option value="512x512">512px</option>
          <option value="1024x1024">1024px</option>
        </select>
      </div>
      <div className="ai-controls">
        <label className="check-label">
          <input
            type="checkbox"
            checked={transparent}
            onChange={(e) => setTransparent(e.target.checked)}
          />
          Transparent bg
        </label>
        <select
          value={provider}
          onChange={(e) => {
            setProvider(e.target.value as ProviderId);
            setApiKeyState('');
          }}
        >
          <option value="pollinations">Pollinations (free)</option>
          <option value="gemini">Gemini (free tier)</option>
          <option value="huggingface">Hugging Face (free tier)</option>
          <option value="cloudflare">Cloudflare (free tier)</option>
          <option value="openai">OpenAI (paid)</option>
        </select>
      </div>
      {NEEDS_KEY[provider] && (
        <div className="key-group">
          <input
            type="password"
            placeholder={NEEDS_KEY[provider]}
            value={apiKey}
            onChange={(e) => setApiKeyState(e.target.value)}
          />
          <button
            onClick={() => {
              setApiKey(provider, apiKey.trim());
              if (provider === 'cloudflare') {
                localStorage.setItem('aipaintstudio.cfaccount', cfAccount.trim());
                setCfAccount(cfAccount.trim());
              }
              setApiKeyState('');
              setError(null);
            }}
            disabled={!apiKey.trim()}
          >
            Save
          </button>
          {getApiKey(provider) && <span className="key-ok">✓ saved</span>}
          {provider === 'cloudflare' && (
            <input
              type="text"
              placeholder="Cloudflare Account ID"
              value={cfAccount}
              onChange={(e) => setCfAccount(e.target.value)}
            />
          )}
        </div>
      )}
      <button
        className="ai-generate-btn"
        disabled={loading || !prompt.trim() || !hasKey}
        onClick={() => void generate()}
      >
        {loading ? 'Generating…' : 'Generate (Ctrl+Enter)'}
      </button>
      {error && <div className="ai-error">{error}</div>}

      {history.length > 0 && (
        <div className="ai-history">
          {history.map((h) => (
            <button key={h} onClick={() => setPrompt(h)} title={h}>
              {h.slice(0, 40)}
            </button>
          ))}
        </div>
      )}

      <div className="panel-title">Results</div>
      <div className="ai-gallery">
        {gallery.length === 0 && <div className="dim">Generated images will appear here.</div>}
        {gallery.map((item, i) => (
          <div key={i} className="gallery-item">
            <img src={item.url} alt={item.prompt} />
            <div className="gallery-actions">
              <button onClick={() => void addImageLayer(item.url)}>＋ Layer</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
