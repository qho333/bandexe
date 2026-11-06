import { useEffect, useState } from "react";
export const STILL_WORKING = "Still working… Free models can take a little longer. Please keep this page open.";
export const BUSY_NOTICE = "Busy right now — trying another free model if needed…";
export function useSlowReply(busy: boolean) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    setSlow(false);
    if (!busy) return;
    const timer = setTimeout(() => setSlow(true), 20000);
    return () => clearTimeout(timer);
  }, [busy]);
  return busy && slow;
}
