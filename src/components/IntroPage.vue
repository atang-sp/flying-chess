<script setup lang="ts">
  import { ref, onMounted, onUnmounted, watch } from 'vue'
  import {
    Dices,
    Star,
    Gem,
    Code2,
    ExternalLink,
    Users,
    User,
    Minus,
    Plus,
    Rocket,
    Clock,
    Target,
    Eraser,
    Check,
  } from '@lucide/vue'
  import { savePlayerSettings, loadPlayerSettings, clearAllLocalGameData } from '../utils/cache'
  import { SecureRandom } from '../utils/secureRandom'
  import { devLog } from '../utils/logger'
  import VersionDisplay from './VersionDisplay.vue'

  interface Emits {
    (e: 'start', playerConfig: { count: number; names: string[] }): void
  }

  const emit = defineEmits<Emits>()

  // 玩家配置状态
  const playerCount = ref(2)
  const playerNames = ref<string[]>(['玩家1', '玩家2'])

  // 加载玩家设置的函数
  const loadAndApplyPlayerSettings = () => {
    const cachedSettings = loadPlayerSettings()
    if (cachedSettings) {
      devLog('IntroPage: 加载玩家设置', cachedSettings)
      playerCount.value = cachedSettings.playerCount
      playerNames.value = [...cachedSettings.playerNames]
    }
  }

  // 初始化时尝试加载本地缓存的玩家设置
  loadAndApplyPlayerSettings()

  // 监听玩家数量和名称变化并持久化
  watch(
    () => [playerCount.value, playerNames.value],
    () => {
      savePlayerSettings({ playerCount: playerCount.value, playerNames: playerNames.value })
    },
    { deep: true }
  )

  // 更新玩家名称数组
  const updatePlayerNames = () => {
    const currentNames = [...playerNames.value]
    const newNames: string[] = []

    for (let i = 0; i < playerCount.value; i++) {
      if (i < currentNames.length) {
        newNames.push(currentNames[i])
      } else {
        newNames.push(`玩家${i + 1}`)
      }
    }

    playerNames.value = newNames
  }

  // 监听玩家数量变化
  const onPlayerCountChange = (newCount: number) => {
    playerCount.value = newCount
    updatePlayerNames()
  }

  // 更新单个玩家名称
  const updatePlayerName = (index: number, name: string) => {
    playerNames.value[index] = name
  }

  const startGame = () => {
    emit('start', { count: playerCount.value, names: playerNames.value })
  }

  // 监听玩家设置更新事件
  const handlePlayerSettingsUpdate = (event: CustomEvent) => {
    devLog('IntroPage: 收到玩家设置更新事件', event.detail)
    loadAndApplyPlayerSettings()
  }

  // 清空缓存功能
  const clearCache = () => {
    try {
      clearAllLocalGameData()

      // 显示成功提示
      showClearSuccess.value = true

      // 3秒后隐藏提示
      setTimeout(() => {
        showClearSuccess.value = false
      }, 3000)

      devLog('本地游戏数据已清空')
    } catch (error) {
      console.error('清空缓存时出错:', error)
    }
  }

  // 显示清空成功提示
  const showClearSuccess = ref(false)

  // 粒子系统
  const particles = ref<
    Array<{ x: number; y: number; vx: number; vy: number; size: number; opacity: number }>
  >([])
  const animationId = ref<number>()

  onMounted(() => {
    initParticles()
    animateParticles()
    updatePlayerNames() // 初始化玩家名称

    // 监听玩家设置更新事件
    window.addEventListener('playerSettingsUpdated', handlePlayerSettingsUpdate as EventListener)
    devLog('IntroPage: 已注册玩家设置更新监听器')
  })

  onUnmounted(() => {
    if (animationId.value) {
      cancelAnimationFrame(animationId.value)
    }

    // 移除事件监听器
    window.removeEventListener('playerSettingsUpdated', handlePlayerSettingsUpdate as EventListener)
    devLog('IntroPage: 已移除玩家设置更新监听器')
  })

  const initParticles = () => {
    particles.value = Array.from({ length: 50 }, () => ({
      x: SecureRandom.random() * window.innerWidth,
      y: SecureRandom.random() * window.innerHeight,
      vx: (SecureRandom.random() - 0.5) * 0.5,
      vy: (SecureRandom.random() - 0.5) * 0.5,
      size: SecureRandom.random() * 3 + 1,
      opacity: SecureRandom.random() * 0.5 + 0.1,
    }))
  }

  const animateParticles = () => {
    particles.value.forEach(particle => {
      particle.x += particle.vx
      particle.y += particle.vy

      if (particle.x < 0 || particle.x > window.innerWidth) particle.vx *= -1
      if (particle.y < 0 || particle.y > window.innerHeight) particle.vy *= -1
    })

    animationId.value = requestAnimationFrame(animateParticles)
  }

  const getDiceStyle = (index: number) => {
    const delay = index * 0.5
    const left = 10 + index * 15
    const top = 20 + (index % 3) * 30

    return {
      left: `${left}%`,
      top: `${top}%`,
      animationDelay: `${delay}s`,
    }
  }

  const getStarStyle = (index: number) => {
    const delay = index * 0.3
    const right = 5 + index * 12
    const top = 15 + (index % 4) * 25

    return {
      right: `${right}%`,
      top: `${top}%`,
      animationDelay: `${delay}s`,
    }
  }

  const getParticleStyle = (particle: { x: number; y: number; size: number; opacity: number }) => {
    return {
      left: `${particle.x}px`,
      top: `${particle.y}px`,
      width: `${particle.size}px`,
      height: `${particle.size}px`,
      opacity: particle.opacity,
    }
  }
