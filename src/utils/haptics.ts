export const vibrate = (pattern: number | number[]): boolean => {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false

  try {
    return navigator.vibrate(pattern)
  } catch {
    return false
  }
}
