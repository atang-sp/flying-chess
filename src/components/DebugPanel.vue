<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { DiceBenchmark, type BenchmarkResult } from '../utils/diceBenchmark'

  const showPanel = ref(false)
  const isRunningBenchmark = ref(false)
  const benchmarkResults = ref<BenchmarkResult[]>([])
  const customTestSize = ref(1000)

  // 预定义的测试规模
  const testSizes = [
    { label: '6次 (基础)', value: 6 },
    { label: '36次 (6²)', value: 36 },
    { label: '100次 (标准)', value: 100 },
    { label: '216次 (6³)', value: 216 },
    { label: '500次 (扩展)', value: 500 },
    { label: '1000次 (高精度)', value: 1000 },
  ]

  // 运行单个基准测试
  const runSingleBenchmark = async (rollCount: number) => {
    isRunningBenchmark.value = true

    try {
      // 使用setTimeout让UI有时间更新
      await new Promise(resolve => setTimeout(resolve, 100))

      const result = DiceBenchmark.runBenchmark(rollCount)
      benchmarkResults.value.unshift(result) // 最新结果显示在前面

      // 只保留最近的10个结果
      if (benchmarkResults.value.length > 10) {
        benchmarkResults.value = benchmarkResults.value.slice(0, 10)
      }
    } catch (error) {
      console.error('基准测试出错:', error)
    } finally {
      isRunningBenchmark.value = false
    }
  }

  // 运行批量基准测试
  const runBatchBenchmark = async () => {
    isRunningBenchmark.value = true

    try {
      await new Promise(resolve => setTimeout(resolve, 100))

      const results = DiceBenchmark.runBatchBenchmark([6, 36, 100, 216, 500, 1000])
      benchmarkResults.value = results.concat(benchmarkResults.value).slice(0, 10)
    } catch (error) {
      console.error('批量基准测试出错:', error)
    } finally {
      isRunningBenchmark.value = false
    }
  }

  // 运行自定义大小的测试
  const runCustomBenchmark = () => {
    if (customTestSize.value >= 10 && customTestSize.value <= 1000000) {
      runSingleBenchmark(customTestSize.value)
    }
  }

  // 清除结果
  const clearResults = () => {
    benchmarkResults.value = []
  }

  // 获取状态颜色（根据统计学95%置信区间调整判断标准）
  const getStatusColor = (isBalanced: boolean, maxDeviation: number, rollCount: number) => {
    const tolerance =
      rollCount <= 36
        ? 25
        : rollCount <= 100
          ? 15
          : rollCount <= 216
            ? 10
            : rollCount <= 500
              ? 6
              : 4
    if (isBalanced) return '#10b981' // 绿色
    if (maxDeviation > tolerance * 1.5) return '#ef4444' // 红色
    return '#f59e0b' // 黄色
  }

  // 计算总体统计
  const overallStats = computed(() => {
    if (benchmarkResults.value.length === 0) return null

    const totalTests = benchmarkResults.value.length
    const passedTests = benchmarkResults.value.filter(r => r.isBalanced).length
    const passRate = ((passedTests / totalTests) * 100).toFixed(1)

    return {
      totalTests,
      passedTests,
      passRate,
    }
  })
</script>

