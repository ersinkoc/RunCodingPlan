import { spawn, execFileSync } from 'node:child_process';
import { platform } from 'node:os';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ANSI } from '../constants.js';
import { removeSessionFile } from './session.js';

export interface LaunchOptions {
  sessionPath: string;
  skipDangerous: boolean;
}

export function resolveClaudeBinary(): string {
  const override = process.env['WHICHCLAUDE_CLAUDE_BIN'];
  if (override && existsSync(override)) return override;

  const isWindows = platform() === 'win32';
  const names = isWindows ? ['claude.exe', 'claude.cmd', 'claude.ps1', 'claude'] : ['claude'];

  for (const name of names) {
    try {
      const locator = isWindows ? 'where.exe' : 'which';
      const out = execFileSync(locator, [name], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      const first = out.split(/\r?\n/)[0];
      if (first && existsSync(first)) return first;
    } catch {
      // not on PATH — try next name / fall through to common locations
    }
  }

  if (isWindows) {
    const candidates = [
      join(process.env['USERPROFILE'] ?? '', '.local', 'bin', 'claude.exe'),
      join(process.env['LOCALAPPDATA'] ?? '', 'Programs', 'claude', 'claude.exe'),
      join(process.env['APPDATA'] ?? '', 'npm', 'claude.cmd'),
      join(process.env['LOCALAPPDATA'] ?? '', 'npm', 'claude.cmd'),
      join(process.env['ProgramFiles'] ?? '', 'nodejs', 'claude.cmd'),
    ];
    for (const candidate of candidates) {
      if (candidate && existsSync(candidate)) return candidate;
    }
  } else {
    const candidates = [
      join(process.env['HOME'] ?? '', '.local', 'bin', 'claude'),
      '/usr/local/bin/claude',
      '/opt/homebrew/bin/claude',
      join(process.env['HOME'] ?? '', '.npm-global', 'bin', 'claude'),
    ];
    for (const candidate of candidates) {
      if (candidate && existsSync(candidate)) return candidate;
    }
  }

  return isWindows ? 'claude.exe' : 'claude';
}

function needsShellWrapper(binaryPath: string): boolean {
  const lower = binaryPath.toLowerCase();
  return lower.endsWith('.cmd') || lower.endsWith('.bat') || lower.endsWith('.ps1');
}

export function launchClaudeCode(options: LaunchOptions): void {
  const args: string[] = [];
  if (options.skipDangerous) args.push('--dangerously-skip-permissions');
  args.push('--settings', options.sessionPath);

  const isWindows = platform() === 'win32';
  const command = resolveClaudeBinary();

  const child = isWindows && needsShellWrapper(command)
    ? spawn('cmd.exe', ['/c', command, ...args], { stdio: 'inherit', detached: false })
    : spawn(command, args, { stdio: 'inherit', detached: false });

  child.on('error', (err) => {
    removeSessionFile(options.sessionPath);
    const e = err as NodeJS.ErrnoException;
    if (e.code === 'ENOENT') {
      console.error(
        `\n  ${ANSI.red}✗${ANSI.reset} Claude Code not found.\n` +
          `    Searched PATH and common install locations.\n` +
          `    Install: https://docs.anthropic.com/en/docs/claude-code\n` +
          `    Or set WHICHCLAUDE_CLAUDE_BIN to the claude binary path.\n`,
      );
    } else {
      console.error(`\n  ${ANSI.red}✗${ANSI.reset} Failed to launch: ${err.message}\n`);
    }
    process.exit(1);
  });

  child.on('exit', (code) => {
    removeSessionFile(options.sessionPath);
    process.exit(code ?? 0);
  });
}
