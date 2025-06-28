// 测试机关格子的悬浮提示修改
console.log('🧪 测试机关格子的悬浮提示修改...')

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
      console.log(`    名称: ${cell.effect?.description}`)
      console.log(`    类型: ${cell.effect?.type}`)
      console.log(`    悬浮提示应该显示: "每次惩罚都不一样！"`)
    })
    
    console.log('\n📝 悬浮提示测试说明:')
    console.log('1. 将鼠标悬浮在机关格子上')
    console.log('2. 应该显示机关名称（如"暗箭伤人"）')
    console.log('3. 应该显示警告："每次惩罚都不一样！"')
    console.log('4. 应该显示特点："随机生成惩罚内容"')
    console.log('5. 不应该显示具体的工具、部位、姿势')
    
    console.log('\n🎮 游戏测试步骤:')
    console.log('1. 掷骰子移动到机关格子')
    console.log('2. 观察随机惩罚弹窗')
    console.log('3. 多次触发同一机关格子，验证惩罚内容不同')
    
  } else {
    console.log('❌ 棋盘中没有找到机关格子')
    console.log('💡 请检查棋盘配置中的 trapCells 数量')
  }
  
  console.log('\n🔍 验证要点:')
  console.log('✅ 悬浮提示不显示具体惩罚内容')
  console.log('✅ 悬浮提示强调随机性')
  console.log('✅ 实际触发时惩罚内容随机')
  console.log('✅ 多次触发同一格子惩罚不同')
  
}, 2000) 