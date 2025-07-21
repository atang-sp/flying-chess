// 飞行棋配置导出功能演示脚本
// 这个脚本演示了导出功能的核心逻辑

// 模拟导出数据结构
const mockExportData = {
  version: '1.0.0',
  exportedAt: new Date().toISOString(),
  gameTitle: '飞行棋配置',
  description: '游戏配置导出文件',
  data: {
    playerSettings: {
      playerCount: 2,
      playerNames: ['玩家1', '玩家2'],
    },
    punishmentConfig: {
      tools: [
        { id: 'hand', name: '手掌', intensity: 2, ratio: 30 },
        { id: 'ruler', name: '尺子', intensity: 3, ratio: 25 },
        { id: 'cane', name: '藤条', intensity: 4, ratio: 20 },
      ],
      bodyParts: [
        { id: 'butt', name: '屁股', sensitivity: 10, ratio: 80 },
        { id: 'back', name: '后背', sensitivity: 7, ratio: 10 },
        { id: 'thighs', name: '大腿', sensitivity: 5, ratio: 10 },
      ],
      positions: [
        { id: 'standing', name: '站立', ratio: 25 },
        { id: 'wall_lean', name: '手扶墙', ratio: 25 },
        { id: 'table_lean', name: '趴在桌子上', ratio: 25 },
        { id: 'kneeling', name: '跪趴', ratio: 25 },
      ],
      minStrikes: 10,
      maxStrikes: 30,
      step: 5,
      maxTakeoffFailures: 5,
    },
    boardConfig: {
      punishmentCells: 28,
      bonusCells: 1,
      reverseCells: 2,
      restCells: 1,
      restartCells: 4,
      trapCells: 2,
      totalCells: 40,
    },
    trapConfig: [
      {
        id: 'trap_1',
        name: '晾臀机关',
        description: '晾臀5分钟',
      },
      {
        id: 'trap_2',
        name: '随机惩罚机关',
        description: '由上一个被惩罚的玩家使用任意工具惩罚屁股',
      },
    ],
    boardContent: {
      seed: 'abc123def456',
      board: [
        {
          id: 1,
          type: 'bonus',
          position: 1,
          effect: { type: 'move', value: 0, description: '起点' },
        },
        {
          id: 2,
          type: 'punishment',
          position: 2,
          effect: { type: 'punishment', value: 1, description: '惩罚格子' },
        },
        {
          id: 3,
          type: 'special',
          position: 3,
          effect: { type: 'move', value: 2, description: '前进2格' },
        },
        // ... 更多格子数据
      ],
      generatedAt: Date.now(),
    },
  },
}

// 模拟导出选项
const exportOptions = {
  playerSettings: true,
  punishmentConfig: true,
  boardConfig: true,
  trapConfig: true,
  boardContent: false, // 演示中不包含棋盘内容
}

// 模拟文件名生成
function generateExportFilename(options) {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')
  const parts = []

  if (options.playerSettings) parts.push('玩家')
  if (options.punishmentConfig) parts.push('惩罚')
  if (options.boardConfig) parts.push('棋盘')
  if (options.trapConfig) parts.push('机关')
  if (options.boardContent) parts.push('布局')

  const configType = parts.length > 0 ? parts.join('-') : '配置'
  return `飞行棋-${configType}-${timestamp}.json`
}

// 模拟统计信息计算
function calculateExportStats(data) {
  const jsonString = JSON.stringify(data, null, 2)
  const totalSize = new Blob([jsonString]).size

  let itemCount = 0
  if (data.data.playerSettings) itemCount++
  if (data.data.punishmentConfig) itemCount++
  if (data.data.boardConfig) itemCount++
  if (data.data.trapConfig) itemCount++
  if (data.data.boardContent) itemCount++

  return {
    totalSize,
    itemCount,
    estimatedQRCodeSize: Math.ceil(totalSize * 1.3),
  }
}

// 模拟数据过滤
function filterExportData(data, options) {
  const filteredData = {
    ...data,
    data: {},
  }

  if (options.playerSettings && data.data.playerSettings) {
    filteredData.data.playerSettings = data.data.playerSettings
  }
  if (options.punishmentConfig && data.data.punishmentConfig) {
    filteredData.data.punishmentConfig = data.data.punishmentConfig
  }
  if (options.boardConfig && data.data.boardConfig) {
    filteredData.data.boardConfig = data.data.boardConfig
  }
  if (options.trapConfig && data.data.trapConfig) {
    filteredData.data.trapConfig = data.data.trapConfig
  }
  if (options.boardContent && data.data.boardContent) {
    filteredData.data.boardContent = data.data.boardContent
  }

  return filteredData
}

// 演示函数
function demonstrateExport() {
  console.log('🎲 飞行棋配置导出功能演示')
  console.log('================================')

  // 1. 显示导出选项
  console.log('\n📋 导出选项:')
  Object.entries(exportOptions).forEach(([key, value]) => {
    const status = value ? '✅' : '❌'
    const names = {
      playerSettings: '玩家设置',
      punishmentConfig: '惩罚设置',
      boardConfig: '棋盘设置',
      trapConfig: '机关设置',
      boardContent: '棋盘布局',
    }
    console.log(`  ${status} ${names[key]}`)
  })

  // 2. 过滤数据
  const filteredData = filterExportData(mockExportData, exportOptions)

  // 3. 生成文件名
  const filename = generateExportFilename(exportOptions)
  console.log(`\n📄 生成文件名: ${filename}`)

  // 4. 计算统计信息
  const stats = calculateExportStats(filteredData)
  console.log('\n📊 导出统计:')
  console.log(`  配置项数量: ${stats.itemCount} 项`)
  console.log(`  文件大小: ${(stats.totalSize / 1024).toFixed(1)} KB`)
  console.log(`  预估二维码大小: ${(stats.estimatedQRCodeSize / 1024).toFixed(1)} KB`)

  // 5. 显示导出数据结构
  console.log('\n📦 导出数据结构:')
  console.log(JSON.stringify(filteredData, null, 2))

  // 6. 模拟文件下载
  console.log('\n💾 模拟文件下载...')
  console.log('✅ 导出完成！')

  return {
    filename,
    data: filteredData,
    stats,
  }
}

// 运行演示
if (typeof window === 'undefined') {
  // Node.js 环境
  demonstrateExport()
} else {
  // 浏览器环境
  window.demonstrateExport = demonstrateExport
  console.log('导出演示函数已加载，请在控制台运行 demonstrateExport() 查看演示')
}

// 导出模块（如果在模块环境中）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    demonstrateExport,
    mockExportData,
    exportOptions,
    generateExportFilename,
    calculateExportStats,
    filterExportData,
  }
}
