import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { makeTmpHome, type TmpHome } from './helpers/tmpHome.js';
import { writeFileSync, mkdirSync } from 'node:fs';

let tmp: TmpHome;

beforeEach(() => {
  tmp = makeTmpHome();
});
afterEach(() => {
  tmp.cleanup();
});

describe('keys file I/O', () => {
  it('setKey then getKey roundtrip', async () => {
    const { setKey, getKey, hasKey } = await import('../src/core/keys.js');
    expect(hasKey('zai')).toBe(false);
    setKey('zai', 'sk-test-abc');
    expect(hasKey('zai')).toBe(true);
    expect(getKey('zai')).toBe('sk-test-abc');
  });

  it('removeKey removes existing key', async () => {
    const { setKey, removeKey, hasKey } = await import('../src/core/keys.js');
    setKey('zai', 'sk-abc');
    expect(removeKey('zai')).toBe(true);
    expect(hasKey('zai')).toBe(false);
  });

  it('removeKey returns false for unknown provider', async () => {
    const { removeKey } = await import('../src/core/keys.js');
    expect(removeKey('nope')).toBe(false);
  });

  it('getKey returns null for missing provider', async () => {
    const { getKey } = await import('../src/core/keys.js');
    expect(getKey('nope')).toBeNull();
  });

  it('getKey returns null when decryption fails', async () => {
    const { KEYS_PATH, WHICHCC_DIR } = await import('../src/constants.js');
    mkdirSync(WHICHCC_DIR, { recursive: true });
    writeFileSync(KEYS_PATH, JSON.stringify({ zai: 'enc:v1:aes256gcm:garbage' }));
    const { getKey } = await import('../src/core/keys.js');
    expect(getKey('zai')).toBeNull();
  });

  it('loadKeys returns empty object when file missing', async () => {
    const { loadKeys } = await import('../src/core/keys.js');
    expect(loadKeys()).toEqual({});
  });

  it('loadKeys returns empty object on corrupt JSON', async () => {
    const { KEYS_PATH, WHICHCC_DIR } = await import('../src/constants.js');
    mkdirSync(WHICHCC_DIR, { recursive: true });
    writeFileSync(KEYS_PATH, '{{not json');
    const { loadKeys } = await import('../src/core/keys.js');
    expect(loadKeys()).toEqual({});
  });

  it('loadKeys returns empty object when root is not an object', async () => {
    const { KEYS_PATH, WHICHCC_DIR } = await import('../src/constants.js');
    mkdirSync(WHICHCC_DIR, { recursive: true });
    writeFileSync(KEYS_PATH, '42');
    const { loadKeys } = await import('../src/core/keys.js');
    expect(loadKeys()).toEqual({});
  });

  it('hasKey returns false for null entry', async () => {
    const { KEYS_PATH, WHICHCC_DIR } = await import('../src/constants.js');
    mkdirSync(WHICHCC_DIR, { recursive: true });
    writeFileSync(KEYS_PATH, JSON.stringify({ zai: null }));
    const { hasKey } = await import('../src/core/keys.js');
    expect(hasKey('zai')).toBe(false);
  });

  it('decryptKey rejects too-short payload', async () => {
    const { decryptKey } = await import('../src/core/keys.js');
    expect(() => decryptKey('enc:v1:aes256gcm:' + Buffer.from('x').toString('base64'))).toThrow();
  });
});
