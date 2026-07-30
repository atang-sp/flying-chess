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
    filter: drop-shadow(0 4px 4px rgb(0 0 0 / 0.4));
    isolation: isolate;
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
    background: var(--player-color);
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
      rgb(255 255 255 / 0.38),
      transparent 48%,
      rgb(0 0 0 / 0.22)
    );
    -webkit-mask: var(--pawn-mask) center / contain no-repeat;
    mask: var(--pawn-mask) center / contain no-repeat;
  }

  .meeple-number {
    position: relative;
    z-index: 1;
    display: grid;
    place-items: center;
    width: 1.25em;
    height: 1.25em;
    border: 1px solid rgb(255 255 255 / 0.82);
    border-radius: 50%;
    color: #fff;
    background: rgb(11 21 18 / 0.76);
    box-shadow: 0 1px 3px rgb(0 0 0 / 0.42);
    font-size: calc(var(--meeple-size) * 0.29);
    font-weight: 900;
    line-height: 1;
  }
</style>
