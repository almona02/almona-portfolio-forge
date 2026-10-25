/** A restricted browser must not fail module initialization just reading storage.
 * Supabase can keep an anonymous/in-memory session when persistence is blocked. */
const memory = new Map<string, string>();
export const browserAuthStorage = {
  getItem(key: string): string | null {
    try {
      const value = window.localStorage.getItem(key);
      if (value === null) memory.delete(key); else memory.set(key, value);
      return value;
    } catch { return memory.get(key) ?? null; }
  },
  setItem(key: string, value: string): void {
    memory.set(key, value);
    try { window.localStorage.setItem(key, value); } catch { /* Memory-only session. */ }
  },
  removeItem(key: string): void {
    memory.delete(key);
    try { window.localStorage.removeItem(key); } catch { /* Memory already cleared. */ }
  },
};
