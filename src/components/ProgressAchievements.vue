<script setup lang="ts">
  import { computed, ref, watch } from 'vue'

  import { Award, Lock } from '@lucide/vue'
  import SharePosterDialog from './SharePosterDialog.vue'
  import {
    getLocalAchievements,
    getShameWall,
    getUnlockedPartyContent,
    type LocalProgress,
  } from '../services/localProgress'

  const props = defineProps<{ progress: LocalProgress }>()
  const posterAchievementId = ref<string | null>(null)
  const posterAchievement = computed(() =>
    achievements.value.find(item => item.id === posterAchievementId.value && item.unlocked)
  )
  watch(
    () => props.progress,
    () => {
      posterAchievementId.value = null
    }
  )
  const achievements = computed(() => getLocalAchievements(props.progress))
  const shameWall = computed(() => getShameWall(props.progress).slice(0, 5))
  const unlocked = computed(() => getUnlockedPartyContent(props.progress))
  const unlockedAchievementCount = computed(
    () => achievements.value.filter(item => item.unlocked).length
  )
</script>

<template>
  <section class="progress-panel">
    <p class="achievement-count">
      <small>
        {{ unlockedAchievementCount }}/{{ achievements.length }} {{ $t('achievements_count') }}
      </small>
    </p>

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
            :class="[{ locked: !achievement.unlocked }, achievement.rarity]"
          >
            <Award v-if="achievement.unlocked" :size="20" class="achievement-icon" />
            <Lock v-else :size="20" class="achievement-icon" />
            <div class="achievement-content">
              <strong>
                {{ achievement.isHidden && !achievement.unlocked ? '???' : $t(achievement.title) }}
              </strong>
              <small>
                {{
                  achievement.isHidden && !achievement.unlocked
                    ? $t('achievement_hidden_desc')
                    : $t(achievement.description)
                }}
              </small>
              <button
                v-if="achievement.unlocked"
                type="button"
                class="achievement-share"
                data-testid="achievement-create-poster"
                :aria-label="`${$t('poster_create')} · ${$t(achievement.title)}`"
                @click="posterAchievementId = achievement.id"
              >
                {{ $t('poster_create') }}
              </button>
              <div
                v-if="achievement.maxProgress && achievement.maxProgress > 1"
                class="progress-bar-container"
              >
                <div
                  class="progress-bar"
                  :style="{
                    width: `${((achievement.progress || 0) / achievement.maxProgress) * 100}%`,
                  }"
                ></div>
                <span class="progress-text">
                  {{ achievement.progress || 0 }} / {{ achievement.maxProgress }}
                </span>
              </div>
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
        <ol class="shame-list">
          <li
            v-for="(player, index) in shameWall"
            :key="player.playerName"
            :class="{ 'shame-top': index === 0 }"
          >
            <span class="player-name">
              <span v-if="index === 0" class="shame-crown" :title="$t('shame_king_title')">🤡</span>
              {{ player.playerName }}
            </span>
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
  </section>
  <SharePosterDialog
    :open="Boolean(posterAchievement)"
    :title="posterAchievement ? $t(posterAchievement.title) : ''"
    :lines="posterAchievement ? [$t(posterAchievement.description)] : []"
    @close="posterAchievementId = null"
  />
</template>

<style scoped>
  .achievement-share {
    min-height: 44px;
    margin-top: 0.5rem;
    padding: 0.4rem 0.7rem;
    border: 1px solid #cbaa6355;
    border-radius: 8px;
    color: #fde68a;
    background: #cbaa6310;
    cursor: pointer;
  }

  .progress-panel {
    margin-top: 1rem;
    color: var(--text-primary);
    text-align: left;
    background: rgb(15 23 42 / 0.58);
    border: 1px solid rgb(234 179 8 / 0.28);
    border-radius: var(--radius-xl);
  }

  h3 {
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }

  .achievement-count {
    margin: 0;
    padding: 0.75rem 1rem;
  }

  .achievement-count small,
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

  .achievement-list article.common {
    border-left: 4px solid #94a3b8;
  }
  .achievement-list article.rare {
    border-left: 4px solid #60a5fa;
  }
  .achievement-list article.epic {
    border-left: 4px solid #c084fc;
  }

  .achievement-list article.locked {
    color: #64748b;
    background: rgb(30 41 59 / 0.5);
    border-left-color: transparent;
  }

  .achievement-content {
    display: grid;
    width: 100%;
  }

  .achievement-icon {
    flex-shrink: 0;
  }

  .progress-bar-container {
    width: 100%;
    height: 12px;
    background: rgb(0 0 0 / 0.4);
    border-radius: 6px;
    position: relative;
    margin-top: 6px;
    overflow: hidden;
  }

  .progress-bar {
    height: 100%;
    background: #f59e0b;
    border-radius: 6px;
    transition: width 0.3s ease;
  }

  .progress-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 0.55rem;
    color: #fff;
    white-space: nowrap;
    line-height: 1;
  }

  ol.shame-list {
    display: grid;
    gap: 0.35rem;
    margin: 0;
    padding-left: 1.5rem;
  }

  li {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    align-items: center;
  }

  li.shame-top {
    color: #fca5a5;
    font-weight: bold;
    background: rgb(220 38 38 / 0.15);
    padding: 4px 8px;
    border-radius: 6px;
    margin-left: -8px;
  }

  .player-name {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .shame-crown {
    font-size: 1.1em;
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
