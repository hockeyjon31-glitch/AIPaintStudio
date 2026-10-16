import type { ImageGenerationProvider, GenerateOptions, GenerateResult } from './provider';
import type { ProviderId } from '../types';

/**
 * Local ComfyUI adapter — free, unlimited, watermark-free, fully offline.
 *
 * Requires ComfyUI running locally: `python main.py` (default port 8188).
 * Uses ComfyUI's /prompt API with a standard txt2img workflow
 * (CheckpointLoader -> CLIPTextEncode x2 -> KSampler -> VAEDecode -> SaveImage).
 */
export class ComfyUIProvider implements ImageGenerationProvider {
  id: ProviderId = 'comfyui';
  label = 'Local ComfyUI (offline, free)';

  async generate(opts: GenerateOptions): Promise<GenerateResult> {
    const [width, height] = opts.size.split('x').map(Number);
    const prompt = opts.style ? `${opts.prompt}, ${opts.style}` : opts.prompt;
    const clientId = crypto.randomUUID();

    const workflow = {
      '1': {
        class_type: 'CheckpointLoaderSimple',
        inputs: { ckpt_name: 'v1-5-pruned-emaonly.safetensors' },
      },
      '2': {
        class_type: 'CLIPTextEncode',
        inputs: { text: prompt, clip: ['1', 1] },
      },
      '3': {
        class_type: 'CLIPTextEncode',
        inputs: { text: 'blurry, low quality, watermark, text', clip: ['1', 1] },
      },
      '4': {
        class_type: 'EmptyLatentImage',
        inputs: { width, height, batch_size: 1 },
      },
      '5': {
        class_type: 'KSampler',
        inputs: {
          seed: Math.floor(Math.random() * 1_000_000_000),
          steps: 20,
          cfg: 7,
          sampler_name: 'euler',
          scheduler: 'normal',
          denoise: 1,
          model: ['1', 0],
          positive: ['2', 0],
          negative: ['3', 0],
          latent_image: ['4', 0],
        },
      },
      '6': {
        class_type: 'VAEDecode',
        inputs: { samples: ['5', 0], vae: ['1', 2] },
      },
      '7': {
        class_type: 'SaveImage',
        inputs: { filename_prefix: 'AIPaintStudio', images: ['6', 0] },
      },
    };

    const queueRes = await fetch('/api/comfyui/prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflow, client_id: clientId }),
    });
    if (!queueRes.ok) {
      const text = await queueRes.text();
      throw new Error(
        `ComfyUI not reachable (${queueRes.status}). Is it running? Start it with: cd ~/ComfyUI && python main.py — ${text.slice(0, 200)}`
      );
    }
    const { prompt_id: promptId } = (await queueRes.json()) as { prompt_id: string };

    // Poll history until the image is ready
    for (let i = 0; i < 300; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const histRes = await fetch(`/api/comfyui/history/${promptId}`);
      if (!histRes.ok) continue;
      const hist = (await histRes.json()) as Record<
        string,
        { outputs?: Record<string, { images?: Array<{ filename: string; subfolder: string; type: string }> }> }
      >;
      const entry = hist[promptId];
      if (!entry?.outputs) continue;
      const imgs = Object.values(entry.outputs)
        .flatMap((o) => o.images ?? [])
        .filter((im) => im.type === 'output');
      if (imgs.length > 0) {
        const im = imgs[0];
        const imgRes = await fetch(
          `/api/comfyui/view?filename=${encodeURIComponent(im.filename)}&subfolder=${encodeURIComponent(im.subfolder)}&type=output`
        );
        const blob = await imgRes.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        return { images: [dataUrl] };
      }
    }
    throw new Error('ComfyUI took too long to generate (CPU mode is slow — try a smaller size).');
  }
}

/**
 * Local AUTOMATIC1111 SD WebUI adapter — free, unlimited, watermark-free.
 *
 * Requires SD WebUI running with: `./webui.sh --api` (default port 7860).
 */
export class SDWebUIProvider implements ImageGenerationProvider {
  id: ProviderId = 'sdwebui';
  label = 'Local SD WebUI (offline, free)';

  async generate(opts: GenerateOptions): Promise<GenerateResult> {
    const [width, height] = opts.size.split('x').map(Number);
    const prompt = opts.style ? `${opts.prompt}, ${opts.style}` : opts.prompt;

    const res = await fetch('/api/sdwebui/sdapi/v1/txt2img', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        negative_prompt: 'blurry, low quality, watermark, text',
        width,
        height,
        steps: 20,
        cfg_scale: 7,
        sampler_name: 'Euler a',
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `SD WebUI not reachable (${res.status}). Start it with: cd ~/stable-diffusion-webui && ./webui.sh --api — ${text.slice(0, 200)}`
      );
    }
    const json = (await res.json()) as { images?: string[] };
    if (!json.images?.length) throw new Error('SD WebUI returned no image.');
    return { images: [`data:image/png;base64,${json.images[0]}`] };
  }
}
