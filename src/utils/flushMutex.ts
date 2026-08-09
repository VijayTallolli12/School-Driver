// Simple in-memory mutex so concurrent queue flushes (e.g. from the background
// task, the foreground watcher, and a manual "Sync" tap) never interleave.
// The last caller wins the promise; subsequent callers share the running flush.
const inFlight = new Map<string, Promise<unknown>>();

export async function withFlushMutex<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const running = fn().finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, running);
  return running;
}

export function clearFlushMutexes(): void {
  inFlight.clear();
}