/** Wait at most three seconds for each recovery step; never block a reload forever. */
export async function bounded<T>(operation: Promise<T>): Promise<T | undefined> {
  let cancelTimeout = () => {};
  try {
    return await Promise.race([
      operation,
      new Promise<undefined>(resolve => {
        const timer = setTimeout(resolve, 3000);
        cancelTimeout = () => clearTimeout(timer);
      }),
    ]);
  } finally {
    cancelTimeout();
  }
}

export async function waitForWorker(worker: ServiceWorker, state: ServiceWorkerState) {
  if (worker.state === state || worker.state === 'redundant') return;
  let onState: (() => void) | undefined;
  try {
    await bounded(new Promise<void>(resolve => {
      onState = () => {
        if (worker.state === state || worker.state === 'redundant') resolve();
      };
      worker.addEventListener('statechange', onState);
      onState();
    }));
  } finally {
    if (onState) worker.removeEventListener('statechange', onState);
  }
}

/** Ask the waiting worker about other open windows before changing controllers.
 * Old tabs may still contain plugin reload listeners; fail closed on no reply. */
export async function canActivateWorker(worker: ServiceWorker): Promise<boolean> {
  if (typeof MessageChannel === 'undefined') return false;
  const channel = new MessageChannel();
  try {
    const result = new Promise<boolean>(resolve => {
      channel.port1.onmessage = event => resolve(event.data?.safe === true);
      worker.postMessage({ type: 'ALMONA_CAN_ACTIVATE' }, [channel.port2]);
    });
    return await bounded(result) === true;
  } finally {
    channel.port1.close(); channel.port2.close();
  }
}