# 故障排除指南

## GitHub Actions 部署问题

### 权限错误 (403)

**错误信息：**
```
remote: Permission to atang-sp/flying-chess.git denied to github-actions[bot].
fatal: unable to access 'https://github.com/atang-sp/flying-chess.git/': The requested URL returned error: 403
```

**解决方案：**

1. **检查仓库设置**：
   - 进入 GitHub 仓库 → Settings → Actions → General
   - 确保 "Actions permissions" 设置为 "Allow all actions and reusable workflows"
   - 在 "Workflow permissions" 中选择 "Read and write permissions"
   - 勾选 "Allow GitHub Actions to create and approve pull requests"

2. **检查分支保护**：
   - 进入 Settings → Branches
   - 检查 main/master 分支是否有保护规则
   - 如果有，确保允许 Actions 推送

3. **重新运行 Actions**：
   - 进入 Actions 页面
   - 找到失败的 workflow
   - 点击 "Re-run jobs"

### 替代解决方案

如果 GitHub Actions 仍有问题，可以使用手动部署：

```bash
# 方法1：使用部署脚本
npm run deploy

# 方法2：手动构建和上传
npm run build
# 然后手动上传 dist 文件夹内容到 GitHub Pages
```

## 构建问题

### Node.js 版本问题

**错误信息：**
```
SyntaxError: Unexpected token '?'
```

**解决方案：**
- 确保使用 Node.js 18+ 版本
- 检查 package.json 中的 engines 字段

### 依赖问题

**错误信息：**
```
Cannot find module 'xxx'
```

**解决方案：**
```bash
# 删除 node_modules 和 package-lock.json
rm -rf node_modules package-lock.json

# 重新安装依赖
npm install
```

### TypeScript 错误

**错误信息：**
```
Type 'xxx' is not assignable to type 'xxx'
```

**解决方案：**
- 检查类型定义是否正确
- 确保所有必要的类型都已导入
- 运行 `npm run build` 查看详细错误信息

## 移动端问题

### 样式显示异常

**问题：** 在移动端样式不正确

**解决方案：**
- 检查 viewport meta 标签是否正确
- 确保 CSS 媒体查询正确设置
- 测试不同屏幕尺寸

### 触摸响应问题

**问题：** 按钮点击无响应

**解决方案：**
- 确保按钮有足够的触摸区域（至少 44px）
- 检查是否有重叠的元素阻止点击
- 测试触摸事件是否正确绑定

## 部署后问题

### 404 错误

**问题：** 部署后页面显示 404

**解决方案：**
1. 检查 vite.config.ts 中的 base 路径
2. 确保 GitHub Pages 设置正确
3. 检查文件路径是否正确

### 资源加载失败

**问题：** CSS/JS 文件加载失败

**解决方案：**
- 检查构建后的文件路径
- 确保 base 路径配置正确
- 检查 GitHub Pages 的 URL 结构

## 开发环境问题

### 热重载不工作

**问题：** 代码修改后页面不自动刷新

**解决方案：**
```bash
# 重启开发服务器
npm run dev

# 或者清除缓存
rm -rf node_modules/.vite
npm run dev
```

### 端口被占用

**问题：** 开发服务器启动失败

**解决方案：**
```bash
# 查找占用端口的进程
lsof -i :5173

# 杀死进程
kill -9 <PID>

# 或者使用不同端口
npm run dev -- --port 3000
```

## 性能问题

### 构建文件过大

**解决方案：**
- 检查是否有未使用的依赖
- 启用代码分割
- 优化图片和资源文件

### 加载速度慢

**解决方案：**
- 启用 gzip 压缩
- 使用 CDN 加速
- 优化资源加载顺序

## 常见错误代码

| 错误代码 | 含义 | 解决方案 |
|---------|------|----------|
| 403 | 权限不足 | 检查 GitHub Actions 权限设置 |
| 404 | 文件未找到 | 检查文件路径和 base 配置 |
| 500 | 服务器错误 | 检查构建配置和依赖 |
| ENOENT | 文件不存在 | 检查文件路径和权限 |

## 获取帮助

如果以上解决方案都无法解决问题：

1. **查看日志**：检查浏览器控制台和构建日志
2. **搜索问题**：在 GitHub Issues 中搜索类似问题
3. **创建 Issue**：提供详细的错误信息和复现步骤
4. **社区支持**：在相关技术社区寻求帮助

## 有用的命令

```bash
# 清理和重新安装
rm -rf node_modules package-lock.json
npm install

# 清理构建缓存
rm -rf dist
npm run build

# 检查依赖
npm audit
npm outdated

# 开发调试
npm run dev -- --debug
``` 