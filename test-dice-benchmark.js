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

  // 根据统计学原理调整容忍偏差 (使用95%置信区间)
  // 对于骰子，标准偏差约为sqrt(n*p*(1-p)) = sqrt(n*1/6*5/6)
  // 95%置信区间约为 ±1.96*标准偏差/sqrt(n)
  const tolerance =
    rollCount <= 36
      ? 25 // 小样本允许25%偏差
      : rollCount <= 100
        ? 15 // 100次允许15%偏差
        : rollCount <= 216
          ? 10 // 216次允许10%偏差
          : rollCount <= 500
            ? 6 // 500次允许6%偏差
            : 4 // 1000次及以上允许4%偏差

  for (let i = 1; i <= 6; i++) {
    const count = distribution[i]
    const percentage = (count / rollCount) * 100
    const deviation = percentage - expectedPercentage
    const status =
      Math.abs(deviation) <= tolerance
        ? '✅ 正常'
        : Math.abs(deviation) <= tolerance * 2
          ? '⚠️ 偏差'
          : '❌ 异常'

    if (Math.abs(deviation) > tolerance) hasProblems = true

    console.log(
      `  ${i}  | ${count.toString().padStart(8)} | ${percentage.toFixed(2).padStart(6)}% | ${deviation > 0 ? '+' : ''}${deviation.toFixed(2).padStart(6)}% | ${status}`
    )
  }

  console.log('─'.repeat(50))
  console.log(`\n⏱️ 测试耗时: ${duration}ms`)
  console.log(`🎯 期望值: 每个数字 16.67% (约${(rollCount / 6).toFixed(1)}次)`)
  console.log(`📊 容忍偏差: ±${tolerance}%`)
  console.log(`📈 结果: ${hasProblems ? '❌ 检测到偏差' : '✅ 分布正常'}`)

  return { distribution, hasProblems }
}

// 批量测试不同规模
function runBatchTest() {
  const testSizes = [6, 36, 100, 216, 500, 1000]
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
  console.log('📋 总结报告')
  console.log('='.repeat(60))
  console.log('测试规模     | 状态     | 问题数字')
  console.log('─'.repeat(40))

  results.forEach(result => {
    const problemNumbers = []
    const expectedPercentage = 100 / 6
    const tolerance = result.size <= 36 ? 10 : result.size <= 100 ? 5 : 1.5

    for (let i = 1; i <= 6; i++) {
      const count = result.distribution[i]
      const percentage = (count / result.size) * 100
      const deviation = percentage - expectedPercentage

      if (Math.abs(deviation) > tolerance) {
        problemNumbers.push(`${i}点(${deviation > 0 ? '+' : ''}${deviation.toFixed(1)}%)`)
      }
    }

    const status = result.hasProblems ? '❌ 偏差' : '✅ 正常'
    const problems = problemNumbers.length > 0 ? problemNumbers.join(', ') : '无'

    console.log(`${result.size.toString().padStart(10)} | ${status.padEnd(8)} | ${problems}`)
  })

  // 分析建议
  const problemResults = results.filter(r => r.hasProblems)
  if (problemResults.length > 0) {
    console.log('\n⚠️ 检测到随机性问题:')
    console.log('• 建议升级为更好的随机数生成算法')
    console.log('• 可以考虑使用 crypto.getRandomValues()')
    console.log('• 样本量越大，问题越明显，说明存在系统性偏差')
  } else {
    console.log('\n✅ 随机性表现良好！')
    console.log('• 所有测试规模的分布都在正常范围内')
    console.log('• 当前的 Math.random() 算法满足游戏需求')
  }
}

// 执行测试
runBatchTest()
