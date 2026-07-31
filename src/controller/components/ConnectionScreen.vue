<script setup lang="ts">
import { ref } from 'vue'
import type { ConnectionStatus } from '../../types/network'

defineProps<{
  status: ConnectionStatus
  error: string | null
  roomId: string
}>()

const emit = defineEmits<{
  connect: [roomId: string]
}>()

const inputRoomId = ref('')

function handleConnect(): void {
  const id = inputRoomId.value.trim().toUpperCase()
  if (id.length >= 4) {
    emit('connect', id)
  }
}
</script>

<template>
  <div class="connection-screen">
    <div class="connection-card">
      <div class="logo-area">
        <span class="logo-icon">🎮</span>
        <h1>飞行棋手柄</h1>
      </div>

      <template v-if="status === 'disconnected'">
        <p class="hint">输入房间码加入游戏</p>
        <form class="room-form" @submit.prevent="handleConnect">
          <input
            v-model="inputRoomId"
            type="text"
            class="room-input"
            placeholder="房间码"
            maxlength="8"
            autocomplete="off"
            autofocus
          />
          <button type="submit" class="btn btn-primary connect-btn" :disabled="inputRoomId.trim().length < 4">
            加入
          </button>
        </form>
        <p v-if="error" class="error-text">{{ error }}</p>
      </template>

      <template v-else-if="status === 'connecting'">
        <div class="connecting-indicator">
          <div class="spinner" />
          <p>正在连接到房间 {{ roomId }}...</p>
        </div>
      </template>

      <template v-else-if="status === 'connected'">
        <div class="connecting-indicator">
          <div class="spinner" />
          <p>已连接，等待分配玩家...</p>
        </div>
      </template>

      <template v-else-if="status === 'reconnecting'">
        <div class="connecting-indicator">
          <div class="spinner" />
          <p>连接中断，正在重连...</p>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.connection-screen {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.connection-card {
  width: 100%;
  max-width: 360px;
  text-align: center;
}

.logo-area {
  margin-bottom: 2rem;
}

.logo-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 0.5rem;
}

.logo-area h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: var(--color-heading, #f0ece4);
}

.hint {
  color: var(--color-text-muted, #8a8780);
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
}

.room-form {
  display: flex;
  gap: 0.75rem;
}

.room-input {
  flex: 1;
  padding: 0.75rem 1rem;
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-align: center;
  text-transform: uppercase;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--radius-md, 8px);
  color: var(--color-text, #e8e6e3);
  outline: none;
  transition: border-color 0.2s;
}

.room-input:focus {
  border-color: var(--color-accent, #e1c27f);
}

.connect-btn {
  flex-shrink: 0;
  padding: 0.75rem 1.25rem;
}

.error-text {
  color: #ef4444;
  margin-top: 1rem;
  font-size: 0.9rem;
}

.connecting-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.connecting-indicator p {
  color: var(--color-text-muted, #8a8780);
  font-size: 0.95rem;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--color-accent, #e1c27f);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
