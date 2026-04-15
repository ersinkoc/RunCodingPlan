export interface CapturedIO {
  out: string[];
  err: string[];
  restore: () => void;
}

export function captureIO(): CapturedIO {
  const out: string[] = [];
  const err: string[] = [];
  const origLog = console.log;
  const origError = console.error;
  console.log = (...args: unknown[]) => {
    out.push(args.map(String).join(' '));
  };
  console.error = (...args: unknown[]) => {
    err.push(args.map(String).join(' '));
  };
  return {
    out,
    err,
    restore: () => {
      console.log = origLog;
      console.error = origError;
    },
  };
}

export function captureExit(): { exits: number[]; restore: () => void; run: <T>(fn: () => T) => T } {
  const exits: number[] = [];
  const orig = process.exit;
  process.exit = ((code?: number) => {
    exits.push(code ?? 0);
    throw new Error(`__EXIT__${code ?? 0}`);
  }) as typeof process.exit;
  return {
    exits,
    restore: () => {
      process.exit = orig;
    },
    run<T>(fn: () => T): T {
      try {
        return fn();
      } catch (e) {
        if (e instanceof Error && e.message.startsWith('__EXIT__')) {
          return undefined as unknown as T;
        }
        throw e;
      }
    },
  };
}
