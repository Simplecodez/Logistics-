import NodeCache from 'node-cache';
const ttl = 60 * 60 * 1;

class CacheService {
  private cache: any;
  constructor(ttlSeconds: number) {
    this.cache = new NodeCache({
      stdTTL: ttlSeconds,
      checkperiod: ttlSeconds * 0.2,
      useClones: false
    });
  }

  get(key: string) {
    const value = this.cache.get(key);
    if (value) {
      return value;
    }
    return undefined;
  }

  set(key: string, value: any) {
    this.cache.set(key, value);
  }

  has(key: string) {
    return this.cache.has(key);
  }

  del(keys: any) {
    this.cache.del(keys);
  }

  delStartWith(startStr = '') {
    if (!startStr) {
      return;
    }
    const keys = this.cache.keys();
    for (const key of keys) {
      if (key.indexOf(startStr) === 0) {
        this.del(key);
      }
    }
  }
  flush() {
    this.cache.flushAll();
  }
}

const cacheServiceInstance = new CacheService(ttl);

export default cacheServiceInstance;
