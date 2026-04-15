import { describe, it, expect, vi, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';

interface FakeStdin extends EventEmitter {
  isTTY: boolean;
  setEncoding(enc: string): void;
  setRawMode(b: boolean): void;
  resume(): void;
  pause(): void;
}

function installStdin(isTTY = false): FakeStdin {
  const ee = new EventEmitter() as FakeStdin;
  ee.isTTY = isTTY;
  ee.setEncoding = () => {};
  ee.setRawMode = () => {};
  ee.resume = () => {};
  ee.pause = () => {};
  Object.defineProperty(process, 'stdin', {
    value: ee,
    configurable: true,
    writable: true,
  });
  return ee;
}

function installStdout(): { writes: string[]; restore: () => void } {
  const writes: string[] = [];
  const spy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
    writes.push(String(chunk));
    return true;
  });
  return {
    writes,
    restore: () => spy.mockRestore(),
  };
}

const originalStdin = process.stdin;

afterEach(() => {
  Object.defineProperty(process, 'stdin', {
    value: originalStdin,
    configurable: true,
    writable: true,
  });
  vi.restoreAllMocks();
});

describe('select', () => {
  it('selects default option on Enter', async () => {
    const ee = installStdin(false);
    const out = installStdout();
    try {
      const { select } = await import('../src/cli/interactive.js');
      const p = select('Pick:', [
        { label: 'A', value: 'a' },
        { label: 'B', value: 'b' },
      ]);
      setImmediate(() => ee.emit('data', '\r'));
      const result = await p;
      expect(result).toBe('a');
    } finally {
      out.restore();
    }
  });

  it('arrow down then Enter selects second option', async () => {
    const ee = installStdin(false);
    const out = installStdout();
    try {
      const { select } = await import('../src/cli/interactive.js');
      const p = select('Pick:', [
        { label: 'A', value: 'a' },
        { label: 'B', value: 'b' },
      ]);
      setImmediate(() => {
        ee.emit('data', '\u001b[B');
        ee.emit('data', '\r');
      });
      const result = await p;
      expect(result).toBe('b');
    } finally {
      out.restore();
    }
  });

  it('j/k vim keys navigate', async () => {
    const ee = installStdin(false);
    const out = installStdout();
    try {
      const { select } = await import('../src/cli/interactive.js');
      const p = select('Pick:', [
        { label: 'A', value: 'a' },
        { label: 'B', value: 'b' },
        { label: 'C', value: 'c' },
      ]);
      setImmediate(() => {
        ee.emit('data', 'j');
        ee.emit('data', 'j');
        ee.emit('data', 'k');
        ee.emit('data', '\r');
      });
      const result = await p;
      expect(result).toBe('b');
    } finally {
      out.restore();
    }
  });

  it('up-arrow wraps to last', async () => {
    const ee = installStdin(false);
    const out = installStdout();
    try {
      const { select } = await import('../src/cli/interactive.js');
      const p = select('Pick:', [
        { label: 'A', value: 'a' },
        { label: 'B', value: 'b' },
      ]);
      setImmediate(() => {
        ee.emit('data', '\u001b[A');
        ee.emit('data', '\r');
      });
      const result = await p;
      expect(result).toBe('b');
    } finally {
      out.restore();
    }
  });

  it('skips separators and disabled options', async () => {
    const ee = installStdin(false);
    const out = installStdout();
    try {
      const { select } = await import('../src/cli/interactive.js');
      const p = select('Pick:', [
        { label: '--- hdr ---', value: '', separator: true },
        { label: 'A', value: 'a' },
        { label: 'Dis', value: 'd', disabled: true },
        { label: 'B', value: 'b' },
      ]);
      setImmediate(() => {
        ee.emit('data', '\u001b[B');
        ee.emit('data', '\r');
      });
      const result = await p;
      expect(result).toBe('b');
    } finally {
      out.restore();
    }
  });

  it('Ctrl+C cancels with process.exit(130)', async () => {
    const ee = installStdin(false);
    const out = installStdout();
    let exitCode: number | undefined;
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((c?: number) => {
      exitCode = c;
      throw new Error('__EXIT__');
    }) as never);
    try {
      const { select } = await import('../src/cli/interactive.js');
      const p = select('Pick:', [{ label: 'A', value: 'a' }]);
      p.catch(() => {});
      await new Promise<void>((resolve) => setImmediate(() => {
        try { ee.emit('data', '\u0003'); } catch { /* exit throw */ }
        resolve();
      }));
      expect(exitSpy).toHaveBeenCalled();
      expect(exitCode).toBe(130);
    } finally {
      out.restore();
    }
  });

  it('throws when no selectable options', async () => {
    installStdin(false);
    const out = installStdout();
    try {
      const { select } = await import('../src/cli/interactive.js');
      await expect(
        select('Pick:', [{ label: 'sep', value: '', separator: true }]),
      ).rejects.toThrow(/No selectable/);
    } finally {
      out.restore();
    }
  });

  it('TTY path: setRawMode is called', async () => {
    const ee = installStdin(true);
    const calls: boolean[] = [];
    ee.setRawMode = (b: boolean) => {
      calls.push(b);
    };
    const out = installStdout();
    try {
      const { select } = await import('../src/cli/interactive.js');
      const p = select('Pick:', [{ label: 'A', value: 'a' }]);
      setImmediate(() => ee.emit('data', '\r'));
      await p;
      expect(calls).toContain(true);
      expect(calls).toContain(false);
    } finally {
      out.restore();
    }
  });

  it('setRawMode throw is tolerated', async () => {
    const ee = installStdin(true);
    ee.setRawMode = () => { throw new Error('no tty'); };
    const out = installStdout();
    try {
      const { select } = await import('../src/cli/interactive.js');
      const p = select('Pick:', [{ label: 'A', value: 'a' }]);
      setImmediate(() => ee.emit('data', '\r'));
      const r = await p;
      expect(r).toBe('a');
    } finally {
      out.restore();
    }
  });
});