</script>

<template>
  <div class="intro-page">
    <!-- 粒子背景 -->
    <div class="particles-container">
      <div
        v-for="(particle, index) in particles"
        :key="index"
        class="particle"
        :style="getParticleStyle(particle)"
      ></div>
    </div>

    <!-- 主内容 -->
    <div class="intro-content">
      <!-- 标题区域 -->
      <div class="intro-header">
        <div class="title-container">
          <h1 class="game-title">
            <Dices :size="48" class="title-icon" />
            <span class="title-main">惩罚飞行棋</span>
            <div class="title-glow"></div>
          </h1>
          <div class="title-decoration">
            <div class="decoration-line left"></div>
            <div class="decoration-center">
              <Star :size="24" class="decoration-star" />
              <Gem :size="24" class="decoration-diamond" />
            </div>
            <div class="decoration-line right"></div>
          </div>
        </div>

        <div class="game-subtitle">
          <span class="subtitle-text">环形棋盘 · 自定义惩罚 · 刺激体验</span>
          <div class="subtitle-underline"></div>
        </div>

        <div class="developer-info">
          <div class="dev-card">
            <div class="dev-avatar"><Code2 :size="28" /></div>
            <div class="dev-details">
              <span class="dev-name">开发者：阿汤</span>
              <!-- 论坛宣传链接 -->
              <a
                href="https://atang-sp.run.place"
                target="_blank"
                rel="noopener noreferrer"
                class="dev-link"
              >
                <span class="dev-id">论坛: atang-sp.run.place</span>
                <ExternalLink :size="14" class="link-icon" />
              </a>
              <a
                href="https://x.com/sp_with_py"
                target="_blank"
                rel="noopener noreferrer"
                class="dev-link"
              >
                <span class="dev-id">@sp_with_py</span>
                <ExternalLink :size="14" class="link-icon" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- 玩家设置区域 -->
      <div class="player-settings">
        <div class="settings-header">
          <h2 class="settings-title">
            <Users :size="22" class="settings-icon" />
            <span class="settings-title-text">玩家设置</span>
          </h2>
          <div class="settings-underline"></div>
        </div>

        <!-- 玩家数量设置 -->
        <div class="player-count-section">
          <div class="setting-item">
            <label class="setting-label">
              <User :size="20" class="label-icon" />
              <span class="label-text">玩家人数</span>
            </label>
            <div class="count-controls">
              <button
                class="btn btn-secondary count-btn minus"
                :disabled="playerCount <= 1"
                @click="onPlayerCountChange(Math.max(1, playerCount - 1))"
              >
                <Minus :size="18" />
              </button>
              <div class="count-display">
                <span class="count-number">{{ playerCount }}</span>
                <span class="count-unit">人</span>
              </div>
              <button
                class="btn btn-secondary count-btn plus"
                @click="onPlayerCountChange(playerCount + 1)"
              >
                <Plus :size="18" />
              </button>
            </div>
          </div>
        </div>

        <!-- 玩家名称设置 -->
        <div class="player-names-section">
          <div class="names-header">
            <span class="names-title">玩家昵称</span>
          </div>
          <div class="names-list">
            <div v-for="(name, index) in playerNames" :key="index" class="name-item">
              <div class="name-input-container">
                <input
                  type="text"
                  :value="name"
                  class="name-input"
                  :placeholder="`玩家${index + 1}`"
                  maxlength="10"
                  @input="updatePlayerName(index, ($event.target as HTMLInputElement).value)"
                />
                <div class="input-glow"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作区域 -->
      <div class="intro-actions">
        <button class="btn btn-primary start-btn" @click="startGame">
          <Rocket :size="22" />
          <span class="btn-text">开始游戏</span>
        </button>

        <div class="game-info">
          <div class="info-item">
            <Clock :size="16" class="info-icon" />
            <span class="info-text">游戏时长：约10-20分钟</span>
          </div>
          <div class="info-item">
            <Target :size="16" class="info-icon" />
            <span class="info-text">适合年龄：18岁以上</span>
          </div>
        </div>

        <!-- 清空缓存选项 -->
        <div class="cache-controls">
          <button
            class="btn btn-danger clear-cache-btn"
            title="清除保存在此设备上的游戏配置、玩家设置和引导偏好"
            @click="clearCache"
          >
            <Eraser :size="16" />
            <span class="btn-text">清除本地游戏数据</span>
          </button>
          <p class="cache-hint">清除后刷新页面即可从默认配置重新开始</p>
        </div>

        <!-- 清空成功提示 -->
        <div v-if="showClearSuccess" class="clear-success-toast">
          <Check :size="18" class="toast-icon" />
          <span class="toast-text">本地游戏数据已清除</span>
        </div>
      </div>
    </div>

    <!-- 背景装饰 -->
    <div class="background-decoration">
      <div v-for="i in 8" :key="i" class="floating-dice" :style="getDiceStyle(i)">
        <Dices :size="28" />
      </div>
      <div v-for="i in 12" :key="i" class="floating-star" :style="getStarStyle(i)">
        <Star :size="24" />
      </div>
      <div class="geometric-shapes">
        <div class="shape shape-1"></div>
        <div class="shape shape-2"></div>
        <div class="shape shape-3"></div>
      </div>
    </div>

    <!-- 光效装饰 -->
    <div class="light-effects">
      <div class="light-beam light-1"></div>
      <div class="light-beam light-2"></div>
      <div class="light-beam light-3"></div>
    </div>

    <!-- 版本显示组件 -->
    <VersionDisplay />
  </div>
