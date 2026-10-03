/** Owns the one pending guide task; context includes both page and step. */
export function createAutoGuideScheduler(options: {
  context: () => string
  canStart: (page: string) => boolean
  start: (page: string) => boolean
  markShown: (page: string) => void
}) {
  let timer: ReturnType<typeof setTimeout> | undefined
  let revision = 0
  let disposed = false

  function cancel() {
    revision++
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
  }

  return {
    cancel,
    schedule(page: string | null, delay = 800) {
      cancel()
      if (disposed || !page || !options.canStart(page)) return
      const context = options.context()
      const taskRevision = revision
      timer = setTimeout(() => {
        timer = undefined
        if (
          disposed ||
          taskRevision !== revision ||
          context !== options.context() ||
          !options.canStart(page)
        )
          return
        if (options.start(page)) options.markShown(page)
      }, delay)
    },
    dispose() {
      disposed = true
      cancel()
    },
  }
}
