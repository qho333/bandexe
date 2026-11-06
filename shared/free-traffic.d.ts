export function mistralQueue(fetchFn: typeof fetch, key: string): { acquire(maxWait: number): Promise<(() => void) | null>; defer(ms: number): void };
export function timedCall<T>(run: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T>;
