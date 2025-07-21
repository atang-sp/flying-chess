declare module 'driver.js' {
  interface DriverOptions {
    [key: string]: unknown
  }

  interface DriverInstance {
    [key: string]: unknown
  }

  export function driver(options?: DriverOptions): DriverInstance
  const _default: DriverInstance
  export default _default
}
