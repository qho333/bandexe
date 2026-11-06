/** Browser chrome can resize the viewport a little; a keyboard consumes a substantial part of it.
 * Ignore pinch zoom, which also shrinks visualViewport without opening a keyboard.
 */
export function isKeyboardOpen({ focused, referenceHeight, viewportHeight, scale = 1 }: {
  focused: boolean; referenceHeight: number; viewportHeight: number; scale?: number;
}): boolean {
  if (!focused || !Number.isFinite(referenceHeight) || !Number.isFinite(viewportHeight)
    || !Number.isFinite(scale) || referenceHeight <= 0 || viewportHeight <= 0 || Math.abs(scale - 1) > 0.05) return false;
  return referenceHeight - viewportHeight >= Math.max(120, referenceHeight * 0.2);
}
