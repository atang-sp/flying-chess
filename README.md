# 🎲 惩罚飞行棋游戏

一个基于Vue 3 + TypeScript开发的单机版飞行棋游戏，支持自定义惩罚设置和环形棋盘设计。

## ✨ 功能特性

- 🎯 **单机游戏**：支持4个玩家轮流游戏
- 🎨 **环形棋盘**：美观的不规则环形设计
- ⚙️ **自定义设置**：可配置工具、身体部位、姿势和比例
- 🎲 **3D骰子**：流畅的3D滚动动画
- 🎮 **动态效果**：多种棋盘格子效果
- 📱 **移动端适配**：完美支持手机和平板设备
- 🌐 **在线部署**：支持GitHub Pages等静态托管

## 🚀 快速开始

### 本地开发

```bash
# 克隆项目
git clone https://github.com/your-username/ludo-vue-demo.git
cd ludo-vue-demo

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 构建部署

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 📱 移动端支持

项目已针对移动端进行了全面优化：

- **响应式设计**：自适应各种屏幕尺寸
- **触摸友好**：优化的按钮大小和间距
- **性能优化**：针对移动设备的资源优化
- **界面适配**：小屏幕下的棋盘和控件布局

## 🌐 在线部署

### GitHub Pages（推荐）

1. 推送代码到GitHub仓库
2. 在仓库设置中启用GitHub Pages
3. 选择"GitHub Actions"作为部署源
4. 自动构建和部署

### 其他部署选项

- **Vercel**：连接GitHub仓库，自动部署
- **Netlify**：拖拽dist文件夹或连接GitHub
- **传统服务器**：上传dist文件夹内容

详细部署说明请参考 [DEPLOYMENT.md](./DEPLOYMENT.md)

## 🎮 游戏玩法

1. **开始页面**：点击开始进入游戏
2. **说明页面**：查看游戏规则和玩法
3. **设置页面**：配置惩罚工具、部位、姿势和比例
4. **游戏页面**：轮流掷骰子，移动棋子，触发惩罚效果

### 棋盘效果

- **普通格子**：正常移动
- **惩罚格子**：触发自定义惩罚
- **特殊效果**：双倍移动、跳过回合、位置交换等

## 🛠️ 技术栈

- **前端框架**：Vue 3 + Composition API
- **开发语言**：TypeScript
- **构建工具**：Vite
- **样式**：CSS3 + 响应式设计
- **部署**：GitHub Actions + GitHub Pages

## 📁 项目结构

```
ludo-vue-demo/
├── src/
│   ├── components/     # Vue组件
│   ├── services/       # 游戏逻辑服务
│   ├── types/          # TypeScript类型定义
│   ├── config/         # 游戏配置
│   └── assets/         # 静态资源
├── public/             # 公共资源
├── dist/               # 构建输出
└── .github/workflows/  # GitHub Actions配置
```

## 🔧 自定义配置

### 游戏配置

在 `src/config/gameConfig.ts` 中可以修改：

- 棋盘大小和布局
- 默认工具和身体部位
- 游戏规则和效果

### 样式定制

- 主样式：`src/assets/main.css`
- 组件样式：各组件内的 `<style>` 部分
- 响应式断点：768px 和 480px

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License

## 🔗 相关链接

- [Vue 3 文档](https://vuejs.org/)
- [Vite 文档](https://vitejs.dev/)
- [TypeScript 文档](https://www.typescriptlang.org/)
- [GitHub Pages 文档](https://pages.github.com/)
