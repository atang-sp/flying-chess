# 自适应棋盘布局系统

## 概述

针对移动端棋盘显示不全的问题，特别是120个格子的超大棋盘，我们实现了一套根据屏幕大小自适应调整棋盘布局的方案。

## 核心功能

### 1. 智能布局算法

- **动态行列计算**：根据屏幕尺寸和格子数量自动计算最优的行列比例
- **屏幕适配**：针对不同设备类型（桌面端、平板、手机）优化布局参数
- **格子大小自适应**：根据可用空间动态调整格子尺寸，确保最佳的视觉体验

### 2. 缩放与滚动支持

- **智能缩放**：当棋盘超出屏幕时，自动计算合适的初始缩放比例
- **手动缩放控制**：提供缩放按钮，支持30%-200%的缩放范围
- **双击缩放**：双击棋盘可以在正常大小和放大之间切换
- **平滑滚动**：支持触摸滚动查看整个棋盘

### 3. 移动端优化

- **触摸友好**：优化触摸目标大小，提供良好的触摸体验
- **横竖屏适配**：自动适应设备方向变化
- **性能优化**：使用CSS Grid和transform实现高性能的布局

## 技术实现

### 布局算法核心

```javascript
// 根据屏幕尺寸计算最佳布局参数
const layoutParams = computed(() => {
  const totalCells = props.board.length
  const isMobile = screenWidth.value <= 768
  const isSmallMobile = screenWidth.value <= 480
  const isLandscape = screenWidth.value > screenHeight.value

  // 获取可用空间（考虑UI元素占用）
  let availableWidth = screenWidth.value
  let availableHeight = screenHeight.value
  
  if (isMobile) {
    availableWidth -= 32 // 左右padding
    availableHeight -= isLandscape ? 120 : 200 // UI元素空间
  } else {
    availableWidth -= 200 // 桌面端侧边栏
    availableHeight -= 150
  }

  // 动态计算最优行列数
  let targetAspectRatio = availableWidth / availableHeight
  
  // 限制宽高比避免极端布局
  if (isLandscape && isMobile) {
    targetAspectRatio = Math.min(targetAspectRatio, 2.5)
  } else if (isMobile) {
    targetAspectRatio = Math.max(targetAspectRatio, 0.6)
  }

  // 计算最佳列数和行数
  let cols = Math.ceil(Math.sqrt(totalCells * targetAspectRatio))
  let rows = Math.ceil(totalCells / cols)

  // 针对移动端的特殊优化
  if (isMobile) {
    if (totalCells <= 40) {
      cols = isSmallMobile ? Math.min(cols, 6) : Math.min(cols, 8)
    } else if (totalCells <= 80) {
      cols = isSmallMobile ? Math.min(cols, 8) : Math.min(cols, 10)
    } else {
      // 大棋盘：强制使用更多行，减少列数
      cols = isSmallMobile ? Math.min(cols, 10) : Math.min(cols, 12)
    }
    rows = Math.ceil(totalCells / cols)
  }

  // 计算格子大小和间距
  const cellGap = isMobile ? (isSmallMobile ? 2 : 4) : 8
  const maxCellWidth = Math.floor((availableWidth - (cols - 1) * cellGap) / cols)
  const maxCellHeight = Math.floor((availableHeight - (rows - 1) * cellGap) / rows)
  
  let cellSize = Math.min(maxCellWidth, maxCellHeight)
  
  // 设置格子大小范围
  if (isMobile) {
    cellSize = Math.max(28, Math.min(cellSize, isSmallMobile ? 50 : 70))
  } else {
    cellSize = Math.max(50, Math.min(cellSize, 80))
  }

  return {
    cols, rows, cellSize, cellGap,
    totalWidth: cols * cellSize + (cols - 1) * cellGap,
    totalHeight: rows * cellSize + (rows - 1) * cellGap,
    isMobile, isSmallMobile,
    needsScroll: /* 是否需要滚动 */
  }
})
```

### 缩放控制

```javascript
const resetZoom = () => {
  const { needsScroll, totalWidth, totalHeight, isMobile } = layoutParams.value
  if (needsScroll) {
    const padding = isMobile ? 32 : 64
    const uiHeight = isMobile ? 160 : 200
    const widthScale = (screenWidth.value - padding) / totalWidth
    const heightScale = (screenHeight.value - uiHeight) / totalHeight
    zoomLevel.value = Math.min(widthScale, heightScale, 1)
  } else {
    zoomLevel.value = 1
  }
}
```

## 使用场景

### 小棋盘 (≤40格)
- **桌面端**：正常显示，格子大小适中
- **移动端**：6-8列布局，格子紧凑但清晰

### 中等棋盘 (40-80格)
- **桌面端**：自适应行列比例，保持良好视觉效果
- **移动端**：8-10列布局，提供滚动和缩放功能

### 大棋盘 (80-120格)
- **桌面端**：智能布局，必要时提供缩放功能
- **移动端**：10-12列布局，自动缩放到合适比例，支持手动调整

## 用户体验特性

### 桌面端
- 鼠标悬停显示格子详情
- 点击交互流畅
- 自动适应窗口大小变化

### 移动端
- 触摸友好的界面
- 双击缩放快捷操作
- 滑动查看大棋盘
- 操作提示引导
- 防误触优化

## 性能优化

1. **CSS Grid布局**：使用现代CSS Grid替代Flexbox，提供更好的性能
2. **动态计算**：使用Vue的computed属性，确保只在必要时重新计算
3. **硬件加速**：使用CSS transform进行缩放，启用GPU加速
4. **事件优化**：合理使用防抖和节流，避免频繁重新计算

## 测试用例

项目中包含了一个120格大棋盘的配置示例：`configs/large-board-demo.json`

可以通过以下方式测试：
1. 导入该配置文件
2. 在不同设备上查看棋盘显示效果
3. 测试缩放和滚动功能
4. 验证横竖屏切换的适配效果

## 总结

这套自适应棋盘布局系统有效解决了移动端大棋盘显示不全的问题，提供了：

- ✅ 智能的行列比例计算
- ✅ 自动缩放到合适大小
- ✅ 流畅的滚动和缩放体验
- ✅ 全设备兼容性
- ✅ 高性能的渲染效果

无论是40格的小棋盘还是120格的超大棋盘，都能在各种设备上获得良好的用户体验。 