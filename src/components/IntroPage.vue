<script setup lang="ts">
  import { ref, onMounted, onUnmounted } from 'vue'

  interface Emits {
    (e: 'start'): void
  }

  const emit = defineEmits<Emits>()

  const startGame = () => {
    emit('start')
  }

  // 粒子系统
  const particles = ref<
    Array<{ x: number; y: number; vx: number; vy: number; size: number; opacity: number }>
  >([])
  const animationId = ref<number>()

  onMounted(() => {
    initParticles()
    animateParticles()
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

  const getParticleStyle = (particle: any) => {
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

  /* 响应式设计 */
  @media (max-width: 768px) {
    .intro-features {
      grid-template-columns: 1fr;
      gap: clamp(1rem, 3vw, 1.5rem);
    }

    .feature-item {
      padding: clamp(1rem, 3vw, 1.5rem);
    }

    .start-btn {
      width: 100%;
      max-width: min(350px, 90vw);
    }

    .dev-card {
      flex-direction: column;
      text-align: center;
    }

    .dev-details {
      align-items: center;
    }
  }

  @media (max-width: 480px) {
    .title-decoration {
      flex-direction: column;
      gap: clamp(0.5rem, 2vw, 1rem);
    }

    .decoration-line {
      width: clamp(60px, 30vw, 100px);
    }

    .game-info {
      flex-direction: column;
      align-items: center;
    }
  }
</style>
