# 飞行棋游戏配置格式标准化方案

## 概述

本文档介绍了飞行棋游戏配置导出格式的标准化实现方案。通过 JSON Schema 标准，我们为游戏配置格式提供了完整的规范定义、验证工具和使用指南。

## 标准化成果

### 1. 核心文件

- **`schemas/game-config.schema.json`** - 主要的 JSON Schema 定义文件
- **`schemas/README.md`** - 详细的使用说明文档
- **`scripts/validate-config.js`** - 配置文件验证脚本
- **`examples/config-with-schema.json`** - 带 Schema 引用的示例配置

### 2. 标准化特性

#### ✅ 完整的数据验证
- 字段类型验证（字符串、整数、数组、对象）
- 数值范围约束（最小值、最大值）
- 字符串长度限制
- 正则表达式格式验证
- 必需字段检查
- 枚举值验证

#### ✅ 详细的文档说明
- 每个字段都有清晰的描述
- 数据类型和约束说明
- 使用示例和最佳实践
- 版本管理指南

#### ✅ 开发者友好的工具
- 命令行验证脚本
- npm 脚本集成
- IDE 智能提示支持
- 实时验证反馈

## 配置格式结构

### 顶层结构
```json
{
  "version": "1.0.0",           // 语义化版本号
  "exportedAt": "ISO8601时间",   // 导出时间戳
  "gameTitle": "游戏标题",       // 游戏名称
  "description": "描述信息",     // 配置描述
  "data": {                     // 主要配置数据
    "playerSettings": {...},    // 玩家设置
    "punishmentConfig": {...},  // 惩罚配置
    "boardConfig": {...},       // 棋盘配置
    "trapConfig": [...],        // 陷阱配置（可选）
    "boardContent": {...}       // 棋盘内容
  }
}
```

### 关键约束规则

#### 标识符规范
- **工具/部位/姿势ID**: `^[a-z_]+$` (小写字母和下划线)
- **陷阱ID**: `^[a-z_0-9]+$` (小写字母、数字和下划线)
- **棋盘种子**: `^[a-z0-9]+$` (小写字母和数字)

#### 数值范围
- **强度/敏感度等级**: 1-10
- **概率权重**: 1-100
- **玩家数量**: 1-8

#### 字符串长度
- **名称字段**: 1-50 字符
- **标题字段**: 1-100 字符
- **描述字段**: 最多 500 字符

## 使用方法

### 1. 验证配置文件

```bash
# 使用 npm 脚本验证
npm run validate-demo              # 验证演示配置
npm run validate-example           # 验证示例配置
npm run validate-config <文件路径> # 验证指定文件

# 直接使用脚本
node scripts/validate-config.js configs/exported-config-demo.json
```

### 2. IDE 集成

在配置文件顶部添加 Schema 引用：
```json
{
  "$schema": "./schemas/game-config.schema.json",
  "version": "1.0.0",
  ...
}
```

这样可以获得：
- ✨ 自动补全
- 🔍 实时验证
- 📖 字段说明提示
- ⚠️ 错误高亮

### 3. 编程集成

#### JavaScript/Node.js
```javascript
import { SimpleValidator } from './scripts/validate-config.js';
import schema from './schemas/game-config.schema.json' assert { type: 'json' };

const validator = new SimpleValidator(schema);
const isValid = validator.validate(configData);
```

#### 其他语言
- **Python**: 使用 `jsonschema` 库
- **Java**: 使用 `everit-org/json-schema` 库
- **C#**: 使用 `Newtonsoft.Json.Schema` 库
- **Go**: 使用 `xeipuuv/gojsonschema` 库

## 标准化优势

### 1. 开发效率提升
- **减少错误**: 自动验证避免格式错误
- **智能提示**: IDE 支持提高编写效率
- **文档自动化**: Schema 即文档，减少维护成本

### 2. 团队协作改善
- **统一标准**: 所有开发者遵循相同格式
- **版本管理**: 清晰的版本控制和兼容性规则
- **易于理解**: 标准化的字段命名和结构

### 3. 生态系统扩展
- **工具集成**: 支持各种 JSON Schema 工具
- **代码生成**: 可自动生成类型定义
- **API 文档**: 可生成 API 接口文档

## 版本管理

### 语义化版本控制
- **主版本号**: 不兼容的 API 修改
- **次版本号**: 向下兼容的功能性新增
- **修订号**: 向下兼容的问题修正

### 兼容性策略
- 新增字段默认为可选
- 废弃字段保留一个主版本周期
- 提供迁移指南和工具
