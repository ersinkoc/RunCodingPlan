import { join } from 'node:path';
import { homedir } from 'node:os';

export const VERSION = '1.0.0';

const HOME_OVERRIDE = process.env['WHICHCC_HOME_DIR'];
export const CLAUDE_DIR = HOME_OVERRIDE
  ? join(HOME_OVERRIDE, '.claude')
  : join(homedir(), '.claude');
export const WHICHCC_DIR = join(CLAUDE_DIR, '.whichcc');
export const CONFIG_PATH = join(WHICHCC_DIR, 'config.json');
export const KEYS_PATH = join(WHICHCC_DIR, 'keys.json');
export const REGISTRY_CACHE_PATH = join(WHICHCC_DIR, 'registry.json');
export const TEMPLATE_PATH = join(WHICHCC_DIR, 'template.json');
export const SESSION_PREFIX = 'whichcc-';

export const REGISTRY_URL =
  'https://raw.githubusercontent.com/ersinkoc/whichcc/main/registry/models.json';

export const RESERVED_PROVIDER_IDS = ['zai', 'kimi', 'minimax', 'alibaba'] as const;
export type ReservedProviderId = (typeof RESERVED_PROVIDER_IDS)[number];

export const DEFAULT_STATUS_LINE_COMMAND = 'npx -y ccstatusline@latest';
export const DEFAULT_TIMEOUT_MS = '3000000';
export const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export const ENCRYPTION_PREFIX = 'enc:v1:aes256gcm:';
export const ENCRYPTION_SALT = 'whichcc-salt';
export const PBKDF2_ITERATIONS = 100_000;

export const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  underline: '\x1b[4m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  clearLine: '\x1b[2K',
  cursorUp: (n: number): string => `\x1b[${n}A`,
  cursorDown: (n: number): string => `\x1b[${n}B`,
  cursorHide: '\x1b[?25l',
  cursorShow: '\x1b[?25h',
} as const;

export const BOX = {
  topLeft: '┌',
  topRight: '┐',
  bottomLeft: '└',
  bottomRight: '┘',
  horizontal: '─',
  vertical: '│',
  teeRight: '├',
  teeLeft: '┤',
} as const;
