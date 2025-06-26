import { Plugin } from 'vite';
import { readFileSync } from 'fs';
import { resolve } from 'path';

interface VersionPluginOptions {
  version?: string;
}

export function versionPlugin(options: VersionPluginOptions = {}): Plugin {
  let version = options.version || 'dev';
  const buildTime = new Date().toISOString();

  return {
    name: 'version-plugin',
    configResolved(config) {
      // 优先使用环境变量中的版本号
      const envVersion = process.env.VITE_APP_VERSION;
      if (envVersion) {
        version = envVersion;
        console.log(`📦 使用环境变量版本号: ${version}`);
        return;
      }

      // 如果没有指定版本，尝试从 package.json 读取
      if (version === 'dev') {
        try {
          const pkgPath = resolve(process.cwd(), 'package.json');
          const pkgContent = readFileSync(pkgPath, 'utf-8');
          const pkg = JSON.parse(pkgContent);
          version = pkg.version || 'dev';
        } catch (e) {
          version = 'dev';
        }
      }
    },
    transform(code, id) {
      // 只处理 TypeScript 和 JavaScript 文件
      if (!/\.(ts|js|vue)$/.test(id)) {
        return null;
      }

      // 替换版本号占位符
      if (code.includes('__VERSION__')) {
        code = code.replace(/__VERSION__/g, version);
      }

      // 替换构建时间占位符
      if (code.includes('__BUILD_TIME__')) {
        code = code.replace(/__BUILD_TIME__/g, buildTime);
      }

      return {
        code,
        map: null
      };
    }
  };
} 