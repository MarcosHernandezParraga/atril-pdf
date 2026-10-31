// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.

/** Small LRU cache with a disposal callback (used to free rendered images). */
export class LruCache<K, V> {
  private map = new Map<K, V>();

  constructor(
    private capacity: number,
    private onEvict?: (key: K, value: V) => void,
  ) {}

  get(key: K): V | undefined {
    const v = this.map.get(key);
    if (v !== undefined) {
      this.map.delete(key);
      this.map.set(key, v);
    }
    return v;
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    while (this.map.size > this.capacity) {
      const oldest = this.map.keys().next().value as K;
      const ov = this.map.get(oldest)!;
      this.map.delete(oldest);
      this.onEvict?.(oldest, ov);
    }
  }

  delete(key: K): void {
    const v = this.map.get(key);
    if (v !== undefined) {
      this.map.delete(key);
      this.onEvict?.(key, v);
    }
  }

  clear(): void {
    for (const [k, v] of this.map) this.onEvict?.(k, v);
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }

  setCapacity(n: number): void {
    this.capacity = Math.max(1, n);
    while (this.map.size > this.capacity) {
      const oldest = this.map.keys().next().value as K;
      this.delete(oldest);
    }
  }
}

/** Rounds a requested width up to a bucket so small resizes reuse renders. */
export function widthBucket(width: number, step = 128, max = 4096): number {
  const w = Math.max(step, Math.ceil(width / step) * step);
  return Math.min(max, w);
}
