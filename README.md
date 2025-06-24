# 🎲 飞行棋游戏

一个基于 Vue 3 + TypeScript 构建的经典蛇梯棋游戏，支持多人轮流对战。

## ✨ 功能特性

- 🎮 **完整的游戏逻辑**：包含骰子、移动、胜利检测等核心功能
- 🎨 **精美的动画效果**：骰子滚动动画、棋子移动动画
- 🎯 **可自定义棋盘**：支持梯子、蛇、特殊格子等多种格子类型
- 👥 **多人游戏**：支持4个玩家轮流对战
- 📱 **响应式设计**：适配桌面和移动设备
- 🎪 **游戏控制**：开始、暂停、重置游戏功能
- 📊 **实时状态显示**：玩家位置、进度、游戏状态等信息

## 🎯 游戏规则

1. **游戏目标**：第一个到达第100格的玩家获胜
2. **游戏流程**：
   - 玩家轮流投掷骰子（1-6点）
   - 根据骰子点数移动棋子
   - 遇到特殊格子会触发相应效果
3. **特殊格子**：
   - 🪜 **梯子**：向上移动到更高位置
   - 🐍 **蛇**：向下移动到更低位置
   - ⭐ **特殊格子**：触发特殊效果（跳过回合、后退等）

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

## 🛠️ 技术栈

- **前端框架**：Vue 3
- **开发语言**：TypeScript
- **构建工具**：Vite
- **样式**：CSS3 + 动画效果
- **状态管理**：Vue 3 Composition API

## 📁 项目结构

```
src/
├── components/          # Vue组件
│   ├── Dice.vue        # 骰子组件
│   ├── GameBoard.vue   # 棋盘组件
│   ├── GameControls.vue # 游戏控制组件
│   └── PlayerPanel.vue # 玩家面板组件
├── services/           # 服务层
│   └── gameService.ts  # 游戏逻辑服务
├── types/              # TypeScript类型定义
│   └── game.ts         # 游戏相关类型
├── assets/             # 静态资源
├── App.vue             # 主应用组件
└── main.ts             # 应用入口
```

## 🎮 游戏组件说明

### Dice.vue
- 骰子组件，包含滚动动画效果
- 支持点击投掷功能
- 显示当前点数

### GameBoard.vue
- 10x10的棋盘布局
- 蛇形排列的格子编号
- 显示玩家棋子位置
- 支持格子点击交互

### PlayerPanel.vue
- 显示所有玩家状态
- 当前玩家高亮显示
- 玩家进度条显示

### GameControls.vue
- 游戏控制按钮（开始、暂停、重置）
- 游戏状态和回合数显示
- 游戏结束提示

## 🎨 自定义功能

### 修改棋盘配置
在 `src/services/gameService.ts` 中的 `createBoard()` 方法可以自定义：
- 梯子位置和效果
- 蛇的位置和效果
- 特殊格子的类型和效果

### 修改玩家配置
在 `src/services/gameService.ts` 中的 `createPlayers()` 方法可以：
- 修改玩家数量
- 自定义玩家颜色
- 修改玩家名称

### 添加新的格子类型
在 `src/types/game.ts` 中可以扩展格子类型：
```typescript
interface BoardCell {
  type: 'normal' | 'ladder' | 'snake' | 'special' | 'your-new-type';
  effect?: {
    type: 'move' | 'skip' | 'reverse' | 'your-new-effect';
    value: number;
    description: string;
  };
}
```

## 🐛 已知问题

- 暂无已知问题

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## �� 许可证

MIT License
