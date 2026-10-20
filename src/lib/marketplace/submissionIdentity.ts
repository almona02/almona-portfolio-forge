const KEY = 'almona.marketplace.submission.v1';
let lastSubmission: { fingerprint: string; id: string; expires: number } | undefined;

export async function fileDigest(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
}

/** Save only a fingerprint and random id; never contact values or photos. */
export async function submissionIdentity(fields: object, files: File[]): Promise<{ id: string; imageHashes: string[] }> {
  const imageHashes = await Promise.all(files.map(fileDigest));
  const bytes = new TextEncoder().encode(JSON.stringify({ fields, imageHashes }));
  const fingerprint = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null') as typeof lastSubmission;
    if (saved && typeof saved.id === 'string' && /^[0-9a-f-]{36}$/i.test(saved.id) && saved.fingerprint === fingerprint && saved.expires > Date.now()) lastSubmission = saved;
  } catch { /* Keep immediate retries safe in memory when storage is blocked. */ }
  if (!lastSubmission || lastSubmission.fingerprint !== fingerprint || lastSubmission.expires <= Date.now()) {
    lastSubmission = { fingerprint, id: crypto.randomUUID(), expires: Date.now() + 7 * 86400000 };
  }
  try { localStorage.setItem(KEY, JSON.stringify(lastSubmission)); } catch { /* Optional persistence. */ }
  return { id: lastSubmission.id, imageHashes };
}
