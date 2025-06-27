<script setup lang="ts">
  import { ref } from 'vue'

  interface Emits {
    (e: 'start'): void
  }

  const emit = defineEmits<Emits>()

  const startGame = () => {
    emit('start')
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
</script>

<template>
  <div class="intro-page">
    <div class="intro-content">
      <div class="intro-header">
        <h1 class="game-title">🎲 惩罚飞行棋</h1>
        <div class="title-decoration">
          <span class="decoration-line"></span>
          <span class="decoration-star">⭐</span>
          <span class="decoration-line"></span>
        </div>
        <p class="game-subtitle">环形棋盘 · 自定义惩罚 · 刺激体验</p>
        <p class="developer-info">
          开发者：阿汤
          <span class="dev-id">@sp_with_py</span>
        </p>
      </div>

      <div class="intro-features">
        <div class="feature-item">
          <div class="feature-icon">🎯</div>
          <div class="feature-text">
            <h3>环形棋盘</h3>
            <p>独特的环形设计，40格精美布局</p>
          </div>
        </div>

        <div class="feature-item">
          <div class="feature-icon">⚡</div>
          <div class="feature-text">
            <h3>惩罚小游戏</h3>
            <p>自定义工具、部位、姿势和次数</p>
          </div>
        </div>

        <div class="feature-item">
          <div class="feature-icon">🎨</div>
          <div class="feature-text">
            <h3>精美动画</h3>
            <p>立体骰子和流畅移动效果</p>
          </div>
        </div>

        <div class="feature-item">
          <div class="feature-icon">⚙️</div>
          <div class="feature-text">
            <h3>灵活设置</h3>
            <p>支持比例调节和个性化配置</p>
          </div>
        </div>
      </div>

      <div class="intro-actions">
        <button class="start-btn" @click="startGame">
          <span class="btn-icon">🚀</span>
          <span class="btn-text">开始游戏</span>
        </button>

        <div class="game-info">
          <p>游戏时长：约10-20分钟</p>
          <p>适合年龄：18岁以上</p>
        </div>
      </div>
    </div>

    <!-- 背景装饰 -->
    <div class="background-decoration">
      <div v-for="i in 6" :key="i" class="floating-dice" :style="getDiceStyle(i)">🎲</div>
      <div v-for="i in 8" :key="i" class="floating-star" :style="getStarStyle(i)">⭐</div>
    </div>
  </div>
</template>

<style scoped>
  .intro-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
  }

  .intro-content {
    text-align: center;
    color: white;
    z-index: 10;
    max-width: min(800px, 90vw);
    padding: clamp(1rem, 4vw, 2rem);
  }

  .intro-header {
    margin-bottom: clamp(2rem, 6vw, 3rem);
  }

  .game-title {
    font-size: clamp(2rem, 8vw, 4rem);
    font-weight: bold;
    margin: 0 0 clamp(0.5rem, 2vw, 1rem) 0;
    text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.3);
    animation: titleGlow 2s ease-in-out infinite alternate;
  }

  .title-decoration {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: clamp(0.5rem, 2vw, 1rem);
    margin-bottom: clamp(0.5rem, 2vw, 1rem);
  }

  .decoration-line {
    width: clamp(60px, 15vw, 100px);
    height: 2px;
    background: linear-gradient(90deg, transparent, white, transparent);
  }

  .decoration-star {
    font-size: clamp(1rem, 3vw, 1.5rem);
    animation: starTwinkle 1.5s ease-in-out infinite;
  }

  .game-subtitle {
    font-size: clamp(1rem, 3vw, 1.3rem);
    margin: 0;
    opacity: 0.9;
    font-weight: 300;
  }

  .developer-info {
    font-size: clamp(0.8rem, 2vw, 0.9rem);
    opacity: 0.7;
    margin: clamp(0.25rem, 1vw, 0.5rem) 0 0 0;
  }

  .dev-id {
    font-weight: bold;
  }

  .intro-features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(250px, 80vw), 1fr));
    gap: clamp(1rem, 3vw, 2rem);
    margin-bottom: clamp(2rem, 6vw, 3rem);
  }

  .feature-item {
    display: flex;
    align-items: center;
    gap: clamp(0.8rem, 2vw, 1rem);
    padding: clamp(1rem, 3vw, 1.5rem);
    background: rgba(255, 255, 255, 0.1);
    border-radius: clamp(8px, 2vw, 12px);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    transition: all 0.3s ease;
  }

  .feature-item:hover {
    transform: translateY(-5px);
    background: rgba(255, 255, 255, 0.2);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
  }

  .feature-icon {
    font-size: clamp(1.8rem, 5vw, 2.5rem);
    min-width: clamp(40px, 10vw, 60px);
  }

  .feature-text h3 {
    margin: 0 0 clamp(0.25rem, 1vw, 0.5rem) 0;
    font-size: clamp(1rem, 3vw, 1.2rem);
    font-weight: bold;
  }

  .feature-text p {
    margin: 0;
    opacity: 0.8;
    font-size: clamp(0.8rem, 2.5vw, 0.9rem);
  }

  .intro-actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: clamp(1.5rem, 4vw, 2rem);
  }

  .start-btn {
    display: flex;
    align-items: center;
    gap: clamp(0.8rem, 2vw, 1rem);
    padding: clamp(1rem, 3vw, 1.5rem) clamp(2rem, 6vw, 3rem);
    font-size: clamp(1rem, 3vw, 1.3rem);
    font-weight: bold;
    background: linear-gradient(135deg, #ff6b6b, #ee5a52);
    color: white;
    border: none;
    border-radius: clamp(25px, 8vw, 50px);
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 8px 25px rgba(255, 107, 107, 0.3);
    min-height: clamp(44px, 10vw, 60px);
  }

  .start-btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 35px rgba(255, 107, 107, 0.4);
    background: linear-gradient(135deg, #ff4757, #ff3742);
  }

  .start-btn:active {
    transform: translateY(-1px);
  }

  .btn-icon {
    font-size: clamp(1.3rem, 3.5vw, 1.5rem);
  }

  .game-info {
    opacity: 0.7;
    font-size: clamp(0.8rem, 2.5vw, 0.9rem);
  }

  .game-info p {
    margin: clamp(0.15rem, 0.5vw, 0.25rem) 0;
  }

  .background-decoration {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .floating-dice,
  .floating-star {
    position: absolute;
    font-size: clamp(1.5rem, 4vw, 2rem);
    animation: float 6s ease-in-out infinite;
    opacity: 0.3;
  }

  .floating-dice {
    animation: floatDice 8s ease-in-out infinite;
  }

  .floating-star {
    animation: floatStar 10s ease-in-out infinite;
  }

  @keyframes titleGlow {
    0% {
      text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.3);
    }
    100% {
      text-shadow:
        3px 3px 6px rgba(0, 0, 0, 0.3),
        0 0 20px rgba(255, 255, 255, 0.5);
    }
  }

  @keyframes starTwinkle {
    0%,
    100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.7;
      transform: scale(1.1);
    }
  }

  @keyframes floatDice {
    0%,
    100% {
      transform: translateY(0px) rotate(0deg);
    }
    50% {
      transform: translateY(-20px) rotate(180deg);
    }
  }

  @keyframes floatStar {
    0%,
    100% {
      transform: translateY(0px) scale(1);
    }
    50% {
      transform: translateY(-15px) scale(1.2);
    }
  }

  @keyframes float {
    0%,
    100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-10px);
    }
  }

  /* 自适应布局 - 移除固定断点，使用相对单位 */
  @media (max-width: 1023px) {
    .intro-features {
      grid-template-columns: 1fr;
      gap: clamp(0.8rem, 2.5vw, 1rem);
    }

    .feature-item {
      padding: clamp(0.8rem, 2.5vw, 1rem);
    }

    .start-btn {
      width: 100%;
      max-width: min(300px, 80vw);
      justify-content: center;
    }
  }
</style>
