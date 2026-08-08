import { readdirSync, readFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const coreRoot = fileURLToPath(new URL('../../packages/game-core/src', import.meta.url))

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? sourceFiles(path) : extname(path) === '.ts' ? [path] : []
  })
}

describe('game-core package boundary', () => {
  it('does not import browser application modules from the root src tree', () => {
    const violations = sourceFiles(coreRoot).flatMap(path => {
      const source = readFileSync(path, 'utf8')
      return /from\s+['"](?:\.\.\/){3}src\//.test(source) ? [path.slice(coreRoot.length + 1)] : []
    })

    expect(violations).toEqual([])
  })
})
