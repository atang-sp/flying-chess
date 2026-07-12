<script setup lang="ts">
  import { computed } from 'vue'

  export interface DonutSegment {
    name: string
    value: number
    color: string
  }

  interface Props {
    segments: DonutSegment[]
    size?: number
    strokeWidth?: number
    label?: string
  }

  const props = withDefaults(defineProps<Props>(), {
    size: 64,
    strokeWidth: 8,
    label: '',
  })

  const radius = computed(() => (props.size - props.strokeWidth) / 2)
  const circumference = computed(() => 2 * Math.PI * radius.value)
  const center = computed(() => props.size / 2)

  const total = computed(() => props.segments.reduce((sum, s) => sum + s.value, 0))

  const arcs = computed(() => {
    if (total.value === 0) return []

    let offset = 0
    return props.segments.map(seg => {
      const fraction = seg.value / total.value
      const dashLength = fraction * circumference.value
      const arc = {
        color: seg.color,
        dasharray: `${dashLength} ${circumference.value - dashLength}`,
        dashoffset: -offset,
      }
      offset += dashLength
      return arc
    })
  })
</script>

<template>
  <svg
    :width="size"
    :height="size"
    :viewBox="`0 0 ${size} ${size}`"
    class="mini-donut"
  >
    <circle
      :cx="center"
      :cy="center"
      :r="radius"
      fill="none"
      stroke="rgba(255,255,255,0.08)"
      :stroke-width="strokeWidth"
    />
    <circle
      v-for="(arc, i) in arcs"
      :key="i"
      :cx="center"
      :cy="center"
      :r="radius"
      fill="none"
      :stroke="arc.color"
      :stroke-width="strokeWidth"
      :stroke-dasharray="arc.dasharray"
      :stroke-dashoffset="arc.dashoffset"
      stroke-linecap="butt"
      class="donut-arc"
      :transform="`rotate(-90 ${center} ${center})`"
    />
    <text
      v-if="label"
      :x="center"
      :y="center"
      text-anchor="middle"
      dominant-baseline="central"
      class="donut-label"
    >
      {{ label }}
    </text>
  </svg>
</template>

<style scoped>
  .mini-donut {
    display: block;
    flex-shrink: 0;
  }

  .donut-arc {
    transition:
      stroke-dasharray 0.4s ease,
      stroke-dashoffset 0.4s ease;
  }

  .donut-label {
    fill: var(--text-secondary);
    font-size: 0.65rem;
    font-weight: 600;
    pointer-events: none;
  }
</style>
