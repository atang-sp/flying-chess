<script setup lang="ts">
  import { computed } from 'vue'

  import { Award, Lock, Trophy } from '@lucide/vue'
  import {
    getLocalAchievements,
    getShameWall,
    getUnlockedPartyContent,
    type LocalProgress,
  } from '../services/localProgress'

  const props = defineProps<{ progress: LocalProgress }>()
  const achievements = computed(() => getLocalAchievements(props.progress))
  const shameWall = computed(() => getShameWall(props.progress).slice(0, 5))
  const unlocked = computed(() => getUnlockedPartyContent(props.progress))
  const unlockedAchievementCount = computed(
    () => achievements.value.filter(item => item.unlocked).length
  )
</script>

<template>
  <details class="progress-panel">
    <summary>
      <span>
        <Trophy :size="19" />
        {{ $t('progress_achievements_title') }}
      </span>
      <small>
        {{ unlockedAchievementCount }}/{{ achievements.length }} {{ $t('achievements_count') }}
      </small>
    </summary>

    <div class="progress-body">
      <div class="totals-grid">
        <article>
          <strong>{{ progress.totals.completedGames }}</strong>
          <span>{{ $t('completed_games') }}</span>
        </article>
        <article>
          <strong>{{ progress.totals.punishmentCount }}</strong>
          <span>{{ $t('total_punishments') }}</span>
        </article>
        <article>
          <strong>{{ progress.totals.mercyRequests }}</strong>
          <span>{{ $t('total_mercy_requests') }}</span>
        </article>
        <article>
          <strong>{{ progress.totals.longestChain }}</strong>
          <span>{{ $t('longest_chain') }}</span>
        </article>
      </div>

      <section>
        <h3>
          <Award :size="17" />
          {{ $t('achievements_header') }}
        </h3>
        <div class="achievement-list">
          <article
            v-for="achievement in achievements"
            :key="achievement.id"
            :class="{ locked: !achievement.unlocked }"
          >
            <Award v-if="achievement.unlocked" :size="18" />
            <Lock v-else :size="18" />
            <div>
              <strong>{{ $t(achievement.title) }}</strong>
              <small>{{ $t(achievement.description) }}</small>
            </div>
          </article>
        </div>
      </section>

      <section>
        <h3>{{ $t('unlocked_content') }}</h3>
        <p>
          {{
            $t('punishment_variants_desc', {
              variants: unlocked.punishmentVariants.length,
              traps: unlocked.miniGameTraps.length,
            })
          }}
        </p>
      </section>

      <section v-if="shameWall.length">
        <h3>{{ $t('local_shame_wall') }}</h3>
        <ol>
          <li v-for="player in shameWall" :key="player.playerName">
            <span>{{ player.playerName }}</span>
            <strong>
              {{
                $t('shame_wall_stats', {
                  count: player.punishmentCount,
                  mercy: player.mercyRequests,
                })
              }}
            </strong>
          </li>
        </ol>
      </section>
      <p class="privacy-copy">{{ $t('privacy_copy') }}</p>
    </div>
  </details>
</template>

<style scoped>
  .progress-panel {
    margin-top: 1rem;
    color: var(--text-primary);
    text-align: left;
    background: rgb(15 23 42 / 0.58);
    border: 1px solid rgb(234 179 8 / 0.28);
    border-radius: var(--radius-xl);
  }

  summary,
  summary span,
  h3 {
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }

  summary {
    justify-content: space-between;
    min-height: 58px;
    padding: 0.85rem 1rem;
    cursor: pointer;
  }

  summary small,
  section p,
  .privacy-copy {
    color: var(--text-muted);
  }

  .progress-body {
    display: grid;
    gap: 1rem;
    padding: 0 1rem 1rem;
  }

  .totals-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.55rem;
  }

  .totals-grid article {
    display: grid;
    padding: 0.65rem;
    text-align: center;
    background: rgb(30 41 59 / 0.74);
    border-radius: 11px;
  }

  .totals-grid strong {
    color: #fde68a;
    font-size: 1.25rem;
  }

  .totals-grid span,
  .achievement-list small {
    color: var(--text-muted);
    font-size: 0.72rem;
  }

  h3,
  section p,
  .privacy-copy {
    margin: 0;
  }

  .achievement-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.55rem;
  }

  .achievement-list article {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.65rem;
    color: #fde68a;
    background: rgb(113 63 18 / 0.25);
    border-radius: 11px;
  }

  .achievement-list article.locked {
    color: #64748b;
    background: rgb(30 41 59 / 0.5);
  }

  .achievement-list div {
    display: grid;
  }

  ol {
    display: grid;
    gap: 0.35rem;
    margin: 0;
    padding-left: 1.5rem;
  }

  li {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
  }

  li strong {
    color: #fca5a5;
    font-size: 0.78rem;
  }

  .privacy-copy {
    font-size: 0.74rem;
  }

  @media (max-width: 560px) {
    .totals-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
