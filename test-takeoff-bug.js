#!/usr/bin/env node

/**
 * 起飞机制bug测试脚本
 *
 * 这个脚本模拟用户反馈的bug场景，帮助验证修复是否有效
 */

console.log('🧪 起飞机制bug测试脚本')
console.log('='.repeat(50))

// 模拟GameService的movePlayer方法
function simulateMovePlayer(player, diceValue, punishmentConfig) {
  console.log(`\n🎲 玩家 ${player.name} 掷骰子: ${diceValue}`)
  console.log(
    `   当前位置: ${player.position}, 已起飞: ${player.hasTakenOff}, 失败次数: ${player.failedTakeoffAttempts}`
  )

  // 检查是否在起点且未起飞
  if (player.position === 0 && !player.hasTakenOff) {
    if (diceValue === 6) {
      // 起飞成功
      console.log(
        `✅ 玩家 ${player.name} 掷到6点，起飞成功！之前失败次数: ${player.failedTakeoffAttempts || 0}`
      )
      player.hasTakenOff = true
      player.failedTakeoffAttempts = 0
      player.position = 1
      return { success: true, forcedTakeoff: false }
    } else {
      // 未起飞，记录失败次数
      player.failedTakeoffAttempts = (player.failedTakeoffAttempts || 0) + 1

      console.log(
        `❌ 玩家 ${player.name} 起飞失败，当前失败次数: ${player.failedTakeoffAttempts}，最大允许失败次数: ${punishmentConfig.maxTakeoffFailures}`
      )

      // 判断是否达到最大失败次数
      if (
        punishmentConfig.maxTakeoffFailures !== undefined &&
        player.failedTakeoffAttempts >= punishmentConfig.maxTakeoffFailures
      ) {
        console.log(
          `🚀 玩家 ${player.name} 达到最大起飞失败次数 ${punishmentConfig.maxTakeoffFailures}，触发强制起飞`
        )
        player.hasTakenOff = true
        player.failedTakeoffAttempts = 0
        player.position = 1
        return { success: true, forcedTakeoff: true }
      }

      return { success: false, forcedTakeoff: false }
    }
  } else {
    // 已经起飞，正常移动
    player.position += diceValue
    console.log(`➡️  玩家 ${player.name} 正常移动到位置 ${player.position}`)
    return { success: true, forcedTakeoff: false }
  }
}

// 测试场景1：正常的5次失败后强制起飞
function testNormalForcedTakeoff() {
  console.log('\n📋 测试场景1：正常的5次失败后强制起飞')
  console.log('-'.repeat(40))

  const player = {
    name: '测试玩家1',
    position: 0,
    hasTakenOff: false,
    failedTakeoffAttempts: 0,
  }

  const config = { maxTakeoffFailures: 5 }

  // 模拟连续4次失败
  for (let i = 1; i <= 4; i++) {
    const result = simulateMovePlayer(player, 3, config)
    if (result.forcedTakeoff) {
      console.log(`❌ 错误：在第${i}次失败时就强制起飞了！`)
      return false
    }
  }

  // 第5次失败应该触发强制起飞
  const result = simulateMovePlayer(player, 3, config)
  if (!result.forcedTakeoff) {
    console.log(`❌ 错误：第5次失败时没有触发强制起飞！`)
    return false
  }

  console.log(`✅ 测试通过：正确在第5次失败时触发强制起飞`)
  return true
}

// 测试场景2：配置为2次失败后强制起飞（模拟用户反馈的场景）
function testEarlyForcedTakeoff() {
  console.log('\n📋 测试场景2：配置为2次失败后强制起飞')
  console.log('-'.repeat(40))

  const player = {
    name: '测试玩家2',
    position: 0,
    hasTakenOff: false,
    failedTakeoffAttempts: 0,
  }

  const config = { maxTakeoffFailures: 2 }

  // 第1次失败
  let result = simulateMovePlayer(player, 3, config)
  if (result.forcedTakeoff) {
    console.log(`❌ 错误：在第1次失败时就强制起飞了！`)
    return false
  }

  // 第2次失败应该触发强制起飞
  result = simulateMovePlayer(player, 4, config)
  if (!result.forcedTakeoff) {
    console.log(`❌ 错误：第2次失败时没有触发强制起飞！`)
    return false
  }

  console.log(`✅ 测试通过：正确在第2次失败时触发强制起飞`)
  return true
}

