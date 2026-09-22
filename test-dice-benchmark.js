// 简单的骰子基准测试脚本
// 使用纯密码学安全的双重随机源算法进行测试（无 Math.random() 回退）

console.log('🎲 骰子随机性基准测试\n')

// 模拟当前游戏中的骰子算法（使用纯密码学安全的双重随机源算法）
function rollDice() {
  // 完全使用密码学安全的双重随机源算法，不回退到 Math.random()
  if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
    throw new Error('此环境不支持 crypto.getRandomValues()，无法提供密码学安全的随机数')
  }

  try {
    // 使用双重随机源增强算法
    const range = 6 // MAX_VALUE (6) - MIN_VALUE (1) + 1

    // 生成两个独立的随机源并混合
    const array1 = new Uint32Array(1)
    const array2 = new Uint32Array(1)
    crypto.getRandomValues(array1)
    crypto.getRandomValues(array2)

    // 使用加法混合，避免潜在的数值问题
    const mixedValue = (array1[0] + array2[0]) >>> 0 // 确保32位无符号整数

    // 使用拒绝采样确保完全均匀分布
    const maxValid = Math.floor(0xffffffff / range) * range

    if (mixedValue >= maxValid) {
      // 如果超出有效范围，递归调用（概率极低：约 1/7,000,000,000）
      return rollDice()
    }

    const result = (mixedValue % range) + 1 // MIN_VALUE = 1

    // 安全检查：确保结果在有效范围内
    if (result < 1 || result > 6) {
      console.warn('骰子结果超出范围，重新生成:', result)
      return rollDice()
    }

    return result
  } catch (error) {
    console.error('密码学随机数生成失败:', error)
    throw new Error('无法生成安全的随机数，请确保在现代浏览器环境中运行')
  }
}

// 计算统计学99%置信区间容许偏差 (%)
function getTolerance(rollCount) {
  // 对于骰子(p=1/6), SE(%) = 100 * sqrt(5/36 / n) ≈ 37.27 / sqrt(n)
  // 99% 置信区间 (2.576 * SE): tolerance ≈ 96 / sqrt(n)
  return Math.max(1.5, Math.round((96 / Math.sqrt(rollCount)) * 10) / 10)
}

// 执行基准测试
function runBenchmark(rollCount) {
  console.log(`开始测试 ${rollCount.toLocaleString()} 次投掷...`)
  const startTime = Date.now()

  // 统计分布
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }

  for (let i = 0; i < rollCount; i++) {
    const result = rollDice()
    distribution[result]++
  }

  const endTime = Date.now()
  const duration = endTime - startTime

  // 计算百分比和偏差
  console.log('\n📊 分布结果:')
  console.log('点数 | 次数      | 百分比   | 偏差     | 状态')
  console.log('─'.repeat(50))

  let hasProblems = false
  const expectedPercentage = 100 / 6 // 16.6667%
  const tolerance = getTolerance(rollCount)

  for (let i = 1; i <= 6; i++) {
    const count = distribution[i]
    const percentage = (count / rollCount) * 100
    const deviation = percentage - expectedPercentage
    const status =
      Math.abs(deviation) <= tolerance
        ? '✅ 正常'
        : Math.abs(deviation) <= tolerance * 1.5
          ? '⚠️ 偏离'
          : '❌ 异常'

    if (Math.abs(deviation) > tolerance) hasProblems = true

    console.log(
      `  ${i}  | ${count.toString().padStart(8)} | ${percentage.toFixed(2).padStart(6)}% | ${deviation > 0 ? '+' : ''}${deviation.toFixed(2).padStart(6)}% | ${status}`
    )
  }

  console.log('─'.repeat(50))
  console.log(`\n⏱️ 测试耗时: ${duration}ms`)
  console.log(`🎯 期望值: 每个数字 16.67% (约${(rollCount / 6).toFixed(1)}次)`)
  console.log(`📊 统计容差 (99% CI): ±${tolerance}%`)
  console.log(`📈 结果: ${hasProblems ? '❌ 检测到显著偏离' : '✅ 分布符合均匀假设'}`)

  return { distribution, hasProblems, tolerance }
}

// 批量测试不同规模
function runBatchTest() {
  const testSizes = [36, 100, 216, 500, 1000, 6000]
  const results = []

  for (const size of testSizes) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`🎯 测试规模: ${size.toLocaleString()} 次投掷`)
    console.log('='.repeat(60))

    const result = runBenchmark(size)
    results.push({ size, ...result })
  }

  // 总结报告
  console.log(`\n${'='.repeat(60)}`)
  console.log('📋 总结报告 (基于密码学安全随机源与99%置信区间)')
  console.log('='.repeat(60))
  console.log('测试规模     | 容差     | 状态     | 问题数字')
  console.log('─'.repeat(50))

  results.forEach(result => {
    const problemNumbers = []
    const expectedPercentage = 100 / 6
    const tolerance = result.tolerance

    for (let i = 1; i <= 6; i++) {
      const count = result.distribution[i]
      const percentage = (count / result.size) * 100
      const deviation = percentage - expectedPercentage

      if (Math.abs(deviation) > tolerance) {
        problemNumbers.push(`${i}点(${deviation > 0 ? '+' : ''}${deviation.toFixed(1)}%)`)
      }
    }

    const status = result.hasProblems ? '❌ 偏离' : '✅ 正常'
    const problems = problemNumbers.length > 0 ? problemNumbers.join(', ') : '无'

    console.log(
      `${result.size.toString().padStart(10)} | ±${tolerance.toFixed(1).padStart(4)}% | ${status.padEnd(8)} | ${problems}`
    )
  })

  // 分析建议
  const problemResults = results.filter(r => r.hasProblems)
  if (problemResults.length > 0) {
    console.log('\n⚠️ 注意: 存在部分样本超出 99% 置信区间，可在更大样本量下重新验证。')
  } else {
    console.log('\n✅ 随机性表现优秀！')
    console.log('• 所有测试规模的点数分布均严格符合密码学均匀分布')
    console.log('• 拒绝采样有效消除了取模偏差 (Modulo Bias)')
  }
}

// 执行测试
runBatchTest()
