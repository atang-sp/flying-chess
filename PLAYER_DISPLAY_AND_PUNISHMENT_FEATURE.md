# 玩家显示和惩罚执行者功能

## 功能概述

在棋盘页面新增了当前回合玩家名字的显示，以及惩罚执行者的随机选择功能。当玩家被惩罚时，系统会等概率随机选择其他玩家来执行惩罚。

## 功能特性

### 1. 当前回合玩家显示

- **位置**: 在GameControls组件中显示
- **内容**: 显示当前回合玩家的头像、颜色和名字
- **样式**: 采用与玩家颜色一致的头像，突出显示当前玩家
- **响应式**: 支持移动端显示

### 2. 惩罚执行者随机选择

- **等概率随机**: 系统会等概率随机选择除当前玩家外的其他玩家
- **显示执行者**: 在惩罚弹窗中显示执行惩罚的玩家信息
- **头像显示**: 显示执行者的头像和名字
- **颜色标识**: 使用执行者的专属颜色

### 3. 技术实现

- **GameControls组件**: 新增当前玩家信息显示
- **PunishmentDisplay组件**: 新增执行惩罚玩家信息显示
- **GameService**: 修改惩罚执行者选择逻辑
- **App.vue**: 新增执行惩罚玩家状态管理

## 技术细节

### 1. 当前玩家显示

```typescript
// GameControls组件新增Props
interface Props {
  // ... 其他props
  players: Player[]
  currentPlayerIndex: number
}

// 计算当前玩家
const currentPlayer = computed(() => {
  return props.players[props.currentPlayerIndex] || null
})
```

### 2. 惩罚执行者选择

```typescript
// GameService中的等概率随机选择逻辑
const otherPlayerIndices = []
for (let i = 0; i < totalPlayers; i++) {
  if (i !== currentPlayerIndex) {
    otherPlayerIndices.push(i)
  }
}
const randomIndex = Math.floor(Math.random() * otherPlayerIndices.length)
executorIndex = otherPlayerIndices[randomIndex]
```

### 3. 执行者信息显示

```typescript
// PunishmentDisplay组件新增Props
interface Props {
  punishment: PunishmentAction | null
  executorPlayer?: Player | null
}
```

## 样式设计

### 1. 当前玩家信息样式

- 背景渐变效果
- 玩家头像（圆形，使用玩家颜色）
- 玩家名字（粗体显示）
- 边框高亮效果

### 2. 执行惩罚玩家信息样式

- 独立的执行者信息区域
- 执行者头像和名字
- 与惩罚内容区分显示
- 响应式布局

## 用户体验

### 1. 游戏流程

1. 玩家可以看到当前是谁的回合
2. 当触发惩罚时，系统随机选择执行者
3. 在惩罚弹窗中显示执行者信息
4. 玩家确认或跳过惩罚后，继续游戏

### 2. 视觉反馈

- 当前玩家信息突出显示
- 执行者信息清晰可见
- 颜色一致性保持
- 动画效果流畅

## 兼容性

- 完全向后兼容，不影响现有功能
- 支持所有现有的游戏功能
- 响应式设计，适配各种屏幕尺寸
- 支持多玩家游戏（2-8人）

## 注意事项

- 执行者选择是等概率随机的，确保公平性
- 当前玩家不会被选为执行者
- 如果只有一个玩家，则不显示执行者信息
- 所有状态在游戏重置时会被正确清除
