export const devLog = (...args: unknown[]): void => {
  if (import.meta.env.DEV) {
    console.log(...args)
  }
}
