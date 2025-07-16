# 游戏页面自动引导功能修复

## 问题描述

用户反馈"棋盘页面没有自动开始用户引导"，即游戏主页面（棋盘页面）在首次进入时不会自动显示用户引导。

## 问题原因

在原有的游戏状态监听器中，只有以下页面会触发自动引导：

```typescript
if (['intro', 'board_settings', 'settings'].includes(newStatus)) {
  showAutoGuide(newStatus)
}
```

**遗漏的问题**：游戏页面的状态（如 `waiting`、`rolling`、`moving`、`showing_effect`）没有包含在自动引导触发条件中。

## 解决方案

### 1. 分析游戏页面状态

游戏页面主要有以下状态：

- `waiting` - 等待玩家操作（主要游戏状态）
- `rolling` - 掷骰子中
- `moving` - 移动中
- `showing_effect` - 显示效果
- `finished` - 游戏结束
- `configuring` - 配置中

其中 `waiting` 是玩家实际游戏时的主要状态，应该在首次进入时显示引导。

### 2. 修改状态监听器

在 `src/App.vue` 中的游戏状态监听器添加游戏页面的自动引导逻辑：

```typescript
// 监听游戏状态变化，自动显示引导
watch(
  () => gameState.gameStatus,
  (newStatus, oldStatus) => {
    console.log(`游戏状态变化: ${oldStatus} -> ${newStatus}`)
    if (oldStatus && newStatus !== oldStatus) {
      // 仅在特定页面自动显示引导
      if (['intro', 'board_settings', 'settings'].includes(newStatus)) {
        showAutoGuide(newStatus)
      }
      // 当进入游戏页面时（waiting状态），显示游戏引导
      else if (
        newStatus === 'waiting' &&
        !['waiting', 'rolling', 'moving', 'showing_effect'].includes(oldStatus)
      ) {
        // 只有从非游戏状态进入waiting状态时才显示引导（避免游戏过程中重复显示）
        showAutoGuide('game')
      }
    }
  }
)
```

### 3. 更新引导分发逻辑

修改 `showAutoGuide()` 函数，支持 `game` 页面类型：

```typescript
const showAutoGuide = (pageType: string) => {
  if (autoGuideEnabled.value && !hasShownGuide.value.has(pageType)) {
    setTimeout(() => {
      // 针对特定页面，直接调用专门的引导函数
      if (pageType === 'punishment_confirmation') {
        startPunishmentConfirmationGuide()
      } else if (pageType === 'game') {
        startGameGuide()
      } else {
        startGuide()
      }
      hasShownGuide.value.add(pageType)
    }, 800)
  }
}
```

## 技术细节

### 1. 智能触发条件

```typescript
newStatus === 'waiting' && !['waiting', 'rolling', 'moving', 'showing_effect'].includes(oldStatus)
```

**逻辑说明**：

- 只有当新状态是 `waiting` 时才触发
- 且旧状态不能是游戏相关状态（避免游戏过程中重复触发）
- 确保只在"首次进入游戏"时显示引导

### 2. 状态转换场景

**会触发游戏页面引导的转换**：

- `settings` → `waiting` （从惩罚设置进入游戏）
- `intro` → `waiting` （跳过设置直接开始）
- `board_settings` → `waiting` （跳过惩罚设置）

**不会触发的转换**：

- `waiting` → `rolling` → `waiting` （游戏过程中的状态切换）
- `moving` → `waiting` （移动结束回到等待）
- `showing_effect` → `waiting` （效果显示结束）

### 3. 引导内容

游戏页面引导包含以下步骤：

1. **骰子区域** - 介绍如何掷骰子
2. **游戏状态** - 显示当前回合和玩家信息
3. **游戏棋盘** - 主要游戏区域
4. **控制按钮** - 游戏控制功能

## 测试验证

### 测试步骤

1. **完整流程测试**
   - 清空缓存，从首页开始
   - 完成棋盘设置 → 惩罚设置 → 惩罚确认
   - 点击"确认组合"进入游戏页面
   - 观察是否自动显示游戏引导

2. **状态跳转测试**
   - 测试从不同页面跳转到游戏页面
   - 确认只在首次进入时显示引导

3. **重复游戏测试**
   - 游戏结束后点击"再来一局"
   - 确认不会重复显示引导（除非重置状态）

### 期望结果

- ✅ 首次进入游戏页面时自动显示引导
- ✅ 游戏过程中的状态切换不会重复触发引导
- ✅ 引导内容正确定位到游戏页面的关键元素
- ✅ 状态管理与其他页面引导保持一致

## 文档更新

### 1. 功能文档

- **USER_GUIDE_FEATURE.md**: 添加游戏页面到触发条件中
- **AUTO_GUIDE_TEST_INSTRUCTIONS.md**: 新增游戏页面测试步骤

### 2. 调试信息

浏览器控制台会显示：

```
游戏状态变化: settings -> waiting
检查自动引导 - 页面类型: game, 自动引导开启: true, 已显示过: false
准备显示自动引导 - 页面: game
执行自动引导 - 页面: game
```

## 技术优势

1. **精确控制**: 只在需要的时候触发，避免过度打扰用户
2. **状态感知**: 能区分首次进入和游戏过程中的状态切换
3. **兼容性**: 与现有引导系统完全兼容
4. **可扩展**: 为未来添加更多游戏状态引导提供基础

## 解决效果

- **问题**: 棋盘页面没有自动开始用户引导 ❌
- **修复**: 游戏页面现在会在首次进入时自动显示引导 ✅
- **用户体验**: 用户在所有主要页面都能获得完整的引导帮助 ✅
