export interface RoomServerOperationalSnapshot {
  readonly rooms: number
  readonly activeGames: number
  readonly connections: number
  readonly drainBlockingRooms: number
}

export type OperationalRoomStatus = 'lobby' | 'playing' | 'finished'

export function isRoomDrainBlocking(
  status: OperationalRoomStatus,
  connectedSessions: number
): boolean {
  return status === 'playing' || connectedSessions > 0
}

interface RoomServerLifecycleOptions {
  readonly drainTimeoutMs: number
  readonly getSnapshot: () => RoomServerOperationalSnapshot
  readonly closeResources: () => Promise<void>
}

/** Coordinates one idempotent, bounded transition from serving to closed. */
export class RoomServerLifecycle {
  private draining = false
  private closeStarted = false
  private drainTimer: ReturnType<typeof setTimeout> | undefined
  private shutdownPromise: Promise<void> | undefined
  private resolveShutdown: (() => void) | undefined
  private rejectShutdown: ((error: unknown) => void) | undefined

  constructor(private readonly options: RoomServerLifecycleOptions) {}

  isDraining(): boolean {
    return this.draining
  }

  beginDrain(): Promise<void> {
    const shutdown = this.ensureShutdownPromise()
    if (this.draining) return shutdown
    this.draining = true
    this.drainTimer = setTimeout(() => this.startClose(), this.options.drainTimeoutMs)
    this.drainTimer.unref?.()
    this.notifyStateChanged()
    return shutdown
  }

  notifyStateChanged(): void {
    if (!this.draining || this.closeStarted) return
    if (this.options.getSnapshot().drainBlockingRooms === 0) this.startClose()
  }

  close(): Promise<void> {
    const shutdown = this.ensureShutdownPromise()
    this.draining = true
    this.startClose()
    return shutdown
  }

  private ensureShutdownPromise(): Promise<void> {
    if (!this.shutdownPromise) {
      this.shutdownPromise = new Promise<void>((resolve, reject) => {
        this.resolveShutdown = resolve
        this.rejectShutdown = reject
      })
    }
    return this.shutdownPromise
  }

  private startClose(): void {
    if (this.closeStarted) return
    this.closeStarted = true
    if (this.drainTimer) clearTimeout(this.drainTimer)
    this.drainTimer = undefined
    void this.options.closeResources().then(this.resolveShutdown, this.rejectShutdown)
  }
}
