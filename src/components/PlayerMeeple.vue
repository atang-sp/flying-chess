<script setup lang="ts">
  import kenneyPawnUrl from '../assets/kenney/pawn.svg?url'

  interface Props {
    color: string
    number: number
    name?: string
    size?: 'small' | 'medium' | 'large'
  }

  withDefaults(defineProps<Props>(), {
    name: '',
    size: 'medium',
  })
</script>

<template>
  <span
    class="player-meeple"
    :class="`is-${size}`"
    :style="{ '--player-color': color, '--pawn-mask': `url(${kenneyPawnUrl})` }"
    :aria-label="name ? `${name}，玩家 ${number}` : `玩家 ${number}`"
    role="img"
  >
    <span class="meeple-shape" aria-hidden="true"></span>
    <span class="meeple-number" aria-hidden="true">{{ number }}</span>
  </span>
</template>

<style scoped>
  .player-meeple {
    --meeple-size: 34px;
    position: relative;
    width: var(--meeple-size);
    height: var(--meeple-size);
    flex: 0 0 var(--meeple-size);
    display: inline-grid;
    place-items: center;
    filter: drop-shadow(0 5px 6px rgba(0, 0, 0, 0.45)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
    isolation: isolate;
    transition: transform 0.2s ease;
  }

  .player-meeple.is-small {
    --meeple-size: 27px;
  }

  .player-meeple.is-large {
    --meeple-size: 48px;
  }

  .meeple-shape {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 35% 25%, rgba(255, 255, 255, 0.45) 0%, transparent 42%),
      linear-gradient(
        180deg,
        var(--player-color) 0%,
        color-mix(in srgb, var(--player-color) 72%, #000) 100%
      );
    border-radius: 4px;
    -webkit-mask: var(--pawn-mask) center / contain no-repeat;
    mask: var(--pawn-mask) center / contain no-repeat;
  }

  .meeple-shape::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.5) 0%,
      rgba(255, 255, 255, 0.1) 35%,
      transparent 55%,
      rgba(0, 0, 0, 0.35) 100%
    );
    -webkit-mask: var(--pawn-mask) center / contain no-repeat;
    mask: var(--pawn-mask) center / contain no-repeat;
  }

  .meeple-number {
    position: relative;
    z-index: 1;
    display: grid;
    place-items: center;
    width: 1.3em;
    height: 1.3em;
    border: 1.5px solid rgba(255, 235, 185, 0.9);
    border-radius: 50%;
    color: #fffaf0;
    background: radial-gradient(circle at 35% 30%, #20352c 0%, #081410 100%);
    box-shadow:
      0 2px 4px rgba(0, 0, 0, 0.55),
      inset 0 1px 1px rgba(255, 255, 255, 0.3);
    font-size: calc(var(--meeple-size) * 0.28);
    font-weight: 800;
    line-height: 1;
  }
</style>
