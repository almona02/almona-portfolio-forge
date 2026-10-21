/** Bound read requests so a stalled connection can reach the retry UI. */
export async function marketplaceRead<T>(request: (signal: AbortSignal) => PromiseLike<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try { return await request(controller.signal); } finally { clearTimeout(timer); }
}
