/** Wall-clock elapsed time survives background timer throttling; pauses retain fractional seconds. */
export function createExamClock(now: () => number = Date.now) {
  let elapsed = 0, started: number | null = null;
  const milliseconds = () => elapsed + (started === null ? 0 : Math.max(0, now() - started));
  return {
    seconds: () => Math.floor(milliseconds() / 1000),
    start: () => { if (started === null) started = now(); },
    pause: () => { elapsed = milliseconds(); started = null; },
    reset: () => { elapsed = 0; started = null; },
  };
}
export const timerExpired = (direction: "up" | "down", left: number) => direction === "down" && left === 0;
