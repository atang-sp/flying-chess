<script setup lang="ts">
  import type { ConnectionStatus } from '../../types/network'

  defineProps<{
    status: ConnectionStatus
  }>()

  const statusColorMap: Record<ConnectionStatus, string> = {
    connected: '#34d399',
    connecting: '#fbbf24',
    reconnecting: '#f97316',
    disconnected: '#ef4444',
  }
</script>

<template>
  <div class="connection-status">
    <span class="status-dot" :style="{ background: statusColorMap[status] }" />
    <span class="status-label">{{ $t(`ctrl_status_${status}`) }}</span>
  </div>
</template>

<style scoped>
  .connection-status {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.75rem;
    color: var(--color-text-muted, #8a8780);
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .connection-status:has(.status-dot[style*='34d399']) .status-dot {
    animation: status-pulse 2s ease-in-out infinite;
  }

  @keyframes status-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
</style>
