import { ANSI } from '../constants.js';
import { restoreTerminal, hideCursor, showCursor, c } from './ui.js';

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
  separator?: boolean;
  hint?: string;
}

export async function select(question: string, options: SelectOption[]): Promise<string> {
  const selectable: number[] = [];
  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    if (opt && !opt.separator && !opt.disabled) selectable.push(i);
  }
  if (selectable.length === 0) throw new Error('No selectable options');

  let cursor = 0;

  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    let rawModeSet = false;

    try {
      if (stdin.isTTY) {
        stdin.setRawMode(true);
        rawModeSet = true;
      }
    } catch {
      // non-TTY environment
    }
    stdin.resume();
    stdin.setEncoding('utf8');
    hideCursor();

    const render = (first: boolean) => {
      if (!first) {
        const totalLines = options.length + 1;
        stdout.write(ANSI.cursorUp(totalLines));
      }
      stdout.write(`  ${c.cyan('?')} ${c.bold(question)}\n`);
      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        if (!opt) continue;
        stdout.write(ANSI.clearLine + '\r');
        if (opt.separator) {
          stdout.write('  ' + c.gray(opt.label) + '\n');
        } else {
          const isCursor = selectable[cursor] === i;
          const prefix = isCursor ? c.cyan('❯') : ' ';
          const text = isCursor ? c.cyan(opt.label) : opt.label;
          const hint = opt.hint ? ' ' + c.dim(opt.hint) : '';
          stdout.write(`  ${prefix} ${text}${hint}\n`);
        }
      }
    };

    const cleanup = () => {
      stdin.removeListener('data', onData);
      if (rawModeSet && stdin.isTTY) {
        /* c8 ignore next 5 -- setRawMode(false) rarely throws in practice */
        try {
          stdin.setRawMode(false);
        } catch {
          // ignore
        }
      }
      stdin.pause();
      showCursor();
    };

    const onData = (key: string) => {
      if (key === '\u0003') {
        cleanup();
        restoreTerminal();
        console.log('\n  ' + c.gray('Cancelled.'));
        process.exit(130);
      }
      if (key === '\r' || key === '\n') {
        cleanup();
        const chosenIndex = selectable[cursor];
        /* c8 ignore next 4 -- defensive guard; selectable is bounds-clamped */
        if (chosenIndex === undefined) {
          reject(new Error('Nothing selected'));
          return;
        }
        const chosen = options[chosenIndex];
        /* c8 ignore next 4 -- defensive guard; options[selectable[i]] is always defined */
        if (!chosen) {
          reject(new Error('Invalid selection'));
          return;
        }
        stdout.write('\n');
        resolve(chosen.value);
        return;
      }
      if (key === '\u001b[A' || key === 'k') {
        cursor = (cursor - 1 + selectable.length) % selectable.length;
        render(false);
        return;
      }
      if (key === '\u001b[B' || key === 'j') {
        cursor = (cursor + 1) % selectable.length;
        render(false);
        return;
      }
    };

    render(true);
    stdin.on('data', onData);
  });
}

export async function input(
  question: string,
  options: { masked?: boolean; default?: string } = {},
): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    let rawModeSet = false;
    let buffer = '';

    try {
      if (stdin.isTTY) {
        stdin.setRawMode(true);
        rawModeSet = true;
      }
    } catch {
      // ignore
    }
    stdin.resume();
    stdin.setEncoding('utf8');

    const prompt =
      `  ${c.cyan('?')} ${c.bold(question)}` +
      (options.default ? c.dim(` (${options.default})`) : '') +
      ' ';
    stdout.write(prompt);

    const render = () => {
      stdout.write('\r' + ANSI.clearLine);
      stdout.write(prompt);
      if (options.masked) {
        stdout.write('•'.repeat(buffer.length));
      } else {
        stdout.write(buffer);
      }
    };

    const cleanup = () => {
      stdin.removeListener('data', onData);
      if (rawModeSet && stdin.isTTY) {
        /* c8 ignore next 5 -- setRawMode(false) rarely throws in practice */
        try {
          stdin.setRawMode(false);
        } catch {
          // ignore
        }
      }
      stdin.pause();
    };

    const onData = (chunk: string) => {
      for (const key of chunk) {
        if (key === '\u0003') {
          cleanup();
          restoreTerminal();
          console.log('\n  ' + c.gray('Cancelled.'));
          process.exit(130);
        }
        if (key === '\r' || key === '\n') {
          cleanup();
          stdout.write('\n');
          const value = buffer || options.default || '';
          resolve(value);
          return;
        }
        if (key === '\u007f' || key === '\b') {
          if (buffer.length > 0) {
            buffer = buffer.slice(0, -1);
            render();
          }
          continue;
        }
        const code = key.charCodeAt(0);
        if (code < 32 || code === 127) continue;
        buffer += key;
        render();
      }
    };

    stdin.on('data', onData);
  });
}

export async function confirm(question: string, defaultYes = true): Promise<boolean> {
  const hint = defaultYes ? '(Y/n)' : '(y/N)';
  const answer = (await input(`${question} ${hint}`, {})).trim().toLowerCase();
  if (!answer) return defaultYes;
  return answer === 'y' || answer === 'yes';
}
