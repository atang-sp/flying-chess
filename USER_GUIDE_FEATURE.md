# 用户引导功能说明

## 功能概述

基于 Driver.js 库实现的用户引导功能，为飞行棋游戏的各个页面提供详细的使用指导。

## 主要特性

### 1. 分页面引导

每个页面都有专门的引导教程：

- **开始页面引导**：介绍游戏标题、玩家设置、游戏特色和开始按钮
- **棋盘设置页面引导**：格子数量配置、机关陷阱配置、起飞失败设置和操作按钮
- **惩罚设置页面引导**：工具设置、身体部位、受罚姿势和惩罚次数配置
- **惩罚确认页面引导**：组合列表、组合详情、删除恢复操作、统计信息和操作按钮
- **游戏页面引导**：骰子区域、游戏状态、棋盘和控制按钮

### 2. 智能引导触发

- **手动触发**：点击右下角的帮助按钮查看当前页面引导
- **自动触发**：首次访问页面时自动显示引导（可关闭）
- **状态记忆**：记住用户已看过的引导，避免重复显示

### 自动引导机制

**触发条件**：

- 页面加载完成后自动检查
- 游戏状态切换时自动检查
- 特定弹窗显示时自动检查
- 仅在特定页面触发：开始页面、棋盘设置、惩罚设置、游戏页面
- 仅在特定弹窗触发：惩罚确认弹窗

**双重保障**：

```typescript
// 页面状态变化时的引导
nextTick(() => {
  if (['intro', 'board_settings', 'settings'].includes(currentStatus)) {
    showAutoGuide(currentStatus)
  }
})

// 延迟检查（确保页面完全渲染）
setTimeout(() => {
  if (['intro', 'board_settings', 'settings'].includes(currentStatus)) {
    showAutoGuide(currentStatus)
  }
}, 1200)

// 惩罚确认弹窗的引导
watch(() => showPunishmentConfirmation.value, (newValue) => {
  if (newValue) {
    setTimeout(() => {
      showAutoGuide('punishment_confirmation')
    }, 500)
  }
})

// 游戏页面的引导
else if (newStatus === 'waiting' && !['waiting', 'rolling', 'moving', 'showing_effect'].includes(oldStatus)) {
  showAutoGuide('game')
}
```

**调试功能**：

- 打开浏览器控制台可以看到详细的调试信息
- 包括引导触发状态、页面类型、开关状态等

### 3. 引导设置管理

左下角的设置按钮提供：

- **自动引导开关**：控制是否在首次访问页面时自动显示引导
- **重置引导状态**：清除已看过的引导记录，重新触发自动引导
- **设置持久化**：引导偏好保存在本地存储中

## 使用方法

### 查看页面引导

1. 在任意页面点击右下角的**"❓ 帮助"**按钮
2. 系统会根据当前页面显示对应的引导教程
3. 使用**"下一步"**、**"上一步"**按钮浏览引导步骤
4. 点击**"完成"**或**"×"**关闭引导

### 管理引导设置

1. 点击左下角的**"⚙️"**设置按钮
2. 在弹出菜单中：
   - 勾选/取消**"自动显示引导"**控制自动引导
   - 点击**"🔄 重置引导"**清除引导状态
3. 点击菜单外部区域关闭设置菜单

## 技术实现

### 依赖库

- **Driver.js v1.3.6**：提供引导功能的核心库
- 零依赖，轻量级（仅 5KB gzipped）

### 核心功能

```typescript
// 根据页面状态选择对应引导
const startGuide = () => {
  switch (gameState.gameStatus) {
    case 'intro':
      startIntroGuide()
      break
    case 'board_settings':
      startBoardSettingsGuide()
      break
    case 'settings':
      startPunishmentSettingsGuide()
      break
    case 'waiting':
    case 'rolling':
    case 'moving':
    case 'showing_effect':
      startGameGuide()
      break
    default:
      startDefaultGuide()
  }
}
```

### 自动引导机制

```typescript
// 监听页面状态变化
watch(
  () => gameState.gameStatus,
  (newStatus, oldStatus) => {
    if (oldStatus && newStatus !== oldStatus) {
      if (['intro', 'board_settings', 'settings'].includes(newStatus)) {
        showAutoGuide(newStatus)
      }
    }
  }
)
```

### 状态持久化

- 使用 `localStorage` 保存用户偏好
- 自动引导开关：`autoGuideEnabled`
- 已看过的引导：`hasShownGuide`

## 引导内容

### 开始页面

1. 游戏标题和介绍
2. 玩家设置区域
3. 游戏特色展示
4. 开始游戏按钮

### 棋盘设置页面

1. 页面标题和说明
2. 格子数量配置
3. 机关陷阱配置
4. 起飞失败设置
5. 页面操作按钮

### 惩罚设置页面

1. 页面标题和说明
2. 惩罚工具配置
3. 身体部位设置
4. 受罚姿势配置
5. 惩罚次数范围

### 游戏页面

1. 骰子操作区域
2. 游戏状态面板
3. 主要游戏棋盘
4. 游戏控制按钮

## 样式特性

- **响应式设计**：适配桌面端和移动端
- **半透明效果**：使用 backdrop-filter 实现毛玻璃效果
- **动画效果**：流畅的淡入动画和悬停效果
- **固定定位**：引导按钮和设置始终可见

## 自定义配置

Driver.js 配置参数：

```typescript
const driver = createDriver({
  allowClose: true, // 允许关闭引导
  overlayOpacity: 0.4, // 遮罩层透明度
  nextBtnText: '下一步', // 下一步按钮文字
  prevBtnText: '上一步', // 上一步按钮文字
  doneBtnText: '完成', // 完成按钮文字
})
```

## 未来扩展

- 添加更多引导步骤细节
- 支持引导步骤的动态配置
- 添加引导完成度统计
- 支持多语言引导内容

### 快速测试引导功能

```
清空缓存 → 刷新页面 → 自动弹出引导
```

### 验证状态记忆

1. **完成一次引导**
2. **重新进入相同页面**
3. **应该不会再次弹出自动引导**

### 开关控制测试

1. **取消勾选"自动显示引导"**
2. **点击"重置引导"**
3. **重新访问页面，应该不会自动弹出引导**

### 首页清空缓存功能

**新增功能**：在游戏首页添加了"清空缓存"按钮

- **位置**：首页"开始游戏"按钮下方
- **功能**：一键清空所有缓存数据，重新触发引导
- **操作**：点击后显示成功提示，刷新页面即可重新体验引导
- **用途**：适合用户重新学习功能或开发者测试引导效果

详细说明请参考：`CLEAR_CACHE_FEATURE.md`

详细测试说明请参考：`AUTO_GUIDE_TEST_INSTRUCTIONS.md`
