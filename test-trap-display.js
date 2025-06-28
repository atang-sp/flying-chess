// 机关陷阱弹窗测试脚本
// 在浏览器控制台运行此脚本

console.log('🎯 机关陷阱弹窗测试开始...')

// 等待页面加载完成
setTimeout(() => {
  console.log('📋 当前游戏状态:')
  console.log('- 游戏状态:', window.gameState?.gameStatus)
  console.log('- 机关配置:', window.trapConfig)
  console.log('- 机关弹窗状态:', window.showTrapDisplay?.value)
  console.log('- 当前机关描述:', window.currentTrapDescription?.value)
  
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
    
    // 找到第一个机关格子的位置
    const trapPosition = trapCells[0].position
    console.log(`📍 将玩家移动到机关格子位置: ${trapPosition}`)
    
    // 设置玩家位置到机关格子
    if (window.gameState?.players && window.gameState.players.length > 0) {
      const currentPlayer = window.gameState.players[window.gameState.currentPlayerIndex]
      if (currentPlayer) {
        const originalPosition = currentPlayer.position
        currentPlayer.position = trapPosition
        console.log(`👤 玩家 ${currentPlayer.name} 从位置 ${originalPosition} 移动到位置 ${trapPosition}`)
        
        // 模拟移动完成后的效果处理
        console.log('⚡ 模拟移动完成，应该触发机关陷阱...')
        
        // 检查是否应该显示机关陷阱弹窗
        setTimeout(() => {
          console.log('🔍 检查机关陷阱弹窗状态:')
          console.log('- 弹窗显示状态:', window.showTrapDisplay?.value)
          console.log('- 当前机关描述:', window.currentTrapDescription?.value)
          
          if (window.showTrapDisplay?.value) {
            console.log('✅ 机关陷阱弹窗已显示！')
            console.log('🎯 机关描述:', window.currentTrapDescription?.value)
          } else {
            console.log('❌ 机关陷阱弹窗未显示')
            console.log('💡 可能的原因:')
            console.log('1. 机关触发逻辑有问题')
            console.log('2. cellEffect.type !== "trap"')
            console.log('3. showTrapDisplay状态未正确设置')
          }
        }, 1000)
      }
    }
  } else {
    console.log('❌ 棋盘中没有找到机关格子')
    console.log('💡 请检查棋盘配置中的 trapCells 数量')
  }
  
  console.log('\n📝 测试说明:')
  console.log('1. 机关陷阱应该有特殊的红色弹窗')
  console.log('2. 弹窗显示机关描述内容')
  console.log('3. 用户必须点击"确认执行"按钮才能继续游戏')
  console.log('4. 机关格子不再有复杂的惩罚对象')
  
}, 2000) 