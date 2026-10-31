// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.

export type IdGenerator = () => string;

const HEX = '0123456789abcdef';

function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  const c = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;
  if (c?.getRandomValues) {
    c.getRandomValues(out);
  } else {
    for (let i = 0; i < n; i++) out[i] = Math.floor(Math.random() * 256);
  }
  return out;
}

/** RFC 4122 version 4 UUID. */
export const newId: IdGenerator = () => {
  const b = randomBytes(16);
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  let s = '';
  for (let i = 0; i < 16; i++) {
    if (i === 4 || i === 6 || i === 8 || i === 10) s += '-';
    s += HEX[b[i]! >> 4]! + HEX[b[i]! & 15]!;
  }
  return s;
};

/** Deterministic generator for tests. */
export function sequentialIds(prefix = 'id'): IdGenerator {
  let n = 0;
  return () => `${prefix}${++n}`;
}
