import { webcrypto } from 'node:crypto'

// GitHub Actions Node 环境中 globalThis.crypto 可能未挂载。
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as Crypto
}
