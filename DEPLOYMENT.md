# 部署说明

## 移动端适配

本项目已经针对移动端进行了优化：

- 响应式设计，支持各种屏幕尺寸
- 触摸友好的界面元素
- 优化的字体大小和间距
- 适配小屏幕的棋盘布局

## 部署到GitHub Pages

### 自动部署（推荐）

1. 将代码推送到GitHub仓库
2. 在仓库设置中启用GitHub Pages：
   - 进入仓库设置 → Pages
   - Source选择 "GitHub Actions"
3. 推送代码到main/master分支，GitHub Actions会自动构建并部署

### 手动部署

1. 构建项目：
   ```bash
   npm run build
   ```

2. 将`dist`文件夹的内容上传到GitHub Pages

### 自定义域名部署

如果需要使用自定义域名：

1. 修改`vite.config.ts`中的base路径：
   ```typescript
   base: '/', // 根路径
   ```

2. 在GitHub Pages设置中添加自定义域名

## 其他部署选项

### Vercel部署

1. 连接GitHub仓库到Vercel
2. 构建命令：`npm run build`
3. 输出目录：`dist`
4. 自动部署

### Netlify部署

1. 连接GitHub仓库到Netlify
2. 构建命令：`npm run build`
3. 发布目录：`dist`
4. 自动部署

### 传统服务器部署

1. 构建项目：`npm run build`
2. 将`dist`文件夹内容上传到服务器
3. 配置Nginx或Apache指向该目录

## 环境变量

项目使用以下环境变量：

- `VITE_APP_TITLE`: 应用标题（可选）
- `VITE_APP_BASE_URL`: 基础URL（可选）

## 注意事项

- 确保仓库名称为`ludo-vue-demo`，否则需要修改`vite.config.ts`中的base路径
- 首次部署可能需要几分钟时间
- 如果遇到404错误，检查base路径配置是否正确 