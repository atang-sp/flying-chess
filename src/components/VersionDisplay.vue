<script setup lang="ts">
  import { computed } from 'vue'
  import { getVersionInfo } from '../config/version'

  const versionInfo = getVersionInfo()

  const version = computed(() => versionInfo.version)
  const isDev = computed(() => versionInfo.isDev)

  // 处理版本号显示，去掉 -dev 后缀
  const displayVersion = computed(() => {
    const v = version.value
    return v.endsWith('-dev') ? v.slice(0, -4) : v
  })
</script>

<template>
  <div class="version-display" :class="{ 'dev-mode': isDev }">
    <span class="version-text">v{{ displayVersion }}</span>
  </div>
</template>

<style scoped>
  .version-display {
    position: fixed;
    top: 16px;
    right: 16px;
    background: var(--bg-glass);
    color: var(--text-primary);
    padding: 8px 16px;
    border-radius: var(--radius-full);
    font-size: 16px;
    font-weight: bold;
    font-family: 'Courier New', monospace;
    z-index: 1000;
    display: flex;
    align-items: center;
    box-shadow: var(--glass-shadow);
    backdrop-filter: blur(var(--glass-blur));
    border: var(--glass-border);
    transition: all var(--transition-normal);
  }

  .version-display:hover {
    transform: translateY(-2px);
    background: var(--bg-glass-hover);
    box-shadow: var(--glass-shadow-lg);
    border-color: rgba(102, 126, 234, 0.3);
  }

  .version-text {
    color: var(--color-accent-light);
    letter-spacing: 0.5px;
  }

  .dev-mode {
    border-color: rgba(255, 107, 107, 0.4);
    animation: pulse 2s infinite;
  }

  .dev-mode .version-text {
    color: var(--player-1);
  }

  @keyframes pulse {
    0% {
      box-shadow: var(--glow-sm) rgba(255, 107, 107, 0.4);
    }
    50% {
      box-shadow: var(--glow-md) rgba(255, 107, 107, 0.6);
    }
    100% {
      box-shadow: var(--glow-sm) rgba(255, 107, 107, 0.4);
    }
  }
</style>
