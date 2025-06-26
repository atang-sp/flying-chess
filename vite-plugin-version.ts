import { Plugin } from 'vite';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve } from 'path';

interface VersionPluginOptions {
  version?: string;
}

// 获取当前 Git tag
function getCurrentGitTag(): string | null {
  try {
    const tag = execSync('git describe --tags --exact-match 2>/dev/null', { encoding: 'utf8' }).trim();
    return tag;
  } catch (error) {
    return null;
  }
}

// 获取最近的 Git tag
function getLatestGitTag(): string | null {
  try {
    const tag = execSync('git describe --tags --abbrev=0 2>/dev/null', { encoding: 'utf8' }).trim();
    return tag;
  } catch (error) {
    return null;
  }
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

      // 尝试获取 Git tag
      const currentTag = getCurrentGitTag();
      const latestTag = getLatestGitTag();
      
      if (currentTag) {
        // 如果当前提交有对应的 tag，使用该 tag
        version = currentTag.startsWith('v') ? currentTag.substring(1) : currentTag;
        console.log(`📦 使用当前 Git tag: ${currentTag} -> ${version}`);
      } else if (latestTag) {
        // 如果没有当前 tag，但有最近的 tag，使用最近的 tag + dev 后缀
        const baseVersion = latestTag.startsWith('v') ? latestTag.substring(1) : latestTag;
        version = `${baseVersion}-dev`;
        console.log(`📦 使用最近 Git tag: ${latestTag} -> ${version}`);
      } else {
        // 如果没有 tag，尝试从 package.json 读取
        try {
          const pkgPath = resolve(process.cwd(), 'package.json');
          const pkgContent = readFileSync(pkgPath, 'utf-8');
          const pkg = JSON.parse(pkgContent);
          version = pkg.version || 'dev';
          console.log(`📦 使用 package.json 版本: ${version}`);
        } catch (e) {
          version = 'dev';
          console.log(`📦 使用默认版本: ${version}`);
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