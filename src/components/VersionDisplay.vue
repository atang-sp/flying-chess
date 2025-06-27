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
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 16px;
    font-weight: bold;
    font-family: 'Courier New', monospace;
    z-index: 1000;
    display: flex;
    align-items: center;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
    border: 2px solid rgba(255, 255, 255, 0.2);
    transition: all 0.3s ease;
  }

  .version-display:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
  }

  .version-text {
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    letter-spacing: 0.5px;
  }

  .dev-mode {
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% {
      box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
    }
    50% {
      box-shadow: 0 4px 15px rgba(255, 107, 107, 0.8);
    }
    100% {
      box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
    }
  }
</style>
