// Experimental streaming upload with progress via fetch + Supabase signed URL (placeholder implementation)
// NOTE: This assumes you have a storage policy allowing authenticated uploads via standard signed URLs.
// For production: implement a server function to create a signed upload URL, then use this client.

export interface StreamUploadOptions {
  onProgress?: (percent: number) => void;
  chunkSize?: number; // future enhancement
  signal?: AbortSignal;
  contentType?: string;
}

export async function uploadWithProgress(url: string, file: File, opts: StreamUploadOptions = {}) {
  const { onProgress, signal, contentType } = opts;

  const total = file.size;
  let uploaded = 0;
  const reader = file.stream().getReader();

  const stream = new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      uploaded += value.byteLength;
      if (onProgress) onProgress((uploaded / total) * 100);
      controller.enqueue(value);
    },
    cancel(reason) {
      reader.cancel(reason);
    }
  });

  const res = await fetch(url, {
    method: 'PUT',
    body: stream,
    headers: {
      'Content-Type': contentType || file.type || 'application/octet-stream'
    },
    signal,
  });

  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
  }
  return { ok: true };
}
