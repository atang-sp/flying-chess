declare module 'driver.js' {
  interface DriverOptions {
    [key: string]: unknown
  }

  interface DriverInstance {
    isActive(): boolean
    destroy(): void
    setSteps(steps: unknown[]): void
    drive(stepIndex?: number): void
    [key: string]: unknown
  }

  export function driver(options?: DriverOptions): DriverInstance
  const _default: DriverInstance
  export default _default
}
