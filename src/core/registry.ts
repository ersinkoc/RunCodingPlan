import type { BuiltinProvider, ModelRegistry } from '../types.js';
import { readFileSync, existsSync } from 'node:fs';
import { REGISTRY_CACHE_PATH } from '../constants.js';

export const BUILTIN_PROVIDERS: Record<string, BuiltinProvider> = {
  zai: {
    id: 'zai',
    name: 'ZAI (Zhipu AI)',
    baseUrl: 'https://api.z.ai/api/anthropic',
    signupUrl: 'https://z.ai/subscribe',
    affiliateUrl: 'https://bit.ly/4tJ4GLP',
    defaultModel: 'glm-5.1',
    models: [
      { id: 'glm-5.1', name: 'GLM 5.1', capabilities: ['text', 'deep-thinking'], isDefault: true },
      { id: 'glm-5', name: 'GLM 5', capabilities: ['text', 'deep-thinking'] },
      { id: 'glm-5-turbo', name: 'GLM 5 Turbo', capabilities: ['text'] },
    ],
  },
  kimi: {
    id: 'kimi',
    name: 'Kimi (Moonshot AI)',
    baseUrl: 'https://api.kimi.com/coding/',
    signupUrl: 'https://kimi.com/code',
    defaultModel: 'kimi-k2.6-code-preview',
    models: [
      {
        id: 'kimi-k2.6-code-preview',
        name: 'Kimi K2.6 Code Preview',
        capabilities: ['text', 'deep-thinking', 'vision'],
        isDefault: true,
      },
      {
        id: 'kimi-k2.5',
        name: 'Kimi K2.5',
        capabilities: ['text', 'deep-thinking', 'vision'],
      },
    ],
  },
  minimax: {
    id: 'minimax',
    name: 'MiniMax',
    baseUrl: 'https://api.minimax.io/anthropic',
    signupUrl: 'https://platform.minimax.io/subscribe/token-plan',
    affiliateUrl: 'https://bit.ly/4tgh1rh',
    defaultModel: 'MiniMax-M2.7',
    models: [
      {
        id: 'MiniMax-M2.7',
        name: 'MiniMax M2.7',
        capabilities: ['text', 'deep-thinking'],
        isDefault: true,
      },
      {
        id: 'MiniMax-M2.5',
        name: 'MiniMax M2.5',
        capabilities: ['text', 'deep-thinking'],
      },
    ],
  },
  alibaba: {
    id: 'alibaba',
    name: 'Alibaba ',
    baseUrl: 'https://coding-intl.dashscope.aliyuncs.com/apps/anthropic',
    signupUrl: 'https://www.alibabacloud.com/en/campaign/ai-scene-coding',
    defaultModel: 'qwen3.6-plus',
    models: [
      {
        id: 'qwen3.6-plus',
        name: 'Qwen 3.6 Plus',
        brand: 'Qwen',
        capabilities: ['text', 'deep-thinking', 'vision'],
        isDefault: true,
      },
      {
        id: 'qwen3.5-plus',
        name: 'Qwen 3.5 Plus',
        brand: 'Qwen',
        capabilities: ['text', 'deep-thinking', 'vision'],
      },
      {
        id: 'qwen3-max-2026-01-23',
        name: 'Qwen 3 Max',
        brand: 'Qwen',
        capabilities: ['text', 'deep-thinking'],
      },
      {
        id: 'qwen3-coder-next',
        name: 'Qwen 3 Coder Next',
        brand: 'Qwen',
        capabilities: ['text'],
      },
      {
        id: 'qwen3-coder-plus',
        name: 'Qwen 3 Coder Plus',
        brand: 'Qwen',
        capabilities: ['text'],
      },
      { id: 'glm-5', name: 'GLM 5', brand: 'Zhipu', capabilities: ['text', 'deep-thinking'] },
      { id: 'glm-4.7', name: 'GLM 4.7', brand: 'Zhipu', capabilities: ['text', 'deep-thinking'] },
      {
        id: 'kimi-k2.5',
        name: 'Kimi K2.5',
        brand: 'Kimi',
        capabilities: ['text', 'deep-thinking', 'vision'],
      },
      {
        id: 'MiniMax-M2.5',
        name: 'MiniMax M2.5',
        brand: 'MiniMax',
        capabilities: ['text', 'deep-thinking'],
      },
    ],
  },
};

function mergeWithLocalAffiliate(id: string, cached: BuiltinProvider): BuiltinProvider {
  const local = BUILTIN_PROVIDERS[id];
  return {
    ...cached,
    affiliateUrl: cached.affiliateUrl ?? local?.affiliateUrl,
    signupUrl: cached.signupUrl ?? local?.signupUrl,
  };
}

export function getBuiltinProvider(id: string): BuiltinProvider | undefined {
  const cached = loadCachedRegistry();
  if (cached && cached.providers[id]) {
    return mergeWithLocalAffiliate(id, cached.providers[id]);
  }
  return BUILTIN_PROVIDERS[id];
}

export function getAllBuiltinProviders(): BuiltinProvider[] {
  const cached = loadCachedRegistry();
  if (cached) {
    const merged: Record<string, BuiltinProvider> = { ...BUILTIN_PROVIDERS };
    for (const [id, p] of Object.entries(cached.providers)) {
      merged[id] = mergeWithLocalAffiliate(id, p);
    }
    return Object.values(merged);
  }
  return Object.values(BUILTIN_PROVIDERS);
}

export function loadCachedRegistry(): ModelRegistry | null {
  try {
    if (!existsSync(REGISTRY_CACHE_PATH)) return null;
    const raw = readFileSync(REGISTRY_CACHE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidRegistry(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isValidRegistry(data: unknown): data is ModelRegistry {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  if (typeof obj['version'] !== 'number') return false;
  if (typeof obj['updatedAt'] !== 'string') return false;
  if (!obj['providers'] || typeof obj['providers'] !== 'object') return false;
  const providers = obj['providers'] as Record<string, unknown>;
  for (const [, p] of Object.entries(providers)) {
    if (!p || typeof p !== 'object') return false;
    const prov = p as Record<string, unknown>;
    if (typeof prov['name'] !== 'string') return false;
    if (typeof prov['baseUrl'] !== 'string') return false;
    if (typeof prov['defaultModel'] !== 'string') return false;
    if (!Array.isArray(prov['models'])) return false;
  }
  return true;
}
