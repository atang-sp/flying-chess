// 测试验证失败但配置仍然生效的问题
import { GameService } from './src/services/gameService.ts'

// 模拟一个无效的配置：工具强度超过所有部位的耐受度
const invalidConfig = {
  tools: [{ id: 'tool1', name: '高强度工具', intensity: 5, ratio: 100 }],
  bodyParts: [{ id: 'part1', name: '低耐受部位', sensitivity: 1, ratio: 100 }],
  positions: [{ id: 'pos1', name: '姿势1', ratio: 100 }],
  minStrikes: 10,
  maxStrikes: 20,
}

console.log('=== 测试无效配置 ===')
console.log('配置:', JSON.stringify(invalidConfig, null, 2))

// 验证配置
const validation = GameService.validatePunishmentConfig(invalidConfig)
console.log('验证结果:', validation)

if (!validation.isValid) {
  console.log('❌ 配置验证失败，这是预期的')
  console.log('错误信息:', validation.errorMessage)
  console.log('需要的耐受度:', validation.requiredSensitivity)
} else {
  console.log('✅ 配置验证通过，这是意外的')
}

// 模拟组件更新流程
console.log('\n=== 模拟组件更新流程 ===')

// 1. 用户修改工具强度
console.log('1. 用户修改工具强度为5...')
const updatedConfig = { ...invalidConfig }
updatedConfig.tools[0].intensity = 5

// 2. 验证更新后的配置
const updateValidation = GameService.validatePunishmentConfig(updatedConfig)
console.log('2. 验证更新后的配置:', updateValidation)

if (!updateValidation.isValid) {
  console.log('3. 验证失败，应该发送validation-failed事件')
  console.log('4. 不应该发送update事件')
  console.log('5. 配置不应该被应用')
} else {
  console.log('3. 验证通过，应该发送update事件')
  console.log('4. 配置应该被应用')
}

console.log('\n=== 测试完成 ===')
