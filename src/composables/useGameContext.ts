import { inject } from 'vue'

export function useGameContext() {
  const context = inject<any>('gameContext') // eslint-disable-line
  if (!context) {
    throw new Error('useGameContext must be used within a provided gameContext')
  }
  return context
}
