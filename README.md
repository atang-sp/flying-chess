# 🎲 惩罚飞行棋游戏

一个基于Vue 3 + TypeScript的环形棋盘游戏，支持自定义惩罚设置。

## ✨ 功能特性

- 🎲 40格环形棋盘布局
- 🎯 自定义惩罚工具、部位、姿势和比例
- ⚡ 动态惩罚格子（骰子倍数、其他玩家决定等）
- 🎁 奖励格子（前进、后退、跳过等）
- 🔄 回到起点格子
- 📱 移动端优化，支持触摸操作
- 🖱️ 格子浮窗显示详细信息
- 👤 单人惩罚模式

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 🎮 游戏玩法

1. **开始游戏**：点击开始进入游戏
2. **查看说明**：了解游戏规则和玩法
3. **配置惩罚**：设置工具、部位、姿势和比例
4. **开始游戏**：轮流掷骰子，移动棋子，触发惩罚效果

### 格子类型
- **普通格子**：无特殊效果
- **惩罚格子**：触发自定义惩罚
- **奖励格子**：前进指定步数
- **特殊格子**：跳过回合或后退
- **回到起点**：返回起始位置

## 🛠️ 技术栈

- **前端框架**：Vue 3 + TypeScript
- **构建工具**：Vite
- **样式**：CSS3 + 响应式设计
- **状态管理**：Vue 3 Composition API

## 📁 项目结构

```
src/
├── components/     # Vue组件
├── services/       # 游戏逻辑服务
├── types/          # TypeScript类型定义
├── config/         # 游戏配置
└── assets/         # 静态资源
```

## 🌐 部署

### 方法一：GitHub Pages（推荐）

```bash
# 构建并复制到docs文件夹
npm run deploy:docs

# 提交并推送
git add docs/
git commit -m "Deploy to GitHub Pages"
git push origin main
```

然后在GitHub仓库设置中：
1. 进入 Settings > Pages
2. Source 选择 "Deploy from a branch"
3. Branch 选择 "main"
4. Folder 选择 "/docs"
5. 保存设置

### 方法二：GitHub Actions

推送代码后，GitHub Actions会自动构建并部署到gh-pages分支。

### 方法三：Vercel/Netlify

1. 连接GitHub仓库
2. 构建命令：`npm run build`
3. 输出目录：`dist`

## �� 许可证

MIT License