describe('input', () => {
  it('collects characters and resolves on Enter', async () => {
    const ee = installStdin(false);
    const out = installStdout();
    try {
      const { input } = await import('../src/cli/interactive.js');
      const p = input('Name:');
      setImmediate(() => {
        ee.emit('data', 'abc');
        ee.emit('data', '\r');
      });
      const result = await p;
      expect(result).toBe('abc');
    } finally {
      out.restore();
    }
  });

  it('masked input hides characters', async () => {
    const ee = installStdin(false);
    const out = installStdout();
    try {
      const { input } = await import('../src/cli/interactive.js');
      const p = input('Key:', { masked: true });
      setImmediate(() => {
        ee.emit('data', 'sk');
        ee.emit('data', '\r');
      });
      const result = await p;
      expect(result).toBe('sk');
      expect(out.writes.join('')).toContain('••');
    } finally {
      out.restore();
    }
  });

  it('backspace removes last character', async () => {
    const ee = installStdin(false);
    const out = installStdout();
    try {
      const { input } = await import('../src/cli/interactive.js');
      const p = input('Name:');
      setImmediate(() => {
        ee.emit('data', 'abx');
        ee.emit('data', '\u007f');
        ee.emit('data', 'c');
        ee.emit('data', '\r');
      });
      const result = await p;
      expect(result).toBe('abc');
    } finally {
      out.restore();
    }
  });

  it('backspace on empty buffer is a no-op', async () => {
    const ee = installStdin(false);
    const out = installStdout();
    try {
      const { input } = await import('../src/cli/interactive.js');
      const p = input('Name:');
      setImmediate(() => {
        ee.emit('data', '\u007f');
        ee.emit('data', '\b');
        ee.emit('data', 'x');
        ee.emit('data', '\r');
      });
      const result = await p;
      expect(result).toBe('x');
    } finally {
      out.restore();
    }
  });

  it('uses default when empty answer', async () => {
    const ee = installStdin(false);
    const out = installStdout();
    try {
      const { input } = await import('../src/cli/interactive.js');
      const p = input('Name:', { default: 'dflt' });
      setImmediate(() => ee.emit('data', '\r'));
      const result = await p;
      expect(result).toBe('dflt');
    } finally {
      out.restore();
    }
  });

  it('ignores control chars (< 32) and DEL chord', async () => {
    const ee = installStdin(false);
    const out = installStdout();
    try {
      const { input } = await import('../src/cli/interactive.js');
      const p = input('Name:');
      setImmediate(() => {
        ee.emit('data', '\u0001');
        ee.emit('data', 'a');
        ee.emit('data', '\r');
      });
      const result = await p;
      expect(result).toBe('a');
    } finally {
      out.restore();
    }
  });

  it('Ctrl+C cancels', async () => {
    const ee = installStdin(false);
    const out = installStdout();
    let exitCode: number | undefined;
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((c?: number) => {
      exitCode = c;
      throw new Error('__EXIT__');
    }) as never);
    try {
      const { input } = await import('../src/cli/interactive.js');
      const p = input('Name:');
      p.catch(() => {});
      await new Promise<void>((resolve) => setImmediate(() => {
        try { ee.emit('data', '\u0003'); } catch { /* exit throw */ }
        resolve();
      }));
    } finally {
      out.restore();
    }
    expect(exitSpy).toHaveBeenCalled();
    expect(exitCode).toBe(130);
  });

  it('TTY path: raw mode throw is tolerated', async () => {
    const ee = installStdin(true);
    ee.setRawMode = () => { throw new Error('nope'); };
    const out = installStdout();
    try {
      const { input } = await import('../src/cli/interactive.js');
      const p = input('Name:');
      setImmediate(() => ee.emit('data', 'x\r'));
      const result = await p;
      expect(result).toBe('x');
    } finally {
      out.restore();
    }
  });

  it('TTY true path exercises cleanup raw-mode toggle', async () => {
    const ee = installStdin(true);
    const calls: boolean[] = [];
    ee.setRawMode = (b: boolean) => {
      calls.push(b);
    };
    const out = installStdout();
    try {
      const { input } = await import('../src/cli/interactive.js');
      const p = input('Name:');
      setImmediate(() => ee.emit('data', 'abc\r'));
      await p;
      expect(calls).toContain(true);
      expect(calls).toContain(false);
    } finally {
      out.restore();
    }
  });
});

