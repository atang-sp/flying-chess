<script setup lang="ts">
  import { computed } from 'vue'

  const particles = computed(() => {
    const items = []
    for (let i = 0; i < 25; i++) {
      items.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 1 + Math.random() * 2.5,
        duration: 6 + Math.random() * 10,
        delay: Math.random() * -16,
        opacity: 0.2 + Math.random() * 0.4,
      })
    }
    return items
  })
</script>

<template>
  <div class="particles-layer" aria-hidden="true">
    <div
      v-for="p in particles"
      :key="p.id"
      class="particle"
      :style="{
        left: p.x + '%',
        top: p.y + '%',
        width: p.size + 'px',
        height: p.size + 'px',
        opacity: p.opacity,
        animationDuration: p.duration + 's',
        animationDelay: p.delay + 's',
      }"
    ></div>
  </div>
</template>

<style scoped>
  .particles-layer {
    position: absolute;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
  }

  .particle {
    position: absolute;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(139, 156, 247, 0.9), rgba(102, 126, 234, 0.3));
    animation: particleFloat linear infinite;
    will-change: transform, opacity;
  }

  @keyframes particleFloat {
    0% {
      transform: translateY(0) translateX(0) scale(1);
      opacity: var(--particle-opacity, 0.3);
    }
    25% {
      transform: translateY(-20px) translateX(10px) scale(1.2);
      opacity: calc(var(--particle-opacity, 0.3) * 1.5);
    }
    50% {
      transform: translateY(-35px) translateX(-5px) scale(0.8);
      opacity: var(--particle-opacity, 0.3);
    }
    75% {
      transform: translateY(-15px) translateX(-12px) scale(1.1);
      opacity: calc(var(--particle-opacity, 0.3) * 0.7);
    }
    100% {
      transform: translateY(0) translateX(0) scale(1);
      opacity: var(--particle-opacity, 0.3);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .particle {
      animation: none !important;
      opacity: 0.15 !important;
    }
  }
</style>
