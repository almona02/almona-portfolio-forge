
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RateLimiter } from '../RateLimiter';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should allow requests below the limit', () => {
    const limiter = new RateLimiter(60000, 5); // 5 reqs per min
    const id = 'test-entity';

    for (let i = 0; i < 5; i++) {
        expect(limiter.checkLimit(id)).toBe(true);
    }
  });

  it('should block requests exceeding the limit', () => {
    const limiter = new RateLimiter(60000, 5);
    const id = 'test-entity';

    for (let i = 0; i < 5; i++) {
        limiter.checkLimit(id);
    }
    
    // 6th request should fail
    expect(limiter.checkLimit(id)).toBe(false);
  });

  it('should reset limit after window passes', () => {
    const limiter = new RateLimiter(60000, 2);
    const id = 'test-entity';

    limiter.checkLimit(id); // 1
    limiter.checkLimit(id); // 2
    expect(limiter.checkLimit(id)).toBe(false); // 3 (Blocked)

    // Advance time by 61 seconds
    vi.advanceTimersByTime(61000);

    expect(limiter.checkLimit(id)).toBe(true); // Should work now
  });

  it('should track entities separately', () => {
    const limiter = new RateLimiter(60000, 1);
    
    expect(limiter.checkLimit('A')).toBe(true);
    expect(limiter.checkLimit('A')).toBe(false);
    
    expect(limiter.checkLimit('B')).toBe(true);
  });

  it('should provide correct usage stats', () => {
     const limiter = new RateLimiter(60000, 5);
     const id = 'stats-test';
     
     limiter.checkLimit(id);
     limiter.checkLimit(id);
     
     const stats = limiter.getUsage(id);
     expect(stats.count).toBe(2);
     expect(stats.remaining).toBe(3);
     expect(stats.resetInMs).toBeGreaterThan(0);
     expect(stats.resetInMs).toBeLessThanOrEqual(60000);
  });
});
