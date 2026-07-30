<script setup lang="ts">
  import { Snowflake, Flame, Heart, Users } from '@lucide/vue'
  import { GAME_CONFIG } from '../config/gameConfig'
  import type { PartyScenePreset } from '../types/game'

  interface Props {
    selected?: PartyScenePreset | 'default'
  }

  interface Emits {
    (e: 'select', preset: PartyScenePreset | 'default'): void
  }

  withDefaults(defineProps<Props>(), {
    selected: 'default',
  })
  const emit = defineEmits<Emits>()

  const presets = GAME_CONFIG.PARTY_SCENE_PRESETS

  const iconMap: Record<string, typeof Snowflake> = {
    icebreaker: Snowflake,
    hardcore: Flame,
    intimate: Heart,
    group_fun: Users,
  }
</script>

<template>
  <div class="scene-selector">
    <h3 class="scene-title">选择场景</h3>
    <p class="scene-subtitle">每个场景为升温局提供不同的内容组合和节奏</p>

    <div class="scene-grid">
      <button
        class="scene-card scene-default"
        :class="{ 'scene-card--selected': selected === 'default' }"
        @click="emit('select', 'default')"
      >
        <div class="scene-card-icon">
          <Flame :size="32" />
        </div>
        <div class="scene-card-body">
          <h4>默认升温</h4>
          <p>标准升温局配置</p>
        </div>
      </button>

      <button
        v-for="(config, key) in presets"
        :key="key"
        class="scene-card"
        :class="[`scene-${key}`, { 'scene-card--selected': selected === key }]"
        @click="emit('select', key as PartyScenePreset)"
      >
        <div class="scene-card-icon">
          <component :is="iconMap[key as string] || Flame" :size="32" />
        </div>
        <div class="scene-card-body">
          <h4>{{ config.name }}</h4>
          <p>{{ config.description }}</p>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
  .scene-selector {
    padding: 1rem 0;
  }

  .scene-title {
    color: var(--text-primary);
    font-size: 1.3rem;
    margin: 0 0 0.5rem 0;
    text-align: center;
  }

  .scene-subtitle {
    color: var(--text-muted);
    font-size: 0.9rem;
    margin: 0 0 1.5rem 0;
    text-align: center;
  }

  .scene-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .scene-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 16px 12px;
    border-radius: var(--radius-md);
    border: 2px solid rgba(255, 255, 255, 0.1);
    background: var(--bg-glass);
    backdrop-filter: blur(var(--glass-blur));
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: center;
    color: var(--text-primary);
  }

  .scene-card:hover {
    transform: translateY(-2px);
    border-color: rgba(255, 255, 255, 0.3);
  }

  .scene-card--selected {
    border-color: rgba(255, 255, 255, 0.55);
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.08);
  }

  .scene-card-icon {
    opacity: 0.8;
  }

  .scene-card-body h4 {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
  }

  .scene-card-body p {
    margin: 4px 0 0;
    font-size: 0.8rem;
    color: var(--text-muted);
    line-height: 1.3;
  }

  .scene-default {
    border-color: rgba(245, 158, 11, 0.3);
  }

  .scene-default:hover {
    border-color: rgba(245, 158, 11, 0.6);
    box-shadow: 0 4px 15px rgba(245, 158, 11, 0.2);
  }

  .scene-default .scene-card-icon {
    color: #f59e0b;
  }

  .scene-icebreaker {
    border-color: rgba(59, 130, 246, 0.3);
  }

  .scene-icebreaker:hover {
    border-color: rgba(59, 130, 246, 0.6);
    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.2);
  }

  .scene-icebreaker .scene-card-icon {
    color: #3b82f6;
  }

  .scene-hardcore {
    border-color: rgba(220, 38, 38, 0.3);
  }

  .scene-hardcore:hover {
    border-color: rgba(220, 38, 38, 0.6);
    box-shadow: 0 4px 15px rgba(220, 38, 38, 0.2);
  }

  .scene-hardcore .scene-card-icon {
    color: #dc2626;
  }

  .scene-intimate {
    border-color: rgba(236, 72, 153, 0.3);
  }

  .scene-intimate:hover {
    border-color: rgba(236, 72, 153, 0.6);
    box-shadow: 0 4px 15px rgba(236, 72, 153, 0.2);
  }

  .scene-intimate .scene-card-icon {
    color: #ec4899;
  }

  .scene-group_fun {
    border-color: rgba(34, 197, 94, 0.3);
  }

  .scene-group_fun:hover {
    border-color: rgba(34, 197, 94, 0.6);
    box-shadow: 0 4px 15px rgba(34, 197, 94, 0.2);
  }

  .scene-group_fun .scene-card-icon {
    color: #22c55e;
  }

  @media (max-width: 480px) {
    .scene-grid {
      grid-template-columns: 1fr;
    }

    .scene-card {
      flex-direction: row;
      text-align: left;
      padding: 14px;
    }

    .scene-card-body h4 {
      font-size: 0.95rem;
    }
  }
</style>
