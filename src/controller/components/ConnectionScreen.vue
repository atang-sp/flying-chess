<script setup lang="ts">
  import { ref } from 'vue'
  import type { ConnectionStatus } from '../../types/network'

  defineProps<{
    status: ConnectionStatus
    error: string | null
    pairingAnswer: string
  }>()

  const emit = defineEmits<{
    connect: [pairingOffer: string]
  }>()

  const pairingOffer = ref('')

  function handleConnect(): void {
    const offer = pairingOffer.value.trim()
    if (offer) emit('connect', offer)
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
        <p class="hint">同一 WiFi 下，将主屏的“局域网配对邀请”粘贴到这里。</p>
        <form class="room-form" @submit.prevent="handleConnect">
          <textarea
            v-model="pairingOffer"
            class="pairing-textarea"
            placeholder="粘贴主屏配对邀请 JSON"
            autocomplete="off"
            autofocus
            data-testid="lan-pairing-offer-input"
          />
          <button
            type="submit"
            class="btn btn-primary connect-btn"
            :disabled="!pairingOffer.trim()"
          >
            生成配对应答
          </button>
        </form>
        <p v-if="error" class="error-text">{{ error }}</p>
      </template>

      <template v-else-if="status === 'connecting'">
        <div class="connecting-indicator">
          <template v-if="pairingAnswer">
            <p>把下面的配对应答复制回主屏；数据连接将直接在局域网内建立。</p>
            <textarea
              class="pairing-textarea"
              :value="pairingAnswer"
              readonly
              data-testid="lan-pairing-answer"
            />
          </template>
          <template v-else>
            <div class="spinner" />
            <p>正在收集本机局域网连接信息...</p>
          </template>
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
    flex-direction: column;
    gap: 0.75rem;
  }

  .pairing-textarea {
    width: 100%;
    min-height: 132px;
    box-sizing: border-box;
    padding: 0.75rem 1rem;
    font:
      0.75rem/1.35 ui-monospace,
      SFMono-Regular,
      Menlo,
      monospace;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: var(--radius-md, 8px);
    color: var(--color-text, #e8e6e3);
    outline: none;
    transition: border-color 0.2s;
  }

  .pairing-textarea:focus {
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
    to {
      transform: rotate(360deg);
    }
  }
</style>
