<script setup lang="ts">
  import { computed } from 'vue'
  import { Coffee } from '@lucide/vue'
  import { SPONSOR_CONFIG } from '../config/sponsorConfig'

  const props = defineProps<{ inline?: boolean }>()

  const isEnabled = computed(() => SPONSOR_CONFIG.enabled)
  const link = computed(() => SPONSOR_CONFIG.stripePaymentLink)

  const handleClick = () => {
    if (link.value) {
      window.open(link.value, '_blank', 'noopener,noreferrer')
    }
  }
</script>

<template>
  <button
    v-if="isEnabled"
    class="sponsor-btn"
    :class="{ 'is-inline': props.inline }"
    title="赞助开发者"
    @click="handleClick"
  >
    <Coffee :size="18" class="sponsor-icon" />
    <span class="sponsor-text">支持作者</span>
  </button>
</template>

<style scoped>
  .sponsor-btn {
    position: fixed;
    bottom: 16px;
    right: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%);
    color: #333;
    border: none;
    border-radius: var(--radius-full);
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(255, 154, 158, 0.4);
    transition: all var(--transition-normal);
    z-index: 1000;
  }

  .sponsor-btn.is-inline {
    position: static;
    box-shadow: none;
    background: rgba(255, 154, 158, 0.1);
    border: 1px solid rgba(255, 154, 158, 0.4);
    color: #fff;
    border-radius: 8px;
    padding: 10px 20px;
  }
  .sponsor-btn.is-inline .sponsor-text {
    display: inline;
  }
  .sponsor-btn.is-inline:hover {
    background: rgba(255, 154, 158, 0.2);
    transform: none;
    box-shadow: none;
  }

  .sponsor-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(255, 154, 158, 0.6);
    filter: brightness(1.05);
  }

  .sponsor-icon {
    color: #c94b4b;
  }

  @media (max-width: 480px) {
    .sponsor-btn:not(.is-inline) .sponsor-text {
      display: none;
    }
    .sponsor-btn:not(.is-inline) {
      padding: 8px;
      border-radius: 50%;
    }
  }
</style>
