// 版本号配置
// 在开发环境中显示 'dev'
// 在构建时会被 Vite 插件替换为实际的版本号
export const VERSION: string = '__VERSION__';

// 构建时间
export const BUILD_TIME: string = '__BUILD_TIME__';

// 获取版本信息
export function getVersionInfo() {
  return {
    version: VERSION,
    buildTime: BUILD_TIME,
    isDev: VERSION === 'dev' || VERSION === '__VERSION__'
  };
} 