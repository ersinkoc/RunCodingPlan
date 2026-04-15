import type { ResolvedProvider, WhichCCConfig } from '../types.js';
import { getBuiltinProvider, getAllBuiltinProviders } from './registry.js';

export function resolveProvider(
  id: string,
  config: WhichCCConfig,
): ResolvedProvider | null {
  const builtin = getBuiltinProvider(id);
  if (builtin) {
    const providerCfg = config.providers[id];
    const userModels = providerCfg?.userModels ?? [];
    const registryModelIds = builtin.models.map((m) => m.id);
    const mergedModels = [...registryModelIds, ...userModels.filter((m) => !registryModelIds.includes(m))];
    const defaultModel =
      providerCfg?.defaultModel && mergedModels.includes(providerCfg.defaultModel)
        ? providerCfg.defaultModel
        : builtin.defaultModel;
    return {
      id: builtin.id,
      name: builtin.name,
      baseUrl: builtin.baseUrl,
      signupUrl: builtin.signupUrl,
      affiliateUrl: builtin.affiliateUrl,
      defaultModel,
      models: mergedModels,
      userModels: [...userModels],
      isCustom: false,
      registryModels: builtin.models,
    };
  }

  const custom = config.customProviders[id];
  if (custom) {
    return {
      id,
      name: custom.name,
      baseUrl: custom.baseUrl,
      defaultModel: custom.defaultModel,
      models: [...custom.models],
      userModels: [...custom.models],
      isCustom: true,
    };
  }

  return null;
}

export function resolveAllProviders(config: WhichCCConfig): ResolvedProvider[] {
  const result: ResolvedProvider[] = [];
  for (const builtin of getAllBuiltinProviders()) {
    const resolved = resolveProvider(builtin.id, config);
    if (resolved) result.push(resolved);
  }
  for (const id of Object.keys(config.customProviders)) {
    const resolved = resolveProvider(id, config);
    if (resolved) result.push(resolved);
  }
  return result;
}

export function getBuiltinResolved(config: WhichCCConfig): ResolvedProvider[] {
  return resolveAllProviders(config).filter((p) => !p.isCustom);
}

export function getCustomResolved(config: WhichCCConfig): ResolvedProvider[] {
  return resolveAllProviders(config).filter((p) => p.isCustom);
}
