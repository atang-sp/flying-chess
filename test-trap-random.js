// 测试机关陷阱的随机惩罚功能
console.log('🧪 测试机关陷阱的随机惩罚功能...')

// 等待页面加载完成
setTimeout(() => {
  console.log('📋 当前游戏状态:')
  console.log('- 游戏状态:', window.gameState?.gameStatus)
  console.log('- 机关配置:', window.trapConfig)
  console.log('- 机关弹窗状态:', window.showTrapDisplay?.value)
  console.log('- 当前机关惩罚:', window.currentTrapPunishment?.value)

  // 检查棋盘中的机关格子
  const board = window.gameState?.board || []
  const trapCells = board.filter(cell => cell.type === 'trap')
  console.log('🎯 棋盘中的机关格子:', trapCells.length, '个')
  trapCells.forEach((cell, index) => {
    console.log(`  机关格子 ${index + 1}: 位置 ${cell.position}, 描述: ${cell.effect?.description}`)
  })

  // 模拟触发机关陷阱
  console.log('\n🎲 模拟触发机关陷阱...')

  // 找到第一个机关格子的位置
  if (trapCells.length > 0) {
    const trapPosition = trapCells[0].position
    console.log(`📍 将玩家移动到机关格子位置: ${trapPosition}`)

    // 设置玩家位置到机关格子
    if (window.gameState?.players && window.gameState.players.length > 0) {
      const currentPlayer = window.gameState.players[window.gameState.currentPlayerIndex]
      if (currentPlayer) {
        const originalPosition = currentPlayer.position
        currentPlayer.position = trapPosition
        console.log(
          `👤 玩家 ${currentPlayer.name} 从位置 ${originalPosition} 移动到位置 ${trapPosition}`
        )

        // 模拟移动完成后的效果处理
        console.log('⚡ 模拟移动完成，应该触发机关陷阱...')

        // 检查是否应该显示机关陷阱弹窗
        setTimeout(() => {
          console.log('🔍 检查机关陷阱弹窗状态:')
          console.log('- 弹窗显示状态:', window.showTrapDisplay?.value)
          console.log('- 当前惩罚:', window.currentTrapPunishment?.value)

          if (window.showTrapDisplay?.value) {
            console.log('✅ 机关陷阱弹窗已显示！')
            console.log('🎯 随机生成的惩罚:', window.currentTrapPunishment?.value)
          } else {
            console.log('❌ 机关陷阱弹窗未显示')
          }
        }, 1000)
      }
    }
  } else {
    console.log('❌ 棋盘中没有找到机关格子')
  }

  console.log('\n📝 测试说明:')
  console.log('1. 机关陷阱的惩罚内容是随机的，每次触发都可能不同')
  console.log('2. 机关陷阱有特殊的弹窗提示，表示踩到了机关')
  console.log('3. 弹窗会显示随机生成的惩罚详情')
  console.log('4. 用户必须点击"接受惩罚"按钮才能继续游戏')
}, 2000)
