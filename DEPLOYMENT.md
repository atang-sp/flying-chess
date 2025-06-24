# 部署说明

## 移动端适配

本项目已经针对移动端进行了优化：

- 响应式设计，支持各种屏幕尺寸
- 触摸友好的界面元素
- 优化的字体大小和间距
- 适配小屏幕的棋盘布局

## 部署到GitHub Pages

### 自动部署（推荐）

1. **推送代码到GitHub仓库**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **启用GitHub Pages**：
   - 进入仓库设置 → Pages
   - Source选择 "GitHub Actions"
   - 保存设置

3. **检查Actions权限**：
   - 进入仓库设置 → Actions → General
   - 确保"Actions permissions"设置为"Allow all actions and reusable workflows"
   - 在"Workflow permissions"中选择"Read and write permissions"

4. **推送代码触发部署**：
   - 推送任何更改到main/master分支
   - GitHub Actions会自动构建并部署

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

## 故障排除

### 权限错误 (403)

如果遇到权限错误，请检查：

1. **仓库设置**：
   - Settings → Actions → General
   - 确保"Actions permissions"为"Allow all actions"
   - "Workflow permissions"选择"Read and write permissions"

2. **分支保护**：
   - Settings → Branches
   - 确保main/master分支没有阻止Actions的规则

3. **重新运行Actions**：
   - 在Actions页面点击"Re-run jobs"

### 构建失败

1. **检查Node.js版本**：确保使用Node.js 18+
2. **检查依赖**：确保package.json中的依赖正确
3. **查看构建日志**：在Actions页面查看详细错误信息

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
- GitHub Actions需要适当的权限才能部署到Pages 