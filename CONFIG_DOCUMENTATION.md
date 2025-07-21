# 飞行棋游戏配置文档

## 概述

本文档详细说明了飞行棋游戏的配置数据结构，方便后续新版本的适配和配置文件的导入导出。

## 配置数据结构

### 1. 导出文件格式

```json
{
  "version": "1.0.0",
  "exportedAt": "2025-07-20T10:30:00.000Z",
  "gameTitle": "飞行棋配置",
  "description": "游戏配置导出文件",
  "data": {
    "playerSettings": { ... },
    "punishmentConfig": { ... },
    "boardConfig": { ... },
    "trapConfig": [ ... ],
    "boardContent": { ... }
  }
}
```

### 2. 玩家设置 (playerSettings)

```typescript
interface PlayerSettings {
  playerCount: number // 玩家数量 (2-4)
  playerNames: string[] // 玩家姓名列表
}
```

**示例：**

```json
{
  "playerCount": 3,
  "playerNames": ["玩家1", "玩家2", "玩家3"]
}
```

### 3. 惩罚配置 (punishmentConfig)

```typescript
interface PunishmentConfig {
  tools: PunishmentTool[] // 惩罚工具列表
  bodyParts: BodyPart[] // 身体部位列表
  positions: Position[] // 惩罚姿势列表
  countRange: {
    // 惩罚次数范围
    min: number
    max: number
    step: number
  }
  maxTakeoffFailures: number // 最大起飞失败次数
}

interface PunishmentTool {
  name: string // 工具名称
  intensity: number // 强度等级 (1-5)
  ratio: number // 出现比例 (0-100)
}

interface BodyPart {
  name: string // 部位名称
  sensitivity: number // 敏感度 (1-5)
  ratio: number // 出现比例 (0-100)
}

interface Position {
  name: string // 姿势名称
  ratio: number // 出现比例 (0-100)
}
```

### 4. 棋盘配置 (boardConfig)

```typescript
interface BoardConfig {
  punishmentCells: number // 惩罚格子数量
  rewardCells: number // 奖励格子数量
  backwardCells: number // 后退格子数量
  forwardCells: number // 前进格子数量
  trapCells: number // 机关格子数量
  safeCells: number // 安全格子数量
  startCells: number // 起点格子数量
  endCells: number // 终点格子数量
}
```

### 5. 机关配置 (trapConfig)

```typescript
interface TrapAction {
  id: string // 机关ID
  name: string // 机关名称
  description: string // 机关描述
  type: 'punishment' | 'reward' | 'movement' | 'special'
  effect?: {
    // 机关效果
    type: string
    value?: number
    target?: string
  }
}
```

### 6. 棋盘布局 (boardContent)

```typescript
interface BoardContent {
  seed: string // 随机种子
  board: BoardCell[] // 完整棋盘布局
  generatedAt: number // 生成时间戳
}

interface BoardCell {
  id: number // 格子ID
  type: CellType // 格子类型
  position: {
    // 格子位置
    x: number
    y: number
  }
  content?: any // 格子内容
}
```

## 版本兼容性

### 当前版本：1.0.0

- 支持所有基础配置项
- 支持JSON格式导入导出
- 支持二维码格式导入导出

### 版本升级指南

当需要升级配置格式时：

1. **向后兼容**：新版本应能读取旧版本的配置文件
2. **版本检查**：导入时检查版本号，提供适当的转换
3. **字段扩展**：新增字段应提供默认值
4. **废弃字段**：标记为废弃但保持兼容性

### 导入验证规则

1. **必需字段验证**：确保所有必需字段存在
2. **数据类型验证**：检查字段类型是否正确
3. **数值范围验证**：检查数值是否在有效范围内
4. **引用完整性**：检查配置项之间的引用关系

## 最佳实践

### 配置文件命名

建议使用以下命名格式：

```
飞行棋-[配置类型]-[时间戳].json
```

示例：

- `飞行棋-完整配置-20250720T103000.json`
- `飞行棋-玩家-惩罚-20250720T103000.json`

### 配置分享

1. **JSON文件**：适合完整配置的分享和备份
2. **二维码**：适合快速分享简单配置
3. **配置描述**：为配置文件添加有意义的描述

### 安全注意事项

1. **数据验证**：导入前验证配置数据的完整性
2. **敏感信息**：避免在配置中包含敏感个人信息
3. **文件来源**：只导入来自可信来源的配置文件

## 错误处理

### 常见错误类型

1. **格式错误**：JSON格式不正确
2. **版本不兼容**：配置版本过新或过旧
3. **数据缺失**：必需字段缺失
4. **数值超范围**：配置值超出有效范围
5. **引用错误**：配置项之间引用关系错误

### 错误恢复策略

1. **默认值填充**：为缺失字段提供合理默认值
2. **数据修正**：自动修正超范围的数值
3. **用户确认**：对于重要修改需要用户确认
4. **回滚机制**：导入失败时恢复原始配置

## 新功能说明

### 二维码功能

#### 二维码导出

- 支持将配置数据生成为二维码图片
- 可自定义二维码样式（颜色、大小、错误纠正级别等）
- 适合小量数据的快速分享
- 支持预览和保存功能

#### 二维码导入

- 支持扫描二维码图片导入配置
- 自动解析二维码中的JSON数据
- 注意：当前版本需要额外的二维码解析库支持

### 导入功能增强

#### 多种导入方式

1. **文件导入**：支持JSON文件和二维码图片
2. **文本导入**：直接粘贴配置数据
3. **拖拽导入**：拖拽文件到指定区域

#### 数据验证

- 导入前自动验证数据格式
- 检查必需字段和数据类型
- 提供详细的错误信息和修复建议

#### 安全机制

- 导入前自动备份当前配置
- 支持一键恢复备份
- 数据冲突时提供选择性合并

### 用户界面改进

#### 模式切换

- 统一的导出/导入界面
- 清晰的模式标签切换
- 直观的操作流程指引

#### 配置文档

- 内置配置说明文档
- 实时帮助和提示
- 最佳实践指南

## 扩展性设计

### 新增配置类型

1. 在 `ExportOptions` 中添加新的布尔字段
2. 在 `ExportData.data` 中添加对应的数据字段
3. 在导出/导入逻辑中处理新的配置类型
4. 更新版本号和文档

### 自定义配置

支持用户自定义配置项，通过 `customConfig` 字段扩展：

```json
{
  "data": {
    "customConfig": {
      "userDefinedField1": "value1",
      "userDefinedField2": "value2"
    }
  }
}
```

## 使用示例

### 导出配置

```javascript
// 导出JSON文件
const result = exportToJson(
  {
    playerSettings: true,
    punishmentConfig: true,
    boardConfig: true,
  },
  currentBoard
)

// 导出二维码
const qrResult = await exportToQRCode(
  {
    playerSettings: true,
    punishmentConfig: false,
    boardConfig: false,
  },
  currentBoard,
  {
    width: 256,
    color: { dark: '#000', light: '#fff' },
  }
)
```

### 导入配置

```javascript
// 从JSON字符串导入
const importResult = importFromJson(jsonString, {
  validateData: true,
  backupCurrent: true,
})

// 从文件导入
const fileResult = await importFromQRCode(imageFile)
```
