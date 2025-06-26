<template>
  <div class="version-display" :class="{ 'dev-mode': isDev }">
    <span class="version-text">v{{ version }}</span>
    <span v-if="isDev" class="dev-badge">dev</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { getVersionInfo } from '../config/version';

const versionInfo = getVersionInfo();

const version = computed(() => versionInfo.version);
const isDev = computed(() => versionInfo.isDev);
</script>

<style scoped>
.version-display {
  position: fixed;
  bottom: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-family: 'Courier New', monospace;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 4px;
  backdrop-filter: blur(4px);
}

.version-text {
  opacity: 0.8;
}

.dev-badge {
  background: #ff6b6b;
  color: white;
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: bold;
  text-transform: uppercase;
}

.dev-mode {
  background: rgba(255, 107, 107, 0.2);
  border: 1px solid rgba(255, 107, 107, 0.3);
}
</style> 