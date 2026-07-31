import { Plugin } from 'vite'
import { readFileSync } from 'fs'
import { execSync } from 'child_process'
import { resolve } from 'path'

interface VersionPluginOptions {
  version?: string
}

// 获取当前 Git tag
function getCurrentGitTag(): string | null {
  try {
    const tag = execSync('git describe --tags --exact-match 2>/dev/null', {
      encoding: 'utf8',
    }).trim()
    return tag
  } catch (error) {
    return null
  }
}

export function versionPlugin(options: VersionPluginOptions = {}): Plugin {
  let version = options.version || 'dev'
  const buildTime = new Date().toISOString()

  return {
    name: 'version-plugin',
    configResolved(_config) {
      // 优先使用环境变量中的版本号
      const envVersion = process.env.VITE_APP_VERSION
      if (envVersion) {
        version = envVersion
        console.log(`📦 使用环境变量版本号: ${version}`)
        return
      }

      // 尝试获取 Git tag
      const currentTag = getCurrentGitTag()
      if (currentTag) {
        // 如果当前提交有对应的 tag，使用该 tag
        version = currentTag.startsWith('v') ? currentTag.substring(1) : currentTag
        console.log(`📦 使用当前 Git tag: ${currentTag} -> ${version}`)
      } else {
        // 未打 tag 的提交属于下一版本开发线，应以 package.json 为准。
        // 最近的历史 tag 代表旧版本，不能用于当前页面或遥测。
        try {
          const pkgPath = resolve(process.cwd(), 'package.json')
          const pkgContent = readFileSync(pkgPath, 'utf-8')
          const pkg = JSON.parse(pkgContent)
          version = pkg.version ? `${pkg.version}-dev` : 'dev'
          console.log(`📦 使用 package.json 版本: ${version}`)
        } catch (e) {
          version = 'dev'
          console.log(`📦 使用默认版本: ${version}`)
        }
      }
    },
    transform(code, id) {
      // 只处理 TypeScript 和 JavaScript 文件
      if (!/\.(ts|js|vue)$/.test(id)) {
        return null
      }

      // 替换版本号占位符
      if (code.includes('__VERSION__')) {
        code = code.replace(/__VERSION__/g, version)
      }

      // 替换构建时间占位符
      if (code.includes('__BUILD_TIME__')) {
        code = code.replace(/__BUILD_TIME__/g, buildTime)
      }

      return {
        code,
        map: null,
      }
    },
  }
}
