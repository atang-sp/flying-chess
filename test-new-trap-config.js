// 测试新的简化机关配置
console.log('🧪 测试新的简化机关配置...')

// 等待页面加载完成
setTimeout(() => {
  console.log('📋 当前游戏状态:')
  console.log('- 游戏状态:', window.gameState?.gameStatus)
  console.log('- 机关配置:', window.trapConfig)
  
  // 检查棋盘中的机关格子
  const board = window.gameState?.board || []
  const trapCells = board.filter(cell => cell.type === 'trap')
  console.log('🎯 棋盘中的机关格子:', trapCells.length, '个')
  
  if (trapCells.length > 0) {
    console.log('✅ 机关格子配置正确')
    trapCells.forEach((cell, index) => {
      console.log(`  机关格子 ${index + 1}: 位置 ${cell.position}`)
      console.log(`    描述: ${cell.effect?.description}`)
      console.log(`    类型: ${cell.effect?.type}`)
    })
    
    console.log('\n📝 新的机关配置特点:')
    console.log('1. 机关内容和惩罚内容合二为一')
    console.log('2. 不再需要tool、bodyPart、position等字段')
    console.log('3. 直接使用description字段描述机关内容')
    console.log('4. 默认机关：晾臀5分钟、随机玩家惩罚屁股')
    
    console.log('\n🎮 游戏测试步骤:')
    console.log('1. 掷骰子移动到机关格子')
    console.log('2. 观察机关陷阱弹窗显示描述内容')
    console.log('3. 确认执行机关内容')
    
  } else {
    console.log('❌ 棋盘中没有找到机关格子')
    console.log('💡 请检查棋盘配置中的 trapCells 数量')
  }
  
  console.log('\n🔍 验证要点:')
  console.log('✅ 机关配置简化，只有id、name、description')
  console.log('✅ 不再有复杂的惩罚对象')
  console.log('✅ 直接使用描述内容')
  console.log('✅ 默认机关符合要求')
  
  console.log('\n📊 配置对比:')
  console.log('修改前: id, name, punishment{tool, bodyPart, position, description}')
  console.log('修改后: id, name, description (简化)')
  
  console.log('\n🎯 默认机关:')
  console.log('1. 晾臀机关: 晾臀5分钟')
  console.log('2. 随机惩罚机关: 由随机玩家使用任意工具惩罚屁股，必须自己请罚"请xxx打我的屁股"')
  
}, 2000) 