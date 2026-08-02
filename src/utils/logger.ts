export const devLog = (...args: unknown[]): void => {
  const meta = import.meta as ImportMeta & { readonly env?: { readonly DEV?: boolean } }
  const browserGlobal = globalThis as typeof globalThis & { readonly document?: unknown }
  if (meta.env?.DEV && browserGlobal.document) {
    console.log(...args)
  }
}
