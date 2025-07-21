#!/usr/bin/env node

/**
 * 游戏配置文件验证脚本
 * 使用 JSON Schema 验证配置文件的格式正确性
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 简单的 JSON Schema 验证器实现
class SimpleValidator {
  constructor(schema) {
    this.schema = schema
    this.errors = []
  }

  validate(data) {
    this.errors = []
    return this._validateObject(data, this.schema, '')
  }

  _validateObject(data, schema, path) {
    if (
      schema.type &&
      schema.type !== typeof data &&
      !(schema.type === 'integer' && Number.isInteger(data))
    ) {
      this.errors.push(`${path}: 期望类型 ${schema.type}，实际类型 ${typeof data}`)
      return false
    }

    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in data)) {
          this.errors.push(`${path}: 缺少必需字段 "${field}"`)
          return false
        }
      }
    }

    if (schema.properties) {
      for (const [key, value] of Object.entries(data)) {
        if (schema.properties[key]) {
          const fieldPath = path ? `${path}.${key}` : key
          if (schema.properties[key].$ref) {
            const refSchema = this._resolveRef(schema.properties[key].$ref)
            if (!this._validateObject(value, refSchema, fieldPath)) {
              return false
            }
          } else {
            if (!this._validateField(value, schema.properties[key], fieldPath)) {
              return false
            }
          }
        }
      }
    }

    return true
  }

  _validateField(value, schema, path) {
    if (schema.type === 'string') {
      if (typeof value !== 'string') {
        this.errors.push(`${path}: 期望字符串类型`)
        return false
      }
      if (schema.minLength && value.length < schema.minLength) {
        this.errors.push(`${path}: 字符串长度不能少于 ${schema.minLength}`)
        return false
      }
      if (schema.maxLength && value.length > schema.maxLength) {
        this.errors.push(`${path}: 字符串长度不能超过 ${schema.maxLength}`)
        return false
      }
      if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
        this.errors.push(`${path}: 字符串格式不符合要求 ${schema.pattern}`)
        return false
      }
    }

    if (schema.type === 'integer') {
      if (!Number.isInteger(value)) {
        this.errors.push(`${path}: 期望整数类型`)
        return false
      }
      if (schema.minimum !== undefined && value < schema.minimum) {
        this.errors.push(`${path}: 数值不能小于 ${schema.minimum}`)
        return false
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        this.errors.push(`${path}: 数值不能大于 ${schema.maximum}`)
        return false
      }
    }

    if (schema.type === 'array') {
      if (!Array.isArray(value)) {
        this.errors.push(`${path}: 期望数组类型`)
        return false
      }
      if (schema.minItems && value.length < schema.minItems) {
        this.errors.push(`${path}: 数组长度不能少于 ${schema.minItems}`)
        return false
      }
      if (schema.maxItems && value.length > schema.maxItems) {
        this.errors.push(`${path}: 数组长度不能超过 ${schema.maxItems}`)
        return false
      }
      if (schema.items) {
        for (let i = 0; i < value.length; i++) {
          const itemPath = `${path}[${i}]`
          if (schema.items.$ref) {
            const refSchema = this._resolveRef(schema.items.$ref)
            if (!this._validateObject(value[i], refSchema, itemPath)) {
              return false
            }
          } else {
            if (!this._validateField(value[i], schema.items, itemPath)) {
              return false
            }
          }
        }
      }
    }

    if (schema.enum && !schema.enum.includes(value)) {
      this.errors.push(`${path}: 值必须是 [${schema.enum.join(', ')}] 中的一个`)
      return false
    }

    return true
  }

  _resolveRef(ref) {
    if (ref.startsWith('#/definitions/')) {
      const defName = ref.replace('#/definitions/', '')
      return this.schema.definitions[defName]
    }
    return null
  }
}

function main() {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.log('使用方法: node validate-config.js <配置文件路径>')
    console.log('示例: node validate-config.js configs/exported-config-demo.json')
    process.exit(1)
  }

  const configPath = args[0]
  const schemaPath = path.join(__dirname, '../schemas/game-config.schema.json')

  try {
    // 读取 schema 文件
    const schemaContent = fs.readFileSync(schemaPath, 'utf8')
    const schema = JSON.parse(schemaContent)

    // 读取配置文件
    const configContent = fs.readFileSync(configPath, 'utf8')
    const config = JSON.parse(configContent)

    // 验证配置
    const validator = new SimpleValidator(schema)
    const isValid = validator.validate(config)

    if (isValid) {
      console.log('✅ 配置文件验证通过！')
      console.log(`📁 文件: ${configPath}`)
      console.log(`📋 版本: ${config.version}`)
      console.log(`🎮 游戏: ${config.gameTitle}`)
      console.log(`👥 玩家数量: ${config.data.playerSettings.playerCount}`)
      console.log(`🎯 棋盘格子总数: ${config.data.boardConfig.totalCells}`)
    } else {
      console.log('❌ 配置文件验证失败！')
      console.log('\n错误详情:')
      validator.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`)
      })
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ 验证过程中发生错误:')
    if (error.code === 'ENOENT') {
      console.error(`文件不存在: ${error.path}`)
    } else if (error instanceof SyntaxError) {
      console.error(`JSON 格式错误: ${error.message}`)
    } else {
      console.error(error.message)
    }
    process.exit(1)
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { SimpleValidator }