// 测试场景3：中途成功起飞重置计数器
function testSuccessfulTakeoffResetCounter() {
  console.log('\n📋 测试场景3：中途成功起飞重置计数器')
  console.log('-'.repeat(40))

  const player = {
    name: '测试玩家3',
    position: 0,
    hasTakenOff: false,
    failedTakeoffAttempts: 0,
  }

  const config = { maxTakeoffFailures: 5 }

  // 先失败3次
  for (let i = 1; i <= 3; i++) {
    simulateMovePlayer(player, 3, config)
  }

  // 然后成功起飞
  const result = simulateMovePlayer(player, 6, config)
  if (!result.success || result.forcedTakeoff) {
    console.log(`❌ 错误：掷到6点时没有正常起飞！`)
    return false
  }

  if (player.failedTakeoffAttempts !== 0) {
    console.log(`❌ 错误：成功起飞后失败计数器没有重置！当前值: ${player.failedTakeoffAttempts}`)
    return false
  }

  console.log(`✅ 测试通过：成功起飞后正确重置失败计数器`)
  return true
}

// 测试场景4：边界条件测试
function testBoundaryConditions() {
  console.log('\n📋 测试场景4：边界条件测试')
  console.log('-'.repeat(40))

  // 测试maxTakeoffFailures为1的情况
  const player1 = {
    name: '边界测试玩家1',
    position: 0,
    hasTakenOff: false,
    failedTakeoffAttempts: 0,
  }

  const config1 = { maxTakeoffFailures: 1 }

  // 第1次失败就应该强制起飞
  const result1 = simulateMovePlayer(player1, 3, config1)
  if (!result1.forcedTakeoff) {
    console.log(`❌ 错误：maxTakeoffFailures=1时，第1次失败没有触发强制起飞！`)
    return false
  }

  // 测试maxTakeoffFailures为undefined的情况
  const player2 = {
    name: '边界测试玩家2',
    position: 0,
    hasTakenOff: false,
    failedTakeoffAttempts: 0,
  }

  const config2 = { maxTakeoffFailures: undefined }

  // 即使失败很多次也不应该强制起飞
  for (let i = 1; i <= 10; i++) {
    const result = simulateMovePlayer(player2, 3, config2)
    if (result.forcedTakeoff) {
      console.log(`❌ 错误：maxTakeoffFailures=undefined时，在第${i}次失败时触发了强制起飞！`)
      return false
    }
  }

  console.log(`✅ 测试通过：边界条件处理正确`)
  return true
}

// 运行所有测试
function runAllTests() {
  console.log('开始运行所有测试...\n')

  const tests = [
    { name: '正常的5次失败后强制起飞', fn: testNormalForcedTakeoff },
    { name: '配置为2次失败后强制起飞', fn: testEarlyForcedTakeoff },
    { name: '中途成功起飞重置计数器', fn: testSuccessfulTakeoffResetCounter },
    { name: '边界条件测试', fn: testBoundaryConditions },
  ]

  let passedTests = 0
  const totalTests = tests.length

  for (const test of tests) {
    try {
      if (test.fn()) {
        passedTests++
      }
    } catch (error) {
      console.log(`❌ 测试 "${test.name}" 执行时出错:`, error.message)
    }
  }

  console.log(`\n${'='.repeat(50)}`)
  console.log(`📊 测试结果: ${passedTests}/${totalTests} 通过`)

  if (passedTests === totalTests) {
    console.log('🎉 所有测试通过！起飞机制工作正常。')
  } else {
    console.log('⚠️  部分测试失败，需要进一步检查代码。')
  }

  return passedTests === totalTests
}

// 运行测试
runAllTests()
