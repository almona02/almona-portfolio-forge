import 'dotenv/config'; // Load .env file
import redis from './client';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  namespace?: string; // System namespace
}

export class CacheHelper {
  /**
   * Get cached data
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Cache GET error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cached data with TTL
   */
  static async set(
    key: string,
    value: any,
    options: CacheOptions = {}
  ): Promise<boolean> {
    try {
      const { ttl = 300 } = options; // Default 5 minutes
      const serialized = JSON.stringify(value);
      await redis.setex(key, ttl, serialized);
      return true;
    } catch (error) {
      console.error(`Cache SET error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete cached data
   */
  static async delete(key: string): Promise<boolean> {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      console.error(`Cache DELETE error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Invalidate cache by pattern
   */
  static async invalidatePattern(pattern: string): Promise<number> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length === 0) return 0;
      
      await redis.del(...keys);
      return keys.length;
    } catch (error) {
      console.error(`Cache INVALIDATE error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Get or set cached data (cache-aside pattern)
   */
  static async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch from database
    const data = await fetchFn();

    // Store in cache
    await this.set(key, data, options);

    return data;
  }

  /**
   * Increment counter (for rate limiting)
   */
  static async increment(
    key: string,
    ttl: number = 60
  ): Promise<number> {
    try {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, ttl);
      }
      return count;
    } catch (error) {
      console.error(`Cache INCREMENT error for key ${key}:`, error);
      return 0;
    }
  }
}