</template>

<style scoped>
  .intro-page {
    min-height: 100vh;
    background: linear-gradient(
      135deg,
      #0c0c0c 0%,
      #1a1a2e 25%,
      #16213e 50%,
      #0f3460 75%,
      #533483 100%
    );
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }

  /* 粒子背景 */
  .particles-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
  }

  .particle {
    position: absolute;
    background: radial-gradient(
      circle,
      rgba(255, 255, 255, 0.8) 0%,
      rgba(255, 255, 255, 0.2) 70%,
      transparent 100%
    );
    border-radius: 50%;
    pointer-events: none;
  }

  /* 主内容 */
  .intro-content {
    text-align: center;
    color: var(--text-primary);
    z-index: 10;
    max-width: min(900px, 95vw);
    padding: clamp(1rem, 4vw, 2rem);
    position: relative;
  }

  /* 标题区域 */
  .intro-header {
    margin-bottom: clamp(3rem, 8vw, 4rem);
  }

  .title-container {
    position: relative;
    margin-bottom: clamp(1rem, 3vw, 2rem);
  }

  .game-title {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: clamp(0.5rem, 2vw, 1rem);
    font-size: clamp(2.5rem, 10vw, 5rem);
    font-weight: 900;
    margin: 0;
    position: relative;
    z-index: 2;
  }

  .title-main {
    background: linear-gradient(
      135deg,
      var(--player-1),
      var(--player-2),
      var(--player-3),
      var(--player-4),
      var(--color-accent)
    );
    background-size: 300% 300%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation:
      gradientShift 3s ease-in-out infinite,
      titleFloat 4s ease-in-out infinite;
  }

  .title-icon {
    flex-shrink: 0;
    color: var(--color-accent-light);
    animation: titleFloat 4s ease-in-out infinite;
  }

  .title-glow {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      135deg,
      var(--player-1),
      var(--player-2),
      var(--player-3),
      var(--player-4),
      var(--color-accent)
    );
    background-size: 300% 300%;
    filter: blur(20px);
    opacity: 0.3;
    z-index: -1;
    animation: gradientShift 3s ease-in-out infinite;
  }

  .title-decoration {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: clamp(1rem, 3vw, 2rem);
    margin: clamp(1rem, 3vw, 2rem) 0;
  }

  .decoration-line {
    width: clamp(80px, 20vw, 150px);
    height: 3px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8), transparent);
    position: relative;
  }

  .decoration-line::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(90deg, transparent, var(--player-1), transparent);
    animation: lineGlow 2s ease-in-out infinite;
  }

  .decoration-center {
    display: flex;
    gap: clamp(0.5rem, 2vw, 1rem);
  }

  .decoration-star,
  .decoration-diamond {
    color: var(--color-accent-light);
    animation: starTwinkle 2s ease-in-out infinite;
  }

  .decoration-diamond {
    animation-delay: 1s;
  }

  .game-subtitle {
    font-size: clamp(1.2rem, 4vw, 1.5rem);
    margin: clamp(1rem, 3vw, 2rem) 0;
    position: relative;
    display: inline-block;
  }

  .subtitle-text {
    position: relative;
    z-index: 2;
    font-weight: 300;
    letter-spacing: 1px;
    color: var(--text-secondary);
  }

  .subtitle-underline {
    position: absolute;
    bottom: -5px;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--player-1), transparent);
    animation: underlineGlow 2s ease-in-out infinite;
  }

  /* 开发者信息 */
  .developer-info {
    margin-top: clamp(1.5rem, 4vw, 2rem);
  }

  .dev-card {
    display: inline-flex;
    align-items: center;
    gap: clamp(0.8rem, 2vw, 1rem);
    padding: clamp(0.8rem, 2vw, 1.2rem) clamp(1.5rem, 4vw, 2rem);
    background: var(--bg-glass);
    border-radius: var(--radius-xl);
    backdrop-filter: blur(var(--glass-blur));
    border: var(--glass-border);
    transition: all var(--transition-normal);
  }

  .dev-card:hover {
    transform: translateY(-3px);
    background: var(--bg-glass-hover);
    box-shadow: var(--glass-shadow);
  }

  .dev-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-accent-light);
    animation: avatarFloat 3s ease-in-out infinite;
  }

  .dev-details {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .dev-name {
    font-size: clamp(0.9rem, 2.5vw, 1rem);
    font-weight: 500;
    color: var(--text-primary);
  }

  .dev-link {
    font-size: clamp(0.7rem, 2vw, 0.8rem);
    opacity: 0.8;
    font-weight: bold;
    color: var(--player-2);
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    transition: all var(--transition-normal);
    padding: 0.2rem 0.5rem;
    border-radius: var(--radius-sm);
    background: rgba(var(--player-2-rgb), 0.1);
    border: 1px solid rgba(var(--player-2-rgb), 0.2);
  }

  .dev-link:hover {
    opacity: 1;
    color: var(--text-primary);
    background: rgba(var(--player-2-rgb), 0.2);
    border-color: rgba(var(--player-2-rgb), 0.4);
    transform: translateY(-1px);
    box-shadow: var(--glow-sm) rgba(var(--player-2-rgb), 0.3);
  }

  .link-icon {
    flex-shrink: 0;
    transition: transform var(--transition-normal);
  }

  .dev-link:hover .link-icon {
    transform: scale(1.2);
  }

  /* 玩家设置区域 */
  .player-settings {
    margin: clamp(2rem, 6vw, 3rem) 0;
    padding: clamp(1.5rem, 4vw, 2rem);
    background: var(--bg-glass);
    border-radius: var(--radius-xl);
    backdrop-filter: blur(var(--glass-blur));
    border: var(--glass-border);
    box-shadow: var(--glass-shadow);
  }

  .settings-header {
    text-align: center;
    margin-bottom: clamp(1.5rem, 4vw, 2rem);
  }

  .settings-title {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-size: clamp(1.3rem, 4vw, 1.6rem);
    font-weight: 700;
    margin: 0 0 clamp(0.5rem, 1.5vw, 0.8rem) 0;
  }

  .settings-icon {
    color: var(--player-2);
    flex-shrink: 0;
  }

  .settings-title-text {
    background: linear-gradient(135deg, var(--player-2), var(--player-3));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .settings-underline {
    width: clamp(60px, 15vw, 100px);
    height: 3px;
    background: linear-gradient(90deg, var(--player-2), var(--player-3));
    margin: 0 auto;
    border-radius: 2px;
    animation: underlineGlow 2s ease-in-out infinite;
  }

  /* 玩家数量设置 */
  .player-count-section {
    margin-bottom: clamp(1.5rem, 4vw, 2rem);
  }

  .setting-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: clamp(1rem, 3vw, 1.5rem);
    padding: clamp(1rem, 3vw, 1.5rem);
    background: var(--bg-surface);
    border-radius: var(--radius-lg);
    border: var(--glass-border);
    transition: all var(--transition-normal);
  }

  .setting-item:hover {
    background: var(--bg-glass);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .setting-label {
    display: flex;
    align-items: center;
    gap: clamp(0.5rem, 1.5vw, 0.8rem);
    font-size: clamp(1rem, 3vw, 1.1rem);
    font-weight: 600;
    color: var(--text-primary);
    cursor: pointer;
  }

  .label-icon {
    color: var(--color-accent-light);
    flex-shrink: 0;
  }

  .count-controls {
    display: flex;
    align-items: center;
    gap: clamp(0.8rem, 2vw, 1rem);
  }

  .count-btn {
    width: clamp(40px, 10vw, 50px);
    height: clamp(40px, 10vw, 50px);
    min-width: clamp(40px, 10vw, 50px);
    min-height: clamp(40px, 10vw, 50px);
    padding: 0;
    border-radius: var(--radius-full);
  }

  .count-display {
    display: flex;
    align-items: center;
    gap: clamp(0.3rem, 1vw, 0.5rem);
    padding: clamp(0.5rem, 1.5vw, 0.8rem) clamp(1rem, 3vw, 1.5rem);
    background: var(--bg-glass);
    border-radius: var(--radius-md);
    border: var(--glass-border);
    min-width: clamp(80px, 20vw, 100px);
    justify-content: center;
  }

  .count-number {
    font-size: clamp(1.2rem, 3.5vw, 1.4rem);
    font-weight: 700;
    color: var(--player-2);
  }

  .count-unit {
    font-size: clamp(0.9rem, 2.5vw, 1rem);
    color: var(--text-secondary);
  }

  /* 玩家名称设置 */
  .player-names-section {
    margin-top: clamp(1.5rem, 4vw, 2rem);
  }

  .names-header {
    margin-bottom: clamp(1rem, 3vw, 1.5rem);
    text-align: center;
  }

  .names-title {
    font-size: clamp(1rem, 3vw, 1.1rem);
    font-weight: 600;
    color: var(--text-primary);
  }

  .names-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(200px, 80vw), 1fr));
    gap: clamp(0.8rem, 2vw, 1rem);
  }

  .name-item {
    position: relative;
  }

  .name-input-container {
    position: relative;
    display: flex;
    align-items: center;
  }

  .name-input {
    width: 100%;
    padding: clamp(0.8rem, 2vw, 1rem) clamp(1rem, 3vw, 1.2rem);
    background: rgba(10, 10, 26, 0.6);
    border: var(--glass-border);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: clamp(0.9rem, 2.5vw, 1rem);
    font-weight: 500;
    transition: all var(--transition-normal);
    backdrop-filter: blur(var(--glass-blur));
  }

  .name-input::placeholder {
    color: var(--text-muted);
  }

  .name-input:focus {
    outline: none;
    border-color: var(--color-accent);
    background: var(--bg-glass-hover);
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
  }

  .name-input:hover {
    border-color: rgba(255, 255, 255, 0.2);
    background: var(--bg-glass);
  }

  .input-glow {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(139, 156, 247, 0.1));
    border-radius: inherit;
    opacity: 0;
    transition: opacity var(--transition-normal);
    pointer-events: none;
  }

  .name-input:focus + .input-glow {
    opacity: 1;
  }

  /* 操作区域 */
  .intro-actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: clamp(2rem, 5vw, 3rem);
  }

  .start-btn {
    padding: clamp(1.2rem, 4vw, 1.8rem) clamp(3rem, 8vw, 4rem);
    font-size: clamp(1.1rem, 3.5vw, 1.4rem);
    border-radius: var(--radius-full);
    min-height: clamp(50px, 12vw, 70px);
    min-width: clamp(200px, 60vw, 300px);
  }

  .game-info {
    display: flex;
    flex-direction: column;
    gap: clamp(0.5rem, 1.5vw, 0.8rem);
    opacity: 0.8;
  }

  .info-item {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: clamp(0.5rem, 1.5vw, 0.8rem);
    font-size: clamp(0.8rem, 2.5vw, 0.9rem);
    color: var(--text-secondary);
  }

  .info-icon {
    color: var(--color-accent-light);
    flex-shrink: 0;
  }

  /* 背景装饰 */
  .background-decoration {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
  }

  .floating-dice,
  .floating-star {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-accent-light);
    opacity: 0.2;
    filter: blur(0.5px);
  }

  .floating-dice {
    animation: floatDice 12s ease-in-out infinite;
  }

  .floating-star {
    animation: floatStar 15s ease-in-out infinite;
  }

  .geometric-shapes {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  .shape {
    position: absolute;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
    animation: shapeFloat 20s ease-in-out infinite;
  }

  .shape-1 {
    width: 100px;
    height: 100px;
    top: 10%;
    left: 10%;
    animation-delay: 0s;
  }

  .shape-2 {
    width: 150px;
    height: 150px;
    top: 60%;
    right: 15%;
    animation-delay: 5s;
  }

  .shape-3 {
    width: 80px;
    height: 80px;
    bottom: 20%;
    left: 20%;
    animation-delay: 10s;
  }

  /* 光效装饰 */
  .light-effects {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
  }

  .light-beam {
    position: absolute;
    width: 2px;
    height: 100%;
    background: linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.3), transparent);
    animation: lightSweep 8s ease-in-out infinite;
  }

  .light-1 {
    left: 20%;
    animation-delay: 0s;
  }

  .light-2 {
    left: 50%;
    animation-delay: 2.5s;
  }

  .light-3 {
    left: 80%;
    animation-delay: 5s;
  }

  /* 动画定义 */
  @keyframes gradientShift {
    0%,
    100% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
  }

  @keyframes titleFloat {
    0%,
    100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-10px);
    }
  }

  @keyframes lineGlow {
    0%,
    100% {
      opacity: 0.5;
    }
    50% {
      opacity: 1;
    }
  }

  @keyframes starTwinkle {
    0%,
    100% {
      opacity: 1;
      transform: scale(1) rotate(0deg);
    }
    50% {
      opacity: 0.7;
      transform: scale(1.2) rotate(180deg);
    }
  }

  @keyframes underlineGlow {
    0%,
    100% {
      opacity: 0.5;
    }
    50% {
      opacity: 1;
    }
  }

  @keyframes avatarFloat {
    0%,
    100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-5px);
    }
  }

  @keyframes floatDice {
    0%,
    100% {
      transform: translateY(0px) rotate(0deg) scale(1);
      opacity: 0.2;
    }
    50% {
      transform: translateY(-30px) rotate(180deg) scale(1.1);
      opacity: 0.4;
    }
  }

  @keyframes floatStar {
    0%,
    100% {
      transform: translateY(0px) scale(1) rotate(0deg);
      opacity: 0.2;
    }
    50% {
      transform: translateY(-25px) scale(1.3) rotate(90deg);
      opacity: 0.4;
    }
  }

  @keyframes shapeFloat {
    0%,
    100% {
      transform: translateY(0px) rotate(0deg);
      opacity: 0.1;
    }
    50% {
      transform: translateY(-40px) rotate(180deg);
      opacity: 0.3;
    }
  }

  @keyframes lightSweep {
    0% {
      transform: translateY(-100%) scaleY(0);
      opacity: 0;
    }
    50% {
      transform: translateY(0%) scaleY(1);
      opacity: 1;
    }
    100% {
      transform: translateY(100%) scaleY(0);
      opacity: 0;
    }
  }

  /* 移动端优化 */
  @media (max-width: 767px) {
    .intro-page {
      padding: 1rem;
      min-height: 100vh;
    }

    .intro-content {
      gap: 1.5rem;
      padding: 1rem;
    }

    .intro-header {
      gap: 1rem;
    }

    .title-container {
      gap: 0.5rem;
    }

    .game-title {
      font-size: clamp(1.8rem, 6vw, 2.5rem);
      line-height: 1.2;
    }

    .title-decoration {
      gap: 0.5rem;
    }

    .decoration-line {
      height: 2px;
      width: clamp(40px, 15vw, 60px);
    }

    .decoration-center {
      gap: 0.3rem;
    }

    .decoration-star,
    .decoration-diamond {
      font-size: clamp(0.8rem, 2.5vw, 1rem);
    }

    .game-subtitle {
      gap: 0.3rem;
    }

    .subtitle-text {
      font-size: clamp(0.9rem, 2.5vw, 1rem);
    }

    .subtitle-underline {
      height: 1px;
      width: clamp(120px, 40vw, 200px);
    }

    .developer-info {
      gap: 0.5rem;
    }

    .dev-card {
      padding: 0.5rem;
      gap: 0.5rem;
    }

    .dev-avatar {
      font-size: clamp(1.5rem, 4vw, 2rem);
    }

    .dev-details {
      gap: 0.2rem;
    }

    .dev-name {
      font-size: clamp(0.8rem, 2.2vw, 0.9rem);
    }

    .dev-link {
      gap: 0.2rem;
    }

    .dev-id {
      font-size: clamp(0.7rem, 2vw, 0.8rem);
    }

    .link-icon {
      font-size: clamp(0.6rem, 1.8vw, 0.7rem);
    }

    .intro-actions {
      gap: 1rem;
    }

    .start-btn {
      padding: clamp(0.8rem, 3vw, 1rem) clamp(1.5rem, 5vw, 2rem);
      border-radius: var(--radius-md);
      min-height: clamp(48px, 12vw, 56px);
    }

    .btn-text {
      font-size: clamp(1rem, 2.8vw, 1.2rem);
    }

    .game-info {
      gap: 0.5rem;
    }

    .info-item {
      gap: 0.3rem;
    }

    .info-icon {
      font-size: clamp(0.8rem, 2.2vw, 0.9rem);
    }

    .info-text {
      font-size: clamp(0.7rem, 2vw, 0.8rem);
    }

    .floating-dice {
      display: none; /* 移动端隐藏浮动骰子以节省空间 */
    }

    .floating-stars {
      display: none; /* 移动端隐藏浮动星星以节省空间 */
    }
  }

  /* 小屏手机优化 */
  @media (max-width: 480px) {
    .intro-page {
      padding: 0.5rem;
    }

    .intro-content {
      gap: 1rem;
      padding: 0.5rem;
    }

    .intro-header {
      gap: 0.8rem;
    }

    .game-title {
      font-size: clamp(1.5rem, 5vw, 1.8rem);
    }

    .title-decoration {
      gap: 0.4rem;
    }

    .decoration-line {
      width: clamp(30px, 12vw, 40px);
    }

    .decoration-star,
    .decoration-diamond {
      font-size: clamp(0.7rem, 2vw, 0.8rem);
    }

    .subtitle-text {
      font-size: clamp(0.8rem, 2.2vw, 0.9rem);
    }

    .subtitle-underline {
      width: clamp(100px, 35vw, 150px);
    }

    .dev-card {
      padding: 0.4rem;
      gap: 0.4rem;
    }

    .dev-avatar {
      font-size: clamp(1.3rem, 3.5vw, 1.5rem);
    }

    .dev-name {
      font-size: clamp(0.75rem, 2vw, 0.8rem);
    }

    .dev-id {
      font-size: clamp(0.65rem, 1.8vw, 0.7rem);
    }

    .start-btn {
      padding: clamp(0.7rem, 2.5vw, 0.8rem) clamp(1.2rem, 4vw, 1.5rem);
      min-height: clamp(44px, 11vw, 48px);
    }

    .btn-text {
      font-size: clamp(0.9rem, 2.5vw, 1rem);
    }

    .game-info {
      gap: 0.4rem;
    }

    .info-item {
      gap: 0.25rem;
    }

    .info-icon {
      font-size: clamp(0.7rem, 2vw, 0.8rem);
    }

    .info-text {
      font-size: clamp(0.65rem, 1.8vw, 0.7rem);
    }
  }

  /* 超小屏手机优化 */
  @media (max-width: 360px) {
    .intro-page {
      padding: 0.3rem;
    }

    .intro-content {
      gap: 0.8rem;
      padding: 0.3rem;
    }

    .intro-header {
      gap: 0.6rem;
    }

    .game-title {
      font-size: clamp(1.3rem, 4.5vw, 1.5rem);
    }

    .title-decoration {
      gap: 0.3rem;
    }

    .decoration-line {
      width: clamp(25px, 10vw, 30px);
    }

    .decoration-star,
    .decoration-diamond {
      font-size: clamp(0.6rem, 1.8vw, 0.7rem);
    }

    .subtitle-text {
      font-size: clamp(0.75rem, 2vw, 0.8rem);
    }

    .subtitle-underline {
      width: clamp(80px, 30vw, 120px);
    }

    .dev-card {
      padding: 0.3rem;
      gap: 0.3rem;
    }

    .dev-avatar {
      font-size: clamp(1.1rem, 3vw, 1.3rem);
    }

    .dev-name {
      font-size: clamp(0.7rem, 1.8vw, 0.75rem);
    }

    .dev-id {
      font-size: clamp(0.6rem, 1.5vw, 0.65rem);
    }

    .intro-features {
      gap: 0.5rem;
    }

    .feature-item {
      padding: 0.5rem;
      gap: 0.3rem;
    }

    .feature-icon-container {
      width: clamp(30px, 8vw, 35px);
      height: clamp(30px, 8vw, 35px);
    }

    .feature-icon {
      font-size: clamp(0.9rem, 2.2vw, 1rem);
    }

    .feature-text h3 {
      font-size: clamp(0.75rem, 2vw, 0.8rem);
      margin-bottom: 0.1rem;
    }

    .feature-text p {
      font-size: clamp(0.6rem, 1.5vw, 0.65rem);
    }

    .start-btn {
      padding: clamp(0.6rem, 2vw, 0.7rem) clamp(1rem, 3.5vw, 1.2rem);
      min-height: clamp(40px, 10vw, 44px);
    }

    .btn-text {
      font-size: clamp(0.8rem, 2.2vw, 0.9rem);
    }

    .game-info {
      gap: 0.3rem;
    }

    .info-item {
      gap: 0.2rem;
    }

    .info-icon {
      font-size: clamp(0.65rem, 1.8vw, 0.7rem);
    }

    .info-text {
      font-size: clamp(0.6rem, 1.5vw, 0.65rem);
    }
  }

  /* 横屏模式优化 */
  @media (max-width: 767px) and (orientation: landscape) {
    .intro-page {
      padding: 0.5rem;
    }

    .intro-content {
      gap: 1rem;
      padding: 0.5rem;
    }

    .intro-header {
      gap: 0.8rem;
    }

    .game-title {
      font-size: clamp(1.5rem, 5vw, 1.8rem);
    }

    .title-decoration {
      gap: 0.4rem;
    }

    .decoration-line {
      width: clamp(30px, 12vw, 40px);
    }

    .decoration-star,
    .decoration-diamond {
      font-size: clamp(0.7rem, 2vw, 0.8rem);
    }

    .subtitle-text {
      font-size: clamp(0.8rem, 2.2vw, 0.9rem);
    }

    .subtitle-underline {
      width: clamp(100px, 35vw, 150px);
    }

    .dev-card {
      padding: 0.4rem;
      gap: 0.4rem;
    }

    .dev-avatar {
      font-size: clamp(1.3rem, 3.5vw, 1.5rem);
    }

    .dev-name {
      font-size: clamp(0.75rem, 2vw, 0.8rem);
    }

    .dev-id {
      font-size: clamp(0.65rem, 1.8vw, 0.7rem);
    }

    .start-btn {
      padding: clamp(0.7rem, 2.5vw, 0.8rem) clamp(1.2rem, 4vw, 1.5rem);
      min-height: clamp(44px, 11vw, 48px);
    }

    .btn-text {
      font-size: clamp(0.9rem, 2.5vw, 1rem);
    }

    .game-info {
      gap: 0.4rem;
    }

    .info-item {
      gap: 0.25rem;
    }

    .info-icon {
      font-size: clamp(0.7rem, 2vw, 0.8rem);
    }

    .info-text {
      font-size: clamp(0.65rem, 1.8vw, 0.7rem);
    }
  }

  /* 清空缓存控件样式 */
  .cache-controls {
    margin-top: 1.5rem;
    text-align: center;
  }

  .clear-cache-btn {
    font-size: 0.85rem;
  }

  .cache-hint {
    margin-top: 0.5rem;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  /* 清空成功提示样式 */
  .clear-success-toast {
    position: fixed;
    top: 2rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.8rem 1.5rem;
    background: rgba(34, 197, 94, 0.95);
    color: var(--text-primary);
    border-radius: var(--radius-sm);
    font-size: 0.9rem;
    font-weight: 500;
    box-shadow: var(--glass-shadow);
    backdrop-filter: blur(var(--glass-blur));
    border: 1px solid rgba(34, 197, 94, 0.3);
    z-index: 1000;
    animation: toastSlideIn 0.3s ease-out;
  }

  .toast-icon {
    flex-shrink: 0;
  }

  @keyframes toastSlideIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  /* 移动端适配 */
  @media (max-width: 768px) {
    .cache-controls {
      margin-top: 1rem;
    }

    .clear-cache-btn {
      padding: 0.5rem 1rem;
      font-size: 0.8rem;
    }

    .cache-hint {
      font-size: 0.7rem;
    }

    .clear-success-toast {
      top: 1rem;
      padding: 0.6rem 1.2rem;
      font-size: 0.85rem;
    }
  }
</style>
