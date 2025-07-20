<script setup lang="ts">
  import { ref, watch, nextTick, onMounted } from 'vue'
  import type { Player } from '../types/game'

  interface Props {
    players: Player[]
    currentPlayerIndex: number
  }

  const props = defineProps<Props>()

  // 引用玩家列表容器和当前玩家元素
  const playersContainer = ref<HTMLElement>()
  const playerCardRefs = ref<(HTMLElement | null)[]>([])

  // 设置玩家卡片引用的函数
  const setPlayerCardRef = (el: HTMLElement | null, index: number) => {
    // 确保数组有足够的长度
    if (!playerCardRefs.value) {
      playerCardRefs.value = []
    }

    // 扩展数组长度以适应索引
    while (playerCardRefs.value.length <= index) {
      playerCardRefs.value.push(null)
    }

    playerCardRefs.value[index] = el

    // 调试信息
    console.log(`Setting ref for player ${index}:`, !!el)
  }

  // 自动滚动到当前玩家
  const scrollToCurrentPlayer = () => {
    console.log('=== scrollToCurrentPlayer called ===')
    console.log('currentPlayerIndex:', props.currentPlayerIndex)
    console.log('players.length:', props.players.length)

    // 检测是否在移动设备上
    const isMobile = window.innerWidth <= 768
    console.log('📱 Device info:', {
      isMobile,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      userAgent: navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop',
    })

    if (!playersContainer.value) {
      console.log('❌ playersContainer not found')
      return
    }

    if (!playerCardRefs.value || playerCardRefs.value.length === 0) {
      console.log('❌ playerCardRefs array is empty or null')
      console.log('playerCardRefs.value:', playerCardRefs.value)
      return
    }

    if (props.currentPlayerIndex < 0 || props.currentPlayerIndex >= props.players.length) {
      console.log('❌ Invalid currentPlayerIndex:', props.currentPlayerIndex)
      return
    }

    const currentElement = playerCardRefs.value[props.currentPlayerIndex]
    if (!currentElement) {
      console.log('❌ currentElement not found for index:', props.currentPlayerIndex)
      console.log(
        'Available refs:',
        playerCardRefs.value.map((ref, i) => ({ index: i, exists: !!ref }))
      )
      return
    }

    const container = playersContainer.value
    const containerHeight = container.clientHeight
    const containerScrollTop = container.scrollTop
    const containerScrollHeight = container.scrollHeight

    // 获取元素相对于滚动容器的位置
    // 使用getBoundingClientRect来获取更准确的位置信息
    const containerRect = container.getBoundingClientRect()
    const elementRect = currentElement.getBoundingClientRect()

    // 计算元素相对于容器顶部的位置
    const elementTop = currentElement.offsetTop
    const elementHeight = currentElement.clientHeight

    // 也计算相对位置作为备用
    const relativeTop = elementRect.top - containerRect.top + containerScrollTop

    console.log('📊 Scroll calculation data:', {
      containerHeight,
      containerScrollTop,
      containerScrollHeight,
      elementTop,
      elementHeight,
      relativeTop,
      containerRect: { top: containerRect.top, height: containerRect.height },
      elementRect: { top: elementRect.top, height: elementRect.height },
      currentPlayerIndex: props.currentPlayerIndex,
    })

    // 使用更准确的相对位置计算
    const useRelativePosition = Math.abs(relativeTop - elementTop) > 10
    const actualElementTop = useRelativePosition ? relativeTop : elementTop

    console.log('📍 Using position:', useRelativePosition ? 'relative' : 'offset', actualElementTop)

    // 计算目标滚动位置：让当前玩家卡片的顶部对齐到容器顶部，并留出一些边距
    // 移动端使用更小的边距，确保更多内容可见
    const topMargin = isMobile ? 10 : 20 // 移动端10px，桌面端20px边距
    const targetScrollTop = actualElementTop - topMargin

    // 确保滚动位置在有效范围内
    const maxScrollTop = containerScrollHeight - containerHeight
    const finalScrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop))

    console.log('🎯 Scroll target:', {
      targetScrollTop,
      finalScrollTop,
      maxScrollTop,
      scrollDistance: Math.abs(finalScrollTop - containerScrollTop),
    })

    // 只有当滚动距离足够大时才执行滚动
    const minScrollDistance = 5
    if (Math.abs(finalScrollTop - containerScrollTop) < minScrollDistance) {
      console.log('⏭️ Scroll distance too small, skipping')
      return
    }

    // 执行滚动
    console.log('🚀 Executing scroll from', containerScrollTop, 'to', finalScrollTop)

    try {
      container.scrollTo({
        top: finalScrollTop,
        behavior: 'smooth',
      })
    } catch (error) {
      console.warn('⚠️ scrollTo failed, trying scrollIntoView fallback:', error)
      // 备用方案：使用scrollIntoView
      currentElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      })
    }

    // 验证滚动结果
    setTimeout(() => {
      const newScrollTop = container.scrollTop
      console.log('✅ Scroll completed. New position:', newScrollTop)
      console.log('Expected:', finalScrollTop, 'Actual:', newScrollTop)

      // 如果滚动没有达到预期位置，尝试备用方案
      const scrollDifference = Math.abs(newScrollTop - finalScrollTop)
      if (scrollDifference > 20) {
        console.warn('⚠️ Scroll position not as expected, trying scrollIntoView fallback')
        currentElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest',
        })
      }
    }, 600)
  }

  // 监听当前玩家变化，自动滚动
  watch(
    () => props.currentPlayerIndex,
    (newIndex, oldIndex) => {
      console.log('🔄 === WATCH TRIGGERED ===')
      console.log('currentPlayerIndex changed from', oldIndex, 'to', newIndex)
      console.log('Total players:', props.players.length)

      if (newIndex < 0 || newIndex >= props.players.length) {
        console.log('❌ Invalid player index:', newIndex)
        return
      }

      // 使用多重延迟确保DOM完全更新
      nextTick(() => {
        console.log('⏳ nextTick executed, waiting for DOM update...')

        // 第一次延迟：等待DOM更新
        setTimeout(() => {
          console.log('⏳ First timeout executed, checking refs...')

          // 检查refs是否已经准备好
          if (!playerCardRefs.value || !playerCardRefs.value[newIndex]) {
            console.log('⚠️ Refs not ready, waiting longer...')

            // 第二次延迟：等待refs准备好
            setTimeout(() => {
              console.log('⏳ Second timeout executed, calling scrollToCurrentPlayer')
              scrollToCurrentPlayer()
            }, 200)
          } else {
            console.log('✅ Refs ready, calling scrollToCurrentPlayer')
            scrollToCurrentPlayer()
          }
        }, 100)
      })
    },
    { immediate: false }
  )

  // 也监听players数组的变化，以防数组更新时需要重新滚动
  watch(
    () => props.players.length,
    (newLength, oldLength) => {
      console.log('👥 Players length changed from', oldLength, 'to', newLength)
      if (newLength > 0 && newLength !== oldLength) {
        // 重置refs数组以匹配新的玩家数量
        playerCardRefs.value = new Array(newLength).fill(null)

        nextTick(() => {
          setTimeout(() => {
            console.log('🔄 Scrolling after players array change')
            scrollToCurrentPlayer()
          }, 300)
        })
      }
    }
  )

  // 组件挂载后初始化
  onMounted(() => {
    console.log('🚀 PlayerPanel mounted')
    console.log('Initial players:', props.players.length)
    console.log('Initial currentPlayerIndex:', props.currentPlayerIndex)

    // 初始化refs数组
    if (props.players.length > 0) {
      playerCardRefs.value = new Array(props.players.length).fill(null)
    }

    // 初始化时也执行一次滚动，给更多时间让DOM完全渲染
    nextTick(() => {
      setTimeout(() => {
        console.log('🎯 Initial scroll after mount')
        scrollToCurrentPlayer()
      }, 500)
    })
  })

  // 暴露方法供调试使用
  const debugScroll = () => {
    console.log('🔍 === Debug Scroll Info ===')
    console.log('playersContainer.value:', !!playersContainer.value)
    console.log(
      'playerCardRefs.value:',
      playerCardRefs.value?.map((ref, i) => ({ index: i, exists: !!ref }))
    )
    console.log('props.currentPlayerIndex:', props.currentPlayerIndex)
    console.log('props.players.length:', props.players.length)

    if (playersContainer.value) {
      const container = playersContainer.value
      console.log('Container info:', {
        clientHeight: container.clientHeight,
        scrollHeight: container.scrollHeight,
        scrollTop: container.scrollTop,
        hasScrollbar: container.scrollHeight > container.clientHeight,
      })
    }

    scrollToCurrentPlayer()
  }

  // 强制滚动方法（使用scrollIntoView）
  const forceScrollToCurrentPlayer = () => {
    console.log('🔧 Force scroll using scrollIntoView')
    const currentElement = playerCardRefs.value?.[props.currentPlayerIndex]
    if (currentElement) {
      currentElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      })
    } else {
      console.log('❌ No element found for force scroll')
    }
  }

  // 在开发环境下暴露到window对象供调试
  if (import.meta.env.DEV) {
    const debugWindow = window as typeof window & {
      debugPlayerPanelScroll: typeof debugScroll
      forcePlayerPanelScroll: typeof forceScrollToCurrentPlayer
    }
    debugWindow.debugPlayerPanelScroll = debugScroll
    debugWindow.forcePlayerPanelScroll = forceScrollToCurrentPlayer
  }