<template>
  <div class="debug-panel">
    <!-- 切换按钮 -->
    <button class="debug-toggle" :class="{ active: showPanel }" @click="showPanel = !showPanel">
      🎲 骰子基准测试
    </button>

    <!-- 调试面板内容 -->
    <div v-if="showPanel" class="debug-content">
      <div class="debug-header">
        <h3>🎯 骰子随机性基准测试</h3>
        <button class="close-btn" @click="showPanel = false">✕</button>
      </div>

      <!-- 快速测试区域 -->
      <div class="test-section">
        <h4>⚡ 快速测试</h4>
        <p class="description">选择预设的测试规模进行快速基准测试</p>

        <div class="quick-test-grid">
          <button
            v-for="test in testSizes"
            :key="test.value"
            :disabled="isRunningBenchmark"
            class="quick-test-btn"
            @click="runSingleBenchmark(test.value)"
          >
            {{ test.label }}
          </button>
        </div>
      </div>

      <!-- 自定义测试区域 -->
      <div class="test-section">
        <h4>🔧 自定义测试</h4>
        <div class="custom-test-controls">
          <label>
            投掷次数:
            <input
              v-model.number="customTestSize"
              type="number"
              min="10"
              max="1000000"
              class="count-input"
            />
          </label>
          <button :disabled="isRunningBenchmark" class="test-btn" @click="runCustomBenchmark">
            运行测试
          </button>
        </div>
      </div>

      <!-- 批量测试区域 -->
      <div class="test-section">
        <h4>📊 综合分析</h4>
        <p class="description">运行完整的批量测试：6/36/100/216/500/1000次投掷</p>

        <div class="batch-controls">
          <button :disabled="isRunningBenchmark" class="batch-btn" @click="runBatchBenchmark">
            {{ isRunningBenchmark ? '测试中...' : '运行批量测试' }}
          </button>
          <button class="clear-btn" @click="clearResults">清除结果</button>
        </div>
      </div>

      <!-- 测试状态 -->
      <div v-if="isRunningBenchmark" class="testing-status">
        <div class="loading-spinner"></div>
        <span>正在运行基准测试，请稍候...</span>
      </div>

      <!-- 总体统计 -->
      <div v-if="overallStats" class="overall-stats">
        <h4>📈 总体统计</h4>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">{{ overallStats.totalTests }}</div>
            <div class="stat-label">测试次数</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ overallStats.passedTests }}</div>
            <div class="stat-label">通过测试</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ overallStats.passRate }}%</div>
            <div class="stat-label">通过率</div>
          </div>
        </div>
      </div>

      <!-- 测试结果列表 -->
      <div v-if="benchmarkResults.length > 0" class="results-section">
        <h4>📋 测试结果</h4>

        <div class="results-list">
          <div v-for="(result, index) in benchmarkResults" :key="index" class="result-item">
            <div class="result-header">
              <div class="result-title">
                <span class="test-size">{{ result.totalRolls.toLocaleString() }}次投掷</span>
                <span
                  class="status-badge"
                  :style="{
                    backgroundColor: getStatusColor(
                      result.isBalanced,
                      Math.max(...Object.values(result.deviations).map(Math.abs)),
                      result.totalRolls
                    ),
                  }"
                >
                  {{ result.isBalanced ? '✅ 通过' : '❌ 偏差' }}
                </span>
              </div>
              <div class="result-summary">{{ result.summary }}</div>
            </div>

            <!-- 分布图表 -->
            <div class="distribution-chart">
              <div class="chart-title">点数分布</div>
              <div class="chart-bars">
                <div v-for="i in 6" :key="i" class="chart-bar">
                  <div class="bar-label">{{ i }}</div>
                  <div class="bar-container">
                    <div
                      class="bar-fill"
                      :style="{
                        height: `${Math.min(result.percentages[i], 25)}%`,
                        backgroundColor: (() => {
                          const tolerance =
                            result.totalRolls <= 36
                              ? 25
                              : result.totalRolls <= 100
                                ? 15
                                : result.totalRolls <= 216
                                  ? 10
                                  : result.totalRolls <= 500
                                    ? 6
                                    : 4
                          return Math.abs(result.deviations[i]) <= tolerance ? '#10b981' : '#ef4444'
                        })(),
                      }"
                    ></div>
                  </div>
                  <div class="bar-value">{{ result.percentages[i].toFixed(1) }}%</div>
                  <div class="bar-deviation">
                    {{ result.deviations[i] > 0 ? '+' : '' }}{{ result.deviations[i].toFixed(1) }}%
                  </div>
                </div>
              </div>
              <div class="chart-baseline">16.7% (期望值)</div>
            </div>

            <!-- 详细数据按钮 -->
            <details class="result-details">
              <summary>查看详细报告</summary>
              <pre class="detailed-report">{{ result.detailedReport }}</pre>
            </details>
          </div>
        </div>
      </div>

      <!-- 使用说明 -->
      <div class="info-section">
        <h4>ℹ️ 说明</h4>
        <ul>
          <li>
            <strong>期望值</strong>
            ：每个数字应该出现 16.67% (1/6)
          </li>
          <li>
            <strong>容忍偏差</strong>
            ：基于统计学95%置信区间 - 6~36次:±25%, 100次:±15%, 216次:±10%, 500次:±6%, 1000次:±4%
          </li>
          <li>
            <strong>测试意义</strong>
            ：6=6¹, 36=6², 216=6³，500和1000次为扩展精度测试
          </li>
          <li>
            <strong>统计学原理</strong>
            ：小样本随机波动大是正常现象，大样本才能准确反映真实随机性
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .debug-panel {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
  }

  .debug-toggle {
    padding: 0.5rem 1rem;
    background: #6366f1;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .debug-toggle:hover {
    background: #5b21b6;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }

  .debug-toggle.active {
    background: #4c1d95;
  }

  .debug-content {
    position: absolute;
    top: 50px;
    right: 0;
    width: 600px;
    max-height: 85vh;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 12px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    overflow-y: auto;
  }

  .debug-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid #e5e7eb;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 12px 12px 0 0;
  }

  .debug-header h3 {
    margin: 0;
    font-size: 1.1rem;
  }

  .close-btn {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s ease;
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .test-section {
    padding: 1rem;
    border-bottom: 1px solid #f3f4f6;
  }

  .test-section h4 {
    margin: 0 0 0.5rem 0;
    color: #374151;
    font-size: 1rem;
  }

  .description {
    margin: 0 0 1rem 0;
    color: #6b7280;
    font-size: 0.9rem;
    line-height: 1.4;
  }

  .quick-test-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }

  .quick-test-btn {
    padding: 0.75rem;
    background: linear-gradient(135deg, #10b981, #047857);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s ease;
  }

  .quick-test-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
  }

  .quick-test-btn:disabled {
    background: #9ca3af;
    cursor: not-allowed;
    transform: none;
  }

  .custom-test-controls,
  .batch-controls {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .count-input {
    width: 120px;
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    margin-left: 0.5rem;
    font-size: 0.9rem;
  }

  .test-btn,
  .batch-btn {
    padding: 0.5rem 1rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s ease;
  }

  .test-btn:hover:not(:disabled),
  .batch-btn:hover:not(:disabled) {
    background: #2563eb;
  }

  .test-btn:disabled,
  .batch-btn:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }

  .clear-btn {
    padding: 0.5rem 1rem;
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s ease;
  }

  .clear-btn:hover {
    background: #dc2626;
  }

  .testing-status {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: #f0f9ff;
    border-left: 4px solid #3b82f6;
    margin: 1rem;
    border-radius: 0 8px 8px 0;
  }

  .loading-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid #e5e7eb;
    border-top: 2px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .overall-stats {
    padding: 1rem;
    background: #f8fafc;
  }

  .overall-stats h4 {
    margin: 0 0 1rem 0;
    color: #374151;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }

  .stat-card {
    text-align: center;
    padding: 1rem;
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: bold;
    color: #1f2937;
  }

  .stat-label {
    font-size: 0.8rem;
    color: #6b7280;
    margin-top: 0.25rem;
  }

  .results-section {
    padding: 1rem;
  }

  .results-section h4 {
    margin: 0 0 1rem 0;
    color: #374151;
  }

  .results-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .result-item {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
  }

  .result-header {
    padding: 0.75rem;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
  }

  .result-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .test-size {
    font-weight: bold;
    color: #374151;
  }

  .status-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    font-size: 0.8rem;
    color: white;
    font-weight: bold;
  }

  .result-summary {
    font-size: 0.9rem;
    color: #6b7280;
  }

  .distribution-chart {
    padding: 1rem;
  }

  .chart-title {
    font-weight: bold;
    margin-bottom: 0.75rem;
    color: #374151;
    text-align: center;
  }

  .chart-bars {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 0.5rem;
    align-items: end;
    height: 120px;
    margin-bottom: 0.5rem;
  }

  .chart-bar {
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
  }

  .bar-label {
    font-weight: bold;
    margin-bottom: 0.25rem;
    color: #374151;
  }

  .bar-container {
    flex: 1;
    width: 100%;
    display: flex;
    align-items: end;
    justify-content: center;
    position: relative;
  }

  .bar-fill {
    width: 80%;
    border-radius: 4px 4px 0 0;
    transition: height 0.3s ease;
    min-height: 2px;
  }

  .bar-value {
    font-size: 0.8rem;
    font-weight: bold;
    margin-top: 0.25rem;
    color: #374151;
  }

  .bar-deviation {
    font-size: 0.7rem;
    color: #6b7280;
  }

  .chart-baseline {
    text-align: center;
    font-size: 0.8rem;
    color: #6b7280;
    border-top: 1px dashed #d1d5db;
    padding-top: 0.5rem;
  }

  .result-details {
    border-top: 1px solid #e5e7eb;
  }

  .result-details summary {
    padding: 0.75rem;
    cursor: pointer;
    background: #f9fafb;
    font-weight: bold;
    color: #374151;
  }

  .result-details summary:hover {
    background: #f3f4f6;
  }

  .detailed-report {
    padding: 1rem;
    background: #1f2937;
    color: #f9fafb;
    font-family: 'Courier New', monospace;
    font-size: 0.8rem;
    line-height: 1.4;
    overflow-x: auto;
    margin: 0;
  }

  .info-section {
    padding: 1rem;
    background: #fffbeb;
    border-top: 1px solid #fbbf24;
  }

  .info-section h4 {
    margin: 0 0 0.75rem 0;
    color: #92400e;
  }

  .info-section ul {
    margin: 0;
    padding-left: 1.2rem;
    color: #92400e;
    font-size: 0.9rem;
  }

  .info-section li {
    margin-bottom: 0.5rem;
    line-height: 1.4;
  }

  /* 移动端适配 */
  @media (max-width: 768px) {
    .debug-content {
      width: 95vw;
      max-width: 500px;
      right: -10px;
    }

    .quick-test-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .stats-grid {
      grid-template-columns: 1fr;
    }

    .chart-bars {
      gap: 0.25rem;
    }

    .custom-test-controls,
    .batch-controls {
      flex-direction: column;
      align-items: stretch;
    }

    .count-input {
      margin-left: 0;
      margin-top: 0.5rem;
    }
  }
</style>
