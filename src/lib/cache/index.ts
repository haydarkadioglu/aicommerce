/**
 * In-process LRU cache with TTL — used for short-lived caching
 * (e.g. agent configs, prompt bodies, AI provider lists).
 * Designed to be swappable for Redis later.
 */

type Entry<T> = { value: T; expires: number };

export class LRUCache<T> {
  private store = new Map<string, Entry<T>>();
  constructor(private max = 100, private ttlMs = 60_000) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expires) {
      this.store.delete(key);
      return undefined;
    }
    // Move to end (LRU)
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number) {
    if (this.store.size >= this.max) {
      const oldest = this.store.keys().next().value;
      if (oldest) this.store.delete(oldest);
    }
    this.store.set(key, {
      value,
      expires: Date.now() + (ttlMs ?? this.ttlMs),
    });
  }

  invalidate(key: string) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

export const promptCache = new LRUCache<string>(50, 60_000);
export const providerCache = new LRUCache<unknown>(10, 30_000);
