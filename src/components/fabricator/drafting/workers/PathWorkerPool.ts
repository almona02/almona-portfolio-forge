import type { EgyptianPathRequest, EgyptianPathResponse } from '@/workers/egyptian-path-generator.worker';

// Worker Wrapper Class
class WorkerWrapper {
  private worker: Worker;
  private activeRequest: { resolve: (val: unknown) => void; reject: (err: unknown) => void } | null = null;
  public busy: boolean = false;

  constructor() {
    this.worker = new Worker(new URL('@/workers/egyptian-path-generator.worker.ts', import.meta.url), {
      type: 'module'
    });

    this.worker.onmessage = (e) => {
      this.busy = false;
      if (this.activeRequest) {
        if (e.data.error) {
          this.activeRequest.reject(e.data.error);
        } else {
          this.activeRequest.resolve(e.data);
        }
        this.activeRequest = null;
      }
    };

    this.worker.onerror = (err) => {
      this.busy = false;
      if (this.activeRequest) {
        this.activeRequest.reject(err);
        this.activeRequest = null;
      }
    };
  }

  public process(request: EgyptianPathRequest): Promise<EgyptianPathResponse> {
    if (this.busy) {
      return Promise.reject('Worker is busy');
    }
    this.busy = true;
    return new Promise((resolve, reject) => {
      this.activeRequest = { resolve, reject };
      this.worker.postMessage(request);
    });
  }

  public terminate() {
    this.worker.terminate();
  }
}

// Pool Manager
export class PathWorkerPool {
  private static instance: PathWorkerPool;
  private workers: WorkerWrapper[] = [];
  private queue: Array<{ 
    request: EgyptianPathRequest; 
    resolve: (val: unknown) => void; 
    reject: (err: unknown) => void 
  }> = [];
  private maxWorkers = navigator.hardwareConcurrency || 4;

  private constructor() {
    // Initialize half capacity to start
    for (let i = 0; i < Math.max(2, this.maxWorkers / 2); i++) {
        this.workers.push(new WorkerWrapper());
    }
  }

  public static getInstance(): PathWorkerPool {
    if (!PathWorkerPool.instance) {
      PathWorkerPool.instance = new PathWorkerPool();
    }
    return PathWorkerPool.instance;
  }

  public async requestPathGeneration(
    templateId: string, 
    width: number, 
    height: number, 
    quality: 'low' | 'medium' | 'high',
    params: Record<string, any> = {}
  ): Promise<EgyptianPathResponse> {
    
    return new Promise((resolve, reject) => {
      this.queue.push({
        request: { templateId, width, height, params, quality },
        resolve,
        reject
      });
      this.processQueue();
    });
  }

  private processQueue() {
    if (this.queue.length === 0) return;

    // Find available worker
    const worker = this.workers.find(w => !w.busy);
    if (!worker) {
        // If we haven't reached max capacity, add a new worker
        if (this.workers.length < this.maxWorkers) {
            const newWorker = new WorkerWrapper();
            this.workers.push(newWorker);
            // Use it immediately
            this.dispatch(newWorker);
        }
        return;
    }

    this.dispatch(worker);
  }

  private dispatch(worker: WorkerWrapper) {
      const job = this.queue.shift();
      if (!job) return;

      worker.process(job.request)
        .then(job.resolve)
        .catch(job.reject)
        .finally(() => {
            // Worker is free, check queue again
            this.processQueue();
        });
  }

  public terminateAll() {
      this.workers.forEach(w => w.terminate());
      this.workers = [];
  }
}
