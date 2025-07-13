<script setup lang="ts">
  import { ref, onMounted, onUnmounted, watch } from 'vue'
  import { savePlayerSettings, loadPlayerSettings } from '../utils/cache'

  interface Emits {
    (e: 'start', playerConfig: { count: number; names: string[] }): void
  }

  const emit = defineEmits<Emits>()

  // 玩家配置状态
  const playerCount = ref(2)
  const playerNames = ref<string[]>(['玩家1', '玩家2'])

  // 初始化时尝试加载本地缓存的玩家设置
  const cachedSettings = loadPlayerSettings()
  if (cachedSettings) {
    playerCount.value = cachedSettings.playerCount
    playerNames.value = [...cachedSettings.playerNames]
  }

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
    emit('start', {
      count: playerCount.value,
      names: playerNames.value,
    })
  }

  // 粒子系统
  const particles = ref<
    Array<{ x: number; y: number; vx: number; vy: number; size: number; opacity: number }>
  >([])
  const animationId = ref<number>()

  onMounted(() => {
    initParticles()
    animateParticles()
    updatePlayerNames() // 初始化玩家名称
  })

  onUnmounted(() => {
    if (animationId.value) {
      cancelAnimationFrame(animationId.value)
    }
  })

  const initParticles = () => {
    particles.value = Array.from({ length: 50 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 3 + 1,
      opacity: Math.random() * 0.5 + 0.1,
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
            <span class="title-main">🎲 惩罚飞行棋</span>
            <div class="title-glow"></div>
          </h1>
          <div class="title-decoration">
            <div class="decoration-line left"></div>
            <div class="decoration-center">
              <span class="decoration-star">⭐</span>
              <span class="decoration-diamond">💎</span>
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
            <div class="dev-avatar">👨‍💻</div>
            <div class="dev-details">
              <span class="dev-name">开发者：阿汤</span>
              <a
                href="https://x.com/sp_with_py"
                target="_blank"
                rel="noopener noreferrer"
                class="dev-link"
              >
                <span class="dev-id">@sp_with_py</span>
                <span class="link-icon">🔗</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- 玩家设置区域 -->
      <div class="player-settings">
        <div class="settings-header">
          <h2 class="settings-title">👥 玩家设置</h2>
          <div class="settings-underline"></div>
        </div>

        <!-- 玩家数量设置 -->
        <div class="player-count-section">
          <div class="setting-item">
            <label class="setting-label">
              <span class="label-icon">👤</span>
              <span class="label-text">玩家人数</span>
            </label>
            <div class="count-controls">
              <button
                class="count-btn minus"
                :disabled="playerCount <= 1"
                @click="onPlayerCountChange(Math.max(1, playerCount - 1))"
              >
                <span class="btn-icon">➖</span>
              </button>
              <div class="count-display">
                <span class="count-number">{{ playerCount }}</span>
                <span class="count-unit">人</span>
              </div>
              <button class="count-btn plus" @click="onPlayerCountChange(playerCount + 1)">
                <span class="btn-icon">➕</span>
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

      <!-- 特性展示 -->
      <div class="intro-features">
        <div class="feature-item" data-feature="board">
          <div class="feature-icon-container">
            <div class="feature-icon">⚙️</div>
            <div class="icon-glow"></div>
          </div>
          <div class="feature-text">
            <h3>自定义棋盘</h3>
            <p>格子数量、类型可配置</p>
          </div>
          <div class="feature-hover-effect"></div>
        </div>

        <div class="feature-item" data-feature="game">
          <div class="feature-icon-container">
            <div class="feature-icon">📊</div>
            <div class="icon-glow"></div>
          </div>
          <div class="feature-text">
            <h3>自定义惩罚</h3>
            <p>姿势、工具、部位类型，比例可配置</p>
          </div>
          <div class="feature-hover-effect"></div>
        </div>

        <div class="feature-item" data-feature="animation">
          <div class="feature-icon-container">
            <div class="feature-icon">🎨</div>
            <div class="icon-glow"></div>
          </div>
          <div class="feature-text">
            <h3>精美动画</h3>
            <p>流畅的视觉效果</p>
          </div>
          <div class="feature-hover-effect"></div>
        </div>
      </div>

      <!-- 操作区域 -->
      <div class="intro-actions">
        <button class="start-btn" @click="startGame">
          <div class="btn-content">
            <span class="btn-icon">🚀</span>
            <span class="btn-text">开始游戏</span>
          </div>
          <div class="btn-glow"></div>
          <div class="btn-particles"></div>
        </button>

        <div class="game-info">
          <div class="info-item">
            <span class="info-icon">⏱️</span>
            <span class="info-text">游戏时长：约10-20分钟</span>
          </div>
          <div class="info-item">
            <span class="info-icon">🎯</span>
            <span class="info-text">适合年龄：18岁以上</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 背景装饰 -->
    <div class="background-decoration">
      <div v-for="i in 8" :key="i" class="floating-dice" :style="getDiceStyle(i)">🎲</div>
      <div v-for="i in 12" :key="i" class="floating-star" :style="getStarStyle(i)">⭐</div>
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
    color: white;
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
    font-size: clamp(2.5rem, 10vw, 5rem);
    font-weight: 900;
    margin: 0;
    position: relative;
    z-index: 2;
    background: linear-gradient(135deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #feca57);
    background-size: 300% 300%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation:
      gradientShift 3s ease-in-out infinite,
      titleFloat 4s ease-in-out infinite;
  }

  .title-glow {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #feca57);
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
    background: linear-gradient(90deg, transparent, #ff6b6b, transparent);
    animation: lineGlow 2s ease-in-out infinite;
  }

  .decoration-center {
    display: flex;
    gap: clamp(0.5rem, 2vw, 1rem);
  }

  .decoration-star,
  .decoration-diamond {
    font-size: clamp(1.5rem, 4vw, 2rem);
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
  }

  .subtitle-underline {
    position: absolute;
    bottom: -5px;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, #ff6b6b, transparent);
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
    background: rgba(255, 255, 255, 0.1);
    border-radius: clamp(15px, 4vw, 25px);
    backdrop-filter: blur(15px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    transition: all 0.3s ease;
  }

  .dev-card:hover {
    transform: translateY(-3px);
    background: rgba(255, 255, 255, 0.15);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  }

  .dev-avatar {
    font-size: clamp(1.5rem, 4vw, 2rem);
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
  }

  .dev-link {
    font-size: clamp(0.7rem, 2vw, 0.8rem);
    opacity: 0.8;
    font-weight: bold;
    color: #4ecdc4;
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    transition: all 0.3s ease;
    padding: 0.2rem 0.5rem;
    border-radius: 0.5rem;
    background: rgba(78, 205, 196, 0.1);
    border: 1px solid rgba(78, 205, 196, 0.2);
  }

  .dev-link:hover {
    opacity: 1;
    color: #fff;
    background: rgba(78, 205, 196, 0.2);
    border-color: rgba(78, 205, 196, 0.4);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(78, 205, 196, 0.3);
  }

  .link-icon {
    font-size: clamp(0.8rem, 2.2vw, 0.9rem);
    transition: transform 0.3s ease;
  }

  .dev-link:hover .link-icon {
    transform: scale(1.2);
  }

  /* 玩家设置区域 */
  .player-settings {
    margin: clamp(2rem, 6vw, 3rem) 0;
    padding: clamp(1.5rem, 4vw, 2rem);
    background: rgba(255, 255, 255, 0.08);
    border-radius: clamp(20px, 5vw, 30px);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  }

  .settings-header {
    text-align: center;
    margin-bottom: clamp(1.5rem, 4vw, 2rem);
  }

  .settings-title {
    font-size: clamp(1.3rem, 4vw, 1.6rem);
    font-weight: 700;
    margin: 0 0 clamp(0.5rem, 1.5vw, 0.8rem) 0;
    background: linear-gradient(135deg, #4ecdc4, #45b7d1);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .settings-underline {
    width: clamp(60px, 15vw, 100px);
    height: 3px;
    background: linear-gradient(90deg, #4ecdc4, #45b7d1);
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
    background: rgba(255, 255, 255, 0.05);
    border-radius: clamp(15px, 4vw, 20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.3s ease;
  }

  .setting-item:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .setting-label {
    display: flex;
    align-items: center;
    gap: clamp(0.5rem, 1.5vw, 0.8rem);
    font-size: clamp(1rem, 3vw, 1.1rem);
    font-weight: 600;
    color: #fff;
    cursor: pointer;
  }

  .label-icon {
    font-size: clamp(1.2rem, 3.5vw, 1.4rem);
  }

  .count-controls {
    display: flex;
    align-items: center;
    gap: clamp(0.8rem, 2vw, 1rem);
  }

  .count-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: clamp(40px, 10vw, 50px);
    height: clamp(40px, 10vw, 50px);
    background: linear-gradient(135deg, #ff6b6b, #ee5a52);
    border: none;
    border-radius: 50%;
    color: white;
    font-size: clamp(1.2rem, 3vw, 1.4rem);
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
  }

  .count-btn:hover:not(:disabled) {
    transform: translateY(-2px) scale(1.1);
    box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
  }

  .count-btn:active:not(:disabled) {
    transform: translateY(0) scale(1.05);
  }

  .count-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .count-display {
    display: flex;
    align-items: center;
    gap: clamp(0.3rem, 1vw, 0.5rem);
    padding: clamp(0.5rem, 1.5vw, 0.8rem) clamp(1rem, 3vw, 1.5rem);
    background: rgba(255, 255, 255, 0.1);
    border-radius: clamp(10px, 3vw, 15px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    min-width: clamp(80px, 20vw, 100px);
    justify-content: center;
  }

  .count-number {
    font-size: clamp(1.2rem, 3.5vw, 1.4rem);
    font-weight: 700;
    color: #4ecdc4;
  }

  .count-unit {
    font-size: clamp(0.9rem, 2.5vw, 1rem);
    color: rgba(255, 255, 255, 0.8);
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
    color: rgba(255, 255, 255, 0.9);
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
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: clamp(10px, 3vw, 15px);
    color: #fff;
    font-size: clamp(0.9rem, 2.5vw, 1rem);
    font-weight: 500;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
  }

  .name-input::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  .name-input:focus {
    outline: none;
    border-color: #4ecdc4;
    background: rgba(255, 255, 255, 0.15);
    box-shadow: 0 0 0 3px rgba(78, 205, 196, 0.2);
  }

  .name-input:hover {
    border-color: rgba(255, 255, 255, 0.3);
    background: rgba(255, 255, 255, 0.12);
  }

  .input-glow {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(78, 205, 196, 0.1), rgba(69, 183, 209, 0.1));
    border-radius: inherit;
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }

  .name-input:focus + .input-glow {
    opacity: 1;
  }

  /* 特性展示 */
  .intro-features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(280px, 85vw), 1fr));
    gap: clamp(1.5rem, 4vw, 2.5rem);
    margin-bottom: clamp(3rem, 8vw, 4rem);
  }

  .feature-item {
    position: relative;
    display: flex;
    align-items: center;
    gap: clamp(1rem, 3vw, 1.5rem);
    padding: clamp(1.5rem, 4vw, 2rem);
    background: rgba(255, 255, 255, 0.08);
    border-radius: clamp(15px, 4vw, 20px);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
  }

  .feature-item::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
    transition: left 0.6s ease;
  }

  .feature-item:hover {
    transform: translateY(-8px) scale(1.02);
    background: rgba(255, 255, 255, 0.12);
    box-shadow:
      0 20px 40px rgba(0, 0, 0, 0.3),
      0 0 0 1px rgba(255, 255, 255, 0.2);
  }

  .feature-item:hover::before {
    left: 100%;
  }

  .feature-icon-container {
    position: relative;
    min-width: clamp(50px, 12vw, 70px);
    height: clamp(50px, 12vw, 70px);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .feature-icon {
    font-size: clamp(2rem, 5vw, 2.5rem);
    position: relative;
    z-index: 2;
    animation: iconPulse 2s ease-in-out infinite;
  }

  .icon-glow {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 100%;
    height: 100%;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, transparent 70%);
    border-radius: 50%;
    animation: glowPulse 2s ease-in-out infinite;
  }

  .feature-text h3 {
    margin: 0 0 clamp(0.5rem, 1.5vw, 0.8rem) 0;
    font-size: clamp(1.1rem, 3.5vw, 1.3rem);
    font-weight: 700;
    color: #fff;
  }

  .feature-text p {
    margin: 0;
    opacity: 0.8;
    font-size: clamp(0.9rem, 2.5vw, 1rem);
    line-height: 1.4;
  }

  /* 操作区域 */
  .intro-actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: clamp(2rem, 5vw, 3rem);
  }

  .start-btn {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: clamp(1rem, 3vw, 1.5rem);
    padding: clamp(1.2rem, 4vw, 1.8rem) clamp(3rem, 8vw, 4rem);
    font-size: clamp(1.1rem, 3.5vw, 1.4rem);
    font-weight: 700;
    background: linear-gradient(135deg, #ff6b6b, #ee5a52, #ff4757);
    color: white;
    border: none;
    border-radius: clamp(30px, 10vw, 60px);
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
    min-height: clamp(50px, 12vw, 70px);
    min-width: clamp(200px, 60vw, 300px);
  }

  .btn-content {
    display: flex;
    align-items: center;
    gap: clamp(0.8rem, 2vw, 1rem);
    position: relative;
    z-index: 2;
  }

  .btn-glow {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, #ff6b6b, #ee5a52, #ff4757);
    filter: blur(20px);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .btn-particles {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at center, rgba(255, 255, 255, 0.3) 0%, transparent 70%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .start-btn:hover {
    transform: translateY(-5px) scale(1.05);
    box-shadow:
      0 20px 40px rgba(255, 107, 107, 0.4),
      0 0 0 1px rgba(255, 255, 255, 0.2);
  }

  .start-btn:hover .btn-glow {
    opacity: 0.6;
  }

  .start-btn:hover .btn-particles {
    opacity: 1;
  }

  .start-btn:active {
    transform: translateY(-2px) scale(1.02);
  }

  .btn-icon {
    font-size: clamp(1.5rem, 4vw, 1.8rem);
    animation: rocketBounce 2s ease-in-out infinite;
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
    gap: clamp(0.5rem, 1.5vw, 0.8rem);
    font-size: clamp(0.8rem, 2.5vw, 0.9rem);
  }

  .info-icon {
    font-size: clamp(0.9rem, 2.5vw, 1rem);
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
    font-size: clamp(1.5rem, 4vw, 2rem);
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

  @keyframes iconPulse {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
  }

  @keyframes glowPulse {
    0%,
    100% {
      opacity: 0.3;
      transform: translate(-50%, -50%) scale(1);
    }
    50% {
      opacity: 0.6;
      transform: translate(-50%, -50%) scale(1.2);
    }
  }

  @keyframes rocketBounce {
    0%,
    100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-3px);
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

    .intro-features {
      gap: 0.8rem;
    }

    .feature-item {
      padding: 0.8rem;
      gap: 0.5rem;
    }

    .feature-icon-container {
      width: clamp(40px, 10vw, 50px);
      height: clamp(40px, 10vw, 50px);
    }

    .feature-icon {
      font-size: clamp(1.2rem, 3vw, 1.5rem);
    }

    .feature-text h3 {
      font-size: clamp(0.9rem, 2.5vw, 1rem);
      margin-bottom: 0.2rem;
    }

    .feature-text p {
      font-size: clamp(0.7rem, 2vw, 0.8rem);
      line-height: 1.3;
    }

    .intro-actions {
      gap: 1rem;
    }

    .start-btn {
      padding: clamp(0.8rem, 3vw, 1rem) clamp(1.5rem, 5vw, 2rem);
      border-radius: 12px;
      min-height: clamp(48px, 12vw, 56px);
    }

    .btn-content {
      gap: 0.5rem;
    }

    .btn-icon {
      font-size: clamp(1.2rem, 3.5vw, 1.5rem);
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

    .intro-features {
      gap: 0.6rem;
    }

    .feature-item {
      padding: 0.6rem;
      gap: 0.4rem;
    }

    .feature-icon-container {
      width: clamp(35px, 9vw, 40px);
      height: clamp(35px, 9vw, 40px);
    }

    .feature-icon {
      font-size: clamp(1rem, 2.5vw, 1.2rem);
    }

    .feature-text h3 {
      font-size: clamp(0.8rem, 2.2vw, 0.9rem);
      margin-bottom: 0.15rem;
    }

    .feature-text p {
      font-size: clamp(0.65rem, 1.8vw, 0.7rem);
    }

    .start-btn {
      padding: clamp(0.7rem, 2.5vw, 0.8rem) clamp(1.2rem, 4vw, 1.5rem);
      min-height: clamp(44px, 11vw, 48px);
    }

    .btn-icon {
      font-size: clamp(1rem, 3vw, 1.2rem);
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

    .btn-icon {
      font-size: clamp(0.9rem, 2.5vw, 1rem);
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

    .intro-features {
      gap: 0.6rem;
    }

    .feature-item {
      padding: 0.6rem;
      gap: 0.4rem;
    }

    .feature-icon-container {
      width: clamp(35px, 9vw, 40px);
      height: clamp(35px, 9vw, 40px);
    }

    .feature-icon {
      font-size: clamp(1rem, 2.5vw, 1.2rem);
    }

    .feature-text h3 {
      font-size: clamp(0.8rem, 2.2vw, 0.9rem);
      margin-bottom: 0.15rem;
    }

    .feature-text p {
      font-size: clamp(0.65rem, 1.8vw, 0.7rem);
    }

    .start-btn {
      padding: clamp(0.7rem, 2.5vw, 0.8rem) clamp(1.2rem, 4vw, 1.5rem);
      min-height: clamp(44px, 11vw, 48px);
    }

    .btn-icon {
      font-size: clamp(1rem, 3vw, 1.2rem);
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
</style>
