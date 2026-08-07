import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { resolveConfig } from 'vite'

describe('Vite development server configuration', () => {
  it('lets each CLI-selected port own its matching HMR endpoint', async () => {
    const config = await resolveConfig(
      {
        configFile: fileURLToPath(new URL('../../vite.config.ts', import.meta.url)),
        server: { port: 4175 },
      },
      'serve',
      'test'
    )

    expect(config.server.port).toBe(4175)
    expect(config.server.hmr).not.toMatchObject({ port: 5173 })
  })
})
