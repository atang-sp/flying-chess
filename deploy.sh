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
echo "📋 GitHub Pages 部署步骤："
echo ""
echo "方法一：使用 GitHub Actions（推荐）"
echo "1. 推送代码到GitHub：git push origin main"
echo "2. 进入仓库设置：Settings > Pages"
echo "3. Source 选择：'Deploy from a branch'"
echo "4. Branch 选择：'gh-pages'"
echo "5. 保存设置"
echo ""
echo "方法二：手动上传"
echo "1. 进入仓库设置：Settings > Pages"
echo "2. Source 选择：'Deploy from a branch'"
echo "3. Branch 选择：'main' 或 'master'"
echo "4. Folder 选择：'/docs' 或 '/ (root)'"
echo "5. 将dist文件夹内容复制到docs文件夹"
echo "6. 提交并推送："
echo "   git add docs/"
echo "   git commit -m 'Deploy to GitHub Pages'"
echo "   git push origin main"
echo ""
echo "方法三：使用Vercel/Netlify"
echo "1. 连接GitHub仓库"
echo "2. 构建命令：npm run build"
echo "3. 输出目录：dist"
echo ""
echo "🎉 部署完成！" 