describe('confirm', () => {
  it('y returns true', async () => {
    const ee = installStdin(false);
    const out = installStdout();
    try {
      const { confirm } = await import('../src/cli/interactive.js');
      const p = confirm('ok?', false);
      setImmediate(() => ee.emit('data', 'y\r'));
      const r = await p;
      expect(r).toBe(true);
    } finally {
      out.restore();
    }
  });

  it('n returns false', async () => {
    const ee = installStdin(false);
    const out = installStdout();
    try {
      const { confirm } = await import('../src/cli/interactive.js');
      const p = confirm('ok?', true);
      setImmediate(() => ee.emit('data', 'n\r'));
      const r = await p;
      expect(r).toBe(false);
    } finally {
      out.restore();
    }
  });

  it('empty returns default (true)', async () => {
    const ee = installStdin(false);
    const out = installStdout();
    try {
      const { confirm } = await import('../src/cli/interactive.js');
      const p = confirm('ok?');
      setImmediate(() => ee.emit('data', '\r'));
      const r = await p;
      expect(r).toBe(true);
    } finally {
      out.restore();
    }
  });

  it('empty returns default (false)', async () => {
    const ee = installStdin(false);
    const out = installStdout();
    try {
      const { confirm } = await import('../src/cli/interactive.js');
      const p = confirm('ok?', false);
      setImmediate(() => ee.emit('data', '\r'));
      const r = await p;
      expect(r).toBe(false);
    } finally {
      out.restore();
    }
  });

  it('yes returns true', async () => {
    const ee = installStdin(false);
    const out = installStdout();
    try {
      const { confirm } = await import('../src/cli/interactive.js');
      const p = confirm('ok?', false);
      setImmediate(() => ee.emit('data', 'yes\r'));
      const r = await p;
      expect(r).toBe(true);
    } finally {
      out.restore();
    }
  });
});
