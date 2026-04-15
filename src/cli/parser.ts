import type { ParsedArgs } from '../types.js';

const FLAG_ALIASES: Record<string, string> = {
  '-p': '--provider',
  '-m': '--model',
  '-a': '--apikey',
  '-sd': '--skip-dangerous',
  '-sl': '--statusline',
  '-u': '--update',
  '-l': '--list',
  '-v': '--version',
  '-h': '--help',
};

const STRING_FLAGS = new Set([
  '--provider',
  '--model',
  '--apikey',
  '--remove-custom',
  '--add-model',
  '--remove-model',
  '--name',
  '--url',
]);

const BOOLEAN_FLAGS = new Set([
  '--skip-dangerous',
  '--statusline',
  '--update',
  '--list',
  '--list-custom',
  '--status',
  '--remove-key',
  '--add-custom',
  '--set-default',
  '--clean',
  '--no-launch',
  '--dry-run',
  '--show-template',
  '--reset-template',
  '--version',
  '--help',
]);

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const result: ParsedArgs = {
    update: false,
    list: false,
    listCustom: false,
    status: false,
    removeKey: false,
    addCustom: false,
    setDefault: false,
    clean: false,
    noLaunch: false,
    dryRun: false,
    showTemplate: false,
    resetTemplate: false,
    version: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const rawArg = argv[i];
    /* c8 ignore next -- defensive guard; for-loop bounds prevent undefined */
    if (rawArg === undefined) continue;
    let arg = rawArg;
    const alias = FLAG_ALIASES[arg];
    if (alias) arg = alias;

    if (!arg.startsWith('--')) {
      throw new ParseError(`Unknown argument: ${rawArg}`);
    }

    if (BOOLEAN_FLAGS.has(arg)) {
      setBool(result, arg, true);
      continue;
    }

    if (STRING_FLAGS.has(arg)) {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('-')) {
        throw new ParseError(`Flag ${arg} requires a value`);
      }
      setString(result, arg, next);
      i++;
      continue;
    }

    throw new ParseError(`Unknown flag: ${arg}`);
  }

  return result;
}

function setBool(result: ParsedArgs, flag: string, value: boolean): void {
  switch (flag) {
    case '--skip-dangerous':
      result.skipDangerous = value;
      break;
    case '--statusline':
      result.statusLine = value;
      break;
    case '--update':
      result.update = value;
      break;
    case '--list':
      result.list = value;
      break;
    case '--list-custom':
      result.listCustom = value;
      break;
    case '--status':
      result.status = value;
      break;
    case '--remove-key':
      result.removeKey = value;
      break;
    case '--add-custom':
      result.addCustom = value;
      break;
    case '--set-default':
      result.setDefault = value;
      break;
    case '--clean':
      result.clean = value;
      break;
    case '--no-launch':
      result.noLaunch = value;
      break;
    case '--dry-run':
      result.dryRun = value;
      break;
    case '--show-template':
      result.showTemplate = value;
      break;
    case '--reset-template':
      result.resetTemplate = value;
      break;
    case '--version':
      result.version = value;
      break;
    case '--help':
      result.help = value;
      break;
  }
}

function setString(result: ParsedArgs, flag: string, value: string): void {
  switch (flag) {
    case '--provider':
      result.provider = value;
      break;
    case '--model':
      result.model = value;
      break;
    case '--apikey':
      result.apikey = value;
      break;
    case '--remove-custom':
      result.removeCustom = value;
      break;
    case '--add-model':
      result.addModel = value;
      break;
    case '--remove-model':
      result.removeModel = value;
      break;
    case '--name':
      result.name = value;
      break;
    case '--url':
      result.url = value;
      break;
  }
}
