#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// 获取当前 git tag
function getCurrentTag() {
  try {
    const tag = execSync('git describe --tags --exact-match', { encoding: 'utf8' }).trim();
    return tag;
  } catch (error) {
    console.error('❌ 当前提交没有对应的 tag');
    console.error('请先创建并推送 tag:');
    console.error('  git tag v1.0.0');
    console.error('  git push origin v1.0.0');
    process.exit(1);
  }
}

// 更新 package.json 版本
function updatePackageVersion(version) {
  const packagePath = resolve(process.cwd(), 'package.json');
  const packageContent = readFileSync(packagePath, 'utf8');
  const packageJson = JSON.parse(packageContent);
  
  packageJson.version = version;
  writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
  
  console.log(`✅ 已更新 package.json 版本为: ${version}`);
}

// 构建项目
function buildProject(version) {
  console.log(`🚀 开始构建版本: ${version}`);
  
  try {
    // 使用环境变量传递版本号
    const env = { ...process.env, VITE_APP_VERSION: version };
    execSync('npm run build', { 
      stdio: 'inherit',
      env
    });
    console.log('✅ 构建完成');
  } catch (error) {
    console.error('❌ 构建失败:', error.message);
    process.exit(1);
  }
}

// 主函数
function main() {
  console.log('🔍 检查当前 git tag...');
  
  const tag = getCurrentTag();
  const version = tag.startsWith('v') ? tag.substring(1) : tag;
  
  console.log(`📦 检测到 tag: ${tag}, 版本号: ${version}`);
  
  updatePackageVersion(version);
  buildProject(version);
  
  console.log('🎉 构建完成！');
  console.log(`📁 输出目录: dist/`);
  console.log(`🏷️  版本: ${version}`);
}

main(); 