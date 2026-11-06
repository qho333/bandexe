// Isolate-local admission control. Different isolates still share the provider's own quota.
const schedulers = new WeakMap();
export function mistralQueue(fetchFn, key) {
  let keys = schedulers.get(fetchFn);
  if (!keys) { keys = new Map(); schedulers.set(fetchFn, keys); }
  if (keys.has(key)) return keys.get(key);
  const queue = [];
  let active = 0, nextStart = 0;
  const wakeHead = () => { if (active < 4) queue[0]?.wake(); };
  const scheduler = {
    async acquire(maxWait) {
      if (queue.length >= 24) return null;
      let wake;
      const turn = new Promise((resolve) => { wake = resolve; });
      const entry = { wake };
      queue.push(entry);
      let expired = false, deadline, startTimer, cancelStart;
      const remove = () => {
        const index = queue.indexOf(entry);
        if (index !== -1) queue.splice(index, 1);
        wakeHead();
      };
      // Each waiter owns its timers. A completed request must not own the timer
      // that starts another request's I/O in the Workers runtime.
      deadline = setTimeout(() => {
        expired = true; clearTimeout(startTimer); cancelStart?.(); wake(); remove();
      }, Math.max(0, maxWait));
      wakeHead();
      await turn;
      try {
        while (!expired) {
          const wait = Math.max(0, nextStart - Date.now());
          if (wait) await new Promise((resolve) => { cancelStart = resolve; startTimer = setTimeout(resolve, wait); });
          if (expired) return null;
          // A 429 received during our sleep can extend the shared cooldown.
          if (Date.now() < nextStart) continue;
          active++;
          nextStart = Date.now() + 1000 + Math.floor(Math.random() * 101);
          remove();
          let released = false;
          return () => { if (!released) { released = true; active--; wakeHead(); } };
        }
        return null;
      } finally { clearTimeout(deadline); clearTimeout(startTimer); }
    },
    defer(ms) { nextStart = Math.max(nextStart, Date.now() + ms); },
  };
  keys.set(key, scheduler);
  return scheduler;
}

// Race as well as abort: bindings (and broken transports) may ignore AbortSignal.
// The timeout includes response-body parsing, and is cleared on every exit.
export async function timedCall(run, ms) {
  const controller = new AbortController();
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(() => run(controller.signal)),
      new Promise((_, reject) => { timer = setTimeout(() => {
        controller.abort(); reject(new Error('provider_timeout'));
      }, ms); }),
    ]);
  } finally { clearTimeout(timer); }
}
