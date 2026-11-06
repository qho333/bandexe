/** Replace pending status work and cancel it when its owner leaves. */
export function createDebounce(callback: () => void, delay: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => { clearTimeout(timer); timer = undefined; };
  return {
    schedule: () => { cancel(); timer = setTimeout(() => { timer = undefined; callback(); }, delay); },
    cancel,
  };
}
