#!/bin/bash

# 手动部署脚本
echo "🚀 开始部署到GitHub Pages..."

# 构建项目
echo "📦 构建项目..."
npm run build

# 检查构建是否成功
if [ ! -d "dist" ]; then
    echo "❌ 构建失败，dist目录不存在"
    exit 1
fi

echo "✅ 构建成功"

# 提示用户手动上传
echo ""
echo "📋 下一步操作："
echo "1. 进入GitHub仓库设置"
echo "2. 找到 Pages 设置"
echo "3. Source 选择 'Deploy from a branch'"
echo "4. Branch 选择 'main' 或 'master'"
echo "5. Folder 选择 '/ (root)'"
echo "6. 保存设置"
echo ""
echo "或者使用以下命令手动上传dist文件夹内容："
echo "git add dist/"
echo "git commit -m 'Deploy to GitHub Pages'"
echo "git push origin main"
echo ""
echo "🎉 部署完成！" 