</script>

<template>
  <div class="player-panel">
    <h3>玩家状态</h3>
    <div ref="playersContainer" class="players-container">
      <div class="players-grid">
        <div
          v-for="(player, index) in players"
          :key="player.id"
          :ref="el => setPlayerCardRef(el as HTMLElement | null, index)"
          class="player-card"
          :class="{
            current: currentPlayerIndex === index,
            winner: player.isWinner,
          }"
        >
          <div class="player-header">
            <div class="player-color" :style="{ backgroundColor: player.color }"></div>
            <span class="player-name">{{ player.name }}</span>
            <div v-if="player.isWinner" class="winner-badge">🏆</div>
          </div>
          <div class="player-stats">
            <div class="stat">
              <span class="label">位置:</span>
              <span class="value">{{ player.position === 0 ? '飞机场' : player.position }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .player-panel {
    background: white;
    border-radius: clamp(6px, 1.5vw, 8px);
    padding: clamp(0.8rem, 2.5vw, 1rem);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    margin-bottom: clamp(0.8rem, 2.5vw, 1rem);
  }

  .player-panel h3 {
    margin: 0 0 clamp(0.8rem, 2.5vw, 1rem) 0;
    color: #333;
    text-align: center;
    font-size: clamp(1.1rem, 3vw, 1.3rem);
  }

  .players-container {
    max-height: 60vh;
    min-height: 200px; /* 确保容器有最小高度 */
    overflow-y: auto;
    overflow-x: hidden;
    scroll-behavior: smooth;
    /* 确保在移动设备上滚动流畅 */
    -webkit-overflow-scrolling: touch;
    /* 自定义滚动条样式 */
    scrollbar-width: thin;
    scrollbar-color: #4ecdc4 #f0f0f0;
    /* 确保容器有明确的定位上下文 */
    position: relative;
  }

  .players-container::-webkit-scrollbar {
    width: 6px;
  }

  .players-container::-webkit-scrollbar-track {
    background: #f0f0f0;
    border-radius: 3px;
  }

  .players-container::-webkit-scrollbar-thumb {
    background: #4ecdc4;
    border-radius: 3px;
  }

  .players-container::-webkit-scrollbar-thumb:hover {
    background: #45b7b8;
  }

  .players-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(180px, 80vw), 1fr));
    gap: clamp(0.8rem, 2.5vw, 1rem);
    padding: clamp(0.2rem, 0.5vw, 0.4rem);
  }

  .player-card {
    border: 2px solid #e0e0e0;
    border-radius: clamp(6px, 1.5vw, 8px);
    padding: clamp(0.8rem, 2.5vw, 1rem);
    transition: all 0.3s ease;
    background: #fafafa;
  }

  .player-card.current {
    border-color: #4ecdc4;
    background: linear-gradient(135deg, #e8f5e8, #f0f8f0);
    box-shadow: 0 4px 12px rgba(78, 205, 196, 0.3);
    transform: translateY(-2px);
  }

  .player-card.winner {
    border-color: #ffd700;
    background: linear-gradient(135deg, #fff8e1, #fffde7);
    box-shadow: 0 4px 12px rgba(255, 215, 0, 0.3);
  }

  .player-header {
    display: flex;
    align-items: center;
    gap: clamp(0.4rem, 1vw, 0.5rem);
    margin-bottom: clamp(0.4rem, 1vw, 0.5rem);
  }

  .player-color {
    width: clamp(16px, 4vw, 20px);
    height: clamp(16px, 4vw, 20px);
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  .player-name {
    font-weight: bold;
    color: #333;
    flex: 1;
    font-size: clamp(0.9rem, 2.5vw, 1rem);
  }

  .winner-badge {
    font-size: clamp(1rem, 3vw, 1.2rem);
    animation: bounce 1s infinite;
  }

  .player-stats {
    display: flex;
    flex-direction: column;
    gap: clamp(0.4rem, 1vw, 0.5rem);
  }

  .stat {
    display: flex;
    align-items: center;
    gap: clamp(0.4rem, 1vw, 0.5rem);
  }

  .label {
    font-size: clamp(0.8rem, 2.5vw, 0.9rem);
    color: #666;
    min-width: clamp(35px, 8vw, 40px);
  }

  .value {
    font-weight: bold;
    color: #333;
    font-size: clamp(0.8rem, 2.5vw, 0.9rem);
  }

  @keyframes bounce {
    0%,
    20%,
    50%,
    80%,
    100% {
      transform: translateY(0);
    }
    40% {
      transform: translateY(-5px);
    }
    60% {
      transform: translateY(-3px);
    }
  }

  /* 自适应布局 - 移除固定断点，使用相对单位 */
  @media (max-width: 1023px) {
    .players-container {
      max-height: 50vh;
      min-height: 180px;
    }

    .players-grid {
      grid-template-columns: 1fr;
    }
  }

  /* 移动端优化 */
  @media (max-width: 767px) {
    .player-panel {
      padding: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .player-panel h3 {
      margin: 0 0 0.5rem 0;
      font-size: clamp(1rem, 2.5vw, 1.1rem);
    }

    .players-container {
      max-height: 40vh;
      min-height: 160px;
    }

    .players-container::-webkit-scrollbar {
      width: 4px;
    }

    .players-grid {
      gap: 0.5rem;
      padding: 0.2rem;
    }

    .player-card {
      padding: 0.5rem;
      border-width: 1px;
    }

    .player-header {
      gap: 0.3rem;
      margin-bottom: 0.3rem;
    }

    .player-color {
      width: clamp(12px, 3vw, 16px);
      height: clamp(12px, 3vw, 16px);
      border-width: 1px;
    }

    .player-name {
      font-size: clamp(0.8rem, 2.2vw, 0.9rem);
    }

    .winner-badge {
      font-size: clamp(0.8rem, 2.5vw, 1rem);
    }

    .player-stats {
      gap: 0.3rem;
    }

    .stat {
      gap: 0.3rem;
    }

    .label {
      font-size: clamp(0.7rem, 2vw, 0.8rem);
      min-width: clamp(30px, 7vw, 35px);
    }

    .value {
      font-size: clamp(0.7rem, 2vw, 0.8rem);
    }
  }

  /* 小屏手机优化 */
  @media (max-width: 480px) {
    .player-panel {
      padding: 0.4rem;
      margin-bottom: 0.4rem;
    }

    .player-panel h3 {
      margin: 0 0 0.4rem 0;
      font-size: clamp(0.9rem, 2.2vw, 1rem);
    }

    .players-container {
      max-height: 35vh;
    }

    .players-container::-webkit-scrollbar {
      width: 3px;
    }

    .players-grid {
      gap: 0.4rem;
      padding: 0.1rem;
    }

    .player-card {
      padding: 0.4rem;
    }

    .player-header {
      gap: 0.25rem;
      margin-bottom: 0.25rem;
    }

    .player-color {
      width: clamp(10px, 2.5vw, 12px);
      height: clamp(10px, 2.5vw, 12px);
    }

    .player-name {
      font-size: clamp(0.75rem, 2vw, 0.8rem);
    }

    .winner-badge {
      font-size: clamp(0.7rem, 2.2vw, 0.8rem);
    }

    .player-stats {
      gap: 0.25rem;
    }

    .stat {
      gap: 0.25rem;
    }

    .label {
      font-size: clamp(0.65rem, 1.8vw, 0.7rem);
      min-width: clamp(25px, 6vw, 30px);
    }

    .value {
      font-size: clamp(0.65rem, 1.8vw, 0.7rem);
    }
  }

  /* 超小屏手机优化 */
  @media (max-width: 360px) {
    .player-panel {
      padding: 0.3rem;
      margin-bottom: 0.3rem;
    }

    .player-panel h3 {
      margin: 0 0 0.3rem 0;
      font-size: clamp(0.8rem, 2vw, 0.9rem);
    }

    .players-container {
      max-height: 30vh;
    }

    .players-container::-webkit-scrollbar {
      width: 2px;
    }

    .players-grid {
      gap: 0.3rem;
      padding: 0.1rem;
    }

    .player-card {
      padding: 0.3rem;
    }

    .player-header {
      gap: 0.2rem;
      margin-bottom: 0.2rem;
    }

    .player-color {
      width: clamp(8px, 2vw, 10px);
      height: clamp(8px, 2vw, 10px);
    }

    .player-name {
      font-size: clamp(0.7rem, 1.8vw, 0.75rem);
    }

    .winner-badge {
      font-size: clamp(0.6rem, 1.8vw, 0.7rem);
    }

    .player-stats {
      gap: 0.2rem;
    }

    .stat {
      gap: 0.2rem;
    }

    .label {
      font-size: clamp(0.6rem, 1.5vw, 0.65rem);
      min-width: clamp(20px, 5vw, 25px);
    }

    .value {
      font-size: clamp(0.6rem, 1.5vw, 0.65rem);
    }
  }

  /* 横屏模式优化 */
  @media (max-width: 767px) and (orientation: landscape) {
    .player-panel {
      padding: 0.3rem;
      margin-bottom: 0.3rem;
    }

    .player-panel h3 {
      margin: 0 0 0.3rem 0;
      font-size: clamp(0.8rem, 2vw, 0.9rem);
    }

    .players-container {
      max-height: 25vh;
    }

    .players-container::-webkit-scrollbar {
      width: 3px;
    }

    .players-grid {
      gap: 0.3rem;
      padding: 0.1rem;
    }

    .player-card {
      padding: 0.3rem;
    }

    .player-header {
      gap: 0.2rem;
      margin-bottom: 0.2rem;
    }

    .player-color {
      width: clamp(10px, 2.5vw, 12px);
      height: clamp(10px, 2.5vw, 12px);
    }

    .player-name {
      font-size: clamp(0.75rem, 2vw, 0.8rem);
    }

    .player-stats {
      gap: 0.2rem;
    }

    .stat {
      gap: 0.2rem;
    }

    .label {
      font-size: clamp(0.65rem, 1.8vw, 0.7rem);
      min-width: clamp(25px, 6vw, 30px);
    }

    .value {
      font-size: clamp(0.65rem, 1.8vw, 0.7rem);
    }
  }
</style>
