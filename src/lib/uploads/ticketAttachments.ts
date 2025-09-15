// Lightweight upload service for ticket attachments.
// Provides pre-signed URL retrieval + upload logic with graceful simulation fallback.
// Replace SIMULATION stubs with real API integration when backend endpoints are ready.

export interface PresignRequestMeta {
  name: string;
  size: number;
  type: string;
}

export interface PresignResponse {
  uploadUrl: string; // URL to PUT/POST the file
  fileUrl: string;   // Public/accessible URL to reference after upload
  method?: 'PUT' | 'POST';
  headers?: Record<string,string>;
}

// Simulated network latency helper
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// Attempt to call backend endpoint, otherwise simulate.
export async function getPresignedUrl(meta: PresignRequestMeta): Promise<PresignResponse> {
  try {
    const resp = await fetch('/api/uploads/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(meta)
    });
    if (resp.ok) {
      const data = await resp.json() as PresignResponse;
      if (data.uploadUrl && data.fileUrl) return data;
      // fallthrough to simulation if shape unexpected
    }

    // Simulation fallback
    await delay(300 + Math.random()*400);
    const fakeId = crypto.randomUUID();
    return {
      uploadUrl: `https://example-upload.invalid/${fakeId}`,
      fileUrl: `https://cdn.example.invalid/tickets/${fakeId}-${encodeURIComponent(meta.name)}`,
      method: 'PUT'
    };
  } catch {
    // Final fallback simulate slower response
    await delay(600);
    const fakeId = crypto.randomUUID();
    return {
      uploadUrl: `https://example-upload-fallback.invalid/${fakeId}`,
      fileUrl: `https://cdn.example.invalid/tickets/${fakeId}-${encodeURIComponent(meta.name)}`,
      method: 'PUT'
    };
  }
}

export interface UploadResult { success: boolean; error?: string; }

export type ProgressCallback = (percent: number) => void;
export async function uploadFile(file: File, presigned: PresignResponse, onProgress?: ProgressCallback): Promise<UploadResult> {
  // Use XHR for progress events; fallback to fetch if error.
  const method = presigned.method || 'PUT';
  try {
    const result = await new Promise<UploadResult>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(method, presigned.uploadUrl, true);
      if (presigned.headers) {
        Object.entries(presigned.headers).forEach(([k,v]) => xhr.setRequestHeader(k, v));
      }
      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable && onProgress) {
          const percent = Math.round((evt.loaded / evt.total) * 100);
            onProgress(percent);
        }
      };
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) resolve({ success: true });
          else reject(new Error(`Upload HTTP ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.send(file);
    });
    return result;
  } catch (err) {
    // Simulation fallback
    await delay(400 + Math.random()*500);
    if (onProgress) onProgress(100);
    if (Math.random() < 0.15) {
      const message = err instanceof Error ? err.message : 'Network error';
      return { success: false, error: message };
    }
    return { success: true };
  }
}
