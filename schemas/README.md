# 飞行棋游戏配置格式标准

## 概述

本目录包含飞行棋游戏配置导出格式的 JSON Schema 标准定义。通过这个标准，开发者可以：

- 验证配置文件的格式正确性
- 了解每个字段的含义和约束
- 自动生成配置文件的文档
- 在 IDE 中获得智能提示和验证

## 文件说明

- `game-config.schema.json` - 主要的 JSON Schema 定义文件

## 配置格式结构

### 顶层结构

```json
{
  "version": "1.0.0",           // 配置格式版本号
  "exportedAt": "2025-07-21T14:41:28.380Z",  // 导出时间
  "gameTitle": "飞行棋配置",     // 游戏标题
  "description": "游戏配置导出文件",  // 描述
  "data": {                     // 主要配置数据
    "playerSettings": {...},    // 玩家设置
    "punishmentConfig": {...},  // 惩罚配置
    "boardConfig": {...},       // 棋盘配置
    "trapConfig": [...],        // 陷阱配置（可选）
    "boardContent": {...}       // 棋盘内容
  }
}
```

### 主要配置模块

#### 1. 玩家设置 (PlayerSettings)

- `playerCount`: 玩家数量 (1-8)
- `playerNames`: 玩家名称列表

#### 2. 惩罚配置 (PunishmentConfig)

- `tools`: 惩罚工具列表
- `bodyParts`: 身体部位列表
- `positions`: 姿势列表
- `minStrikes`: 最小打击次数
- `maxStrikes`: 最大打击次数
- `step`: 打击次数步长
- `maxTakeoffFailures`: 最大起飞失败次数

#### 3. 棋盘配置 (BoardConfig)

- `punishmentCells`: 惩罚格子数量
- `bonusCells`: 奖励格子数量
- `reverseCells`: 后退格子数量
- `restCells`: 休息格子数量
- `restartCells`: 重新开始格子数量
- `trapCells`: 陷阱格子数量
- `totalCells`: 总格子数量

#### 4. 棋盘内容 (BoardContent)

- `seed`: 棋盘生成种子
- `board`: 棋盘格子列表

## 使用方法

### 1. 验证配置文件

使用支持 JSON Schema 的工具验证配置文件：

```bash
# 使用 ajv-cli 验证
npm install -g ajv-cli
ajv validate -s schemas/game-config.schema.json -d configs/exported-config-demo.json

# 使用 jsonschema 验证 (Python)
pip install jsonschema
python -c "
import json
import jsonschema
with open('schemas/game-config.schema.json') as f:
    schema = json.load(f)
with open('configs/exported-config-demo.json') as f:
    data = json.load(f)
jsonschema.validate(data, schema)
print('配置文件验证通过！')
"
```

### 2. IDE 集成

在支持 JSON Schema 的 IDE 中（如 VS Code），可以在配置文件顶部添加：

```json
{
  "$schema": "./schemas/game-config.schema.json",
  "version": "1.0.0",
  ...
}
```

这样可以获得：

- 自动补全
- 实时验证
- 字段说明提示

### 3. 编程语言集成

#### JavaScript/Node.js

```javascript
const Ajv = require('ajv')
const schema = require('./schemas/game-config.schema.json')
const config = require('./configs/exported-config-demo.json')

const ajv = new Ajv()
const validate = ajv.compile(schema)
const valid = validate(config)

if (!valid) {
  console.log(validate.errors)
}
```

#### Python

```python
import json
import jsonschema

with open('schemas/game-config.schema.json') as f:
    schema = json.load(f)

with open('configs/exported-config-demo.json') as f:
    config = json.load(f)

try:
    jsonschema.validate(config, schema)
    print("配置验证成功")
except jsonschema.ValidationError as e:
    print(f"配置验证失败: {e.message}")
```

## 字段约束说明

### 标识符规范

- 工具ID、身体部位ID、姿势ID: 只能包含小写字母和下划线 (`^[a-z_]+$`)
- 陷阱ID: 可以包含小写字母、数字和下划线 (`^[a-z_0-9]+$`)
- 棋盘种子: 只能包含小写字母和数字 (`^[a-z0-9]+$`)

### 数值范围

- 强度等级: 1-10
- 敏感度等级: 1-10
- 概率权重: 1-100
- 玩家数量: 1-8

### 字符串长度

- 玩家名称: 1-50 字符
- 工具/部位/姿势名称: 1-50 字符
- 陷阱名称: 1-100 字符
- 游戏标题: 1-100 字符
- 描述字段: 最多 500 字符

## 扩展和版本管理

### 版本兼容性

配置格式使用语义化版本号 (Semantic Versioning)：

- 主版本号：不兼容的 API 修改
- 次版本号：向下兼容的功能性新增
- 修订号：向下兼容的问题修正

### 扩展字段

如需添加新字段，建议：

1. 在 schema 中添加新的可选字段
2. 更新版本号
3. 保持向下兼容性

## 工具推荐

- **在线验证**: [JSON Schema Validator](https://www.jsonschemavalidator.net/)
- **文档生成**: [json-schema-to-markdown](https://github.com/adobe/jsonschema2md)
- **代码生成**: [quicktype](https://quicktype.io/) - 从 JSON Schema 生成多种语言的类型定义
- **VS Code 扩展**: JSON Schema 支持内置，无需额外安装
