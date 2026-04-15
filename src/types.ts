export type ModelCapability = 'text' | 'deep-thinking' | 'vision';

export interface Model {
  readonly id: string;
  readonly name?: string;
  readonly brand?: string;
  readonly capabilities?: readonly ModelCapability[];
  readonly isDefault?: boolean;
}

export interface BuiltinProvider {
  readonly id: string;
  readonly name: string;
  readonly baseUrl: string;
  readonly signupUrl: string;
  readonly affiliateUrl?: string;
  readonly defaultModel: string;
  readonly models: readonly Model[];
}

export interface CustomProvider {
  readonly name: string;
  readonly baseUrl: string;
  readonly models: readonly string[];
  readonly defaultModel: string;
  readonly addedAt: string;
}

export interface ResolvedProvider {
  readonly id: string;
  readonly name: string;
  readonly baseUrl: string;
  readonly signupUrl?: string;
  readonly affiliateUrl?: string;
  readonly defaultModel: string;
  readonly models: readonly string[];
  readonly userModels: readonly string[];
  readonly isCustom: boolean;
  readonly registryModels?: readonly Model[];
}

export interface DefaultSettings {
  skipDangerous: boolean;
  statusLine: boolean;
  statusLineCommand: string;
}

export interface ProviderConfig {
  defaultModel: string;
  userModels: string[];
}

export interface LastUsed {
  provider: string;
  model: string;
  timestamp: string;
}

export interface WhichCCConfig {
  version: number;
  defaults: DefaultSettings;
  providers: Record<string, ProviderConfig>;
  customProviders: Record<string, CustomProvider>;
  lastUsed?: LastUsed | null;
}

export type KeysFile = Record<string, string | null>;

export interface ModelRegistry {
  readonly version: number;
  readonly updatedAt: string;
  readonly providers: Record<string, BuiltinProvider>;
}

export type SessionEnv = Record<string, string | number>;

export interface StatusLineConfig {
  type: 'command';
  command: string;
  padding: number;
}

export interface SessionSettings {
  env: SessionEnv;
  statusLine?: StatusLineConfig;
  [key: string]: unknown;
}

export interface ParsedArgs {
  provider?: string;
  model?: string;
  apikey?: string;
  skipDangerous?: boolean;
  statusLine?: boolean;
  update: boolean;
  list: boolean;
  listCustom: boolean;
  status: boolean;
  removeKey: boolean;
  addCustom: boolean;
  removeCustom?: string;
  addModel?: string;
  removeModel?: string;
  setDefault: boolean;
  name?: string;
  url?: string;
  clean: boolean;
  noLaunch: boolean;
  dryRun: boolean;
  showTemplate: boolean;
  resetTemplate: boolean;
  version: boolean;
  help: boolean;
}
