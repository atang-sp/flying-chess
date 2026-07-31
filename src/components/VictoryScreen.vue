<script setup lang="ts">
  import { computed } from 'vue'
  import { Gamepad2, Sparkles } from '@lucide/vue'
  import finishFlagUrl from '../assets/kenney/flag_triangle.svg?url'
  import type { GameMode } from '../config/modes'
  import type { PartyHighlight } from '../services/partyMode'
  import type { Player, VictoryConfig } from '../types/game'
  import { DEFAULT_VICTORY_CONFIG, resolveVictorySettlement } from '../services/victorySettlement'
  import PlayerMeeple from './PlayerMeeple.vue'

  interface Props {
    show: boolean
    winner: Player | null
    allPlayers: Player[]
    mode?: GameMode | null
    partyHighlight?: PartyHighlight | null
    victoryConfig?: VictoryConfig
  }

  interface Emits {
    (event: 'play-again'): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  const winnerIndex = computed(() =>
    props.winner ? props.allPlayers.findIndex(player => player.id === props.winner?.id) : -1
  )
  const resolvedVictoryConfig = computed(() => props.victoryConfig ?? DEFAULT_VICTORY_CONFIG)
  const settlement = computed(() =>
    winnerIndex.value >= 0
      ? resolveVictorySettlement(props.allPlayers, winnerIndex.value, resolvedVictoryConfig.value)
      : []
  )
</script>

<template>
  <div v-if="show && winner" class="victory-screen-overlay">
    <section
      class="victory-screen"
      role="dialog"
      aria-modal="true"
      aria-labelledby="victory-title"
      data-testid="victory-scorecard"
    >
      <header class="victory-header">
        <div class="finish-mark" aria-hidden="true">
          <img :src="finishFlagUrl" alt="" />
          <span>FINISH</span>
        </div>
        <div class="victory-copy">
          <p>FLIGHT LOG · 本局结算</p>
          <h1 id="victory-title">游戏胜利！</h1>
        </div>
      </header>

      <div class="winner-card">
        <PlayerMeeple
          :color="winner.color"
          :number="winnerIndex + 1"
          :name="winner.name"
          size="large"
        />
        <div>
          <span>冠军飞行员</span>
          <strong>{{ winner.name }}</strong>
          <small>率先抵达终点，完成本局航线</small>
        </div>
        <Sparkles class="winner-sparkle" :size="24" aria-hidden="true" />
      </div>

      <div class="victory-content">
        <section class="reward-section">
          <p class="section-kicker">胜利奖励</p>
          <p>恭喜 {{ winner.name }} 获得胜利！</p>
          <p class="reward-action">
            作为奖励，{{ winner.name }} 对其他玩家{{ resolvedVictoryConfig.actionText }}：
          </p>

          <div class="players-grid" aria-label="其他玩家列表">
            <article v-for="entry in settlement" :key="entry.playerIndex" class="player-item">
              <PlayerMeeple
                :color="allPlayers[entry.playerIndex].color"
                :number="entry.playerIndex + 1"
                :name="allPlayers[entry.playerIndex].name"
                size="small"
              />
              <span class="player-name">
                {{ allPlayers[entry.playerIndex].name }} · 第 {{ entry.place }} 名
              </span>
              <span class="punishment-count">
                {{ entry.count }} {{ resolvedVictoryConfig.countUnit }}
              </span>
            </article>
          </div>
        </section>

        <section
          v-if="mode === 'party' && partyHighlight"
          class="party-highlight-card"
          data-testid="party-highlight-card"
        >
          <p class="party-highlight-kicker">本地高光卡 · 不上传</p>
          <h2>{{ partyHighlight.act === 'finale' ? '终局高光' : '本局高光' }}</h2>
          <div class="party-highlight-grid">
            <span>{{ partyHighlight.keyDecision }}</span>
            <span>{{ partyHighlight.reactionSummary }}</span>
            <span>{{ partyHighlight.chainSummary }}</span>
          </div>
        </section>
      </div>

      <footer class="victory-actions">
        <button type="button" class="play-again-button" @click="emit('play-again')">
          <Gamepad2 :size="19" aria-hidden="true" />
          再来一局
        </button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
  .victory-screen-overlay {
    position: fixed;
    z-index: 2000;
    inset: 0;
    display: grid;
    place-items: center;
    padding: max(1rem, env(safe-area-inset-top)) 1rem max(1rem, env(safe-area-inset-bottom));
    overflow-y: auto;
    background:
      radial-gradient(circle at 50% 0%, rgb(198 157 83 / 0.18), transparent 38%),
      rgb(3 14 12 / 0.86);
    backdrop-filter: blur(10px);
  }

  .victory-screen {
    width: min(660px, 100%);
    max-height: calc(100dvh - 2rem);
    overflow-y: auto;
    border: 1px solid rgb(218 181 111 / 0.5);
    border-radius: 26px;
    color: #f9f1e2;
    background:
      linear-gradient(rgb(255 255 255 / 0.025), transparent 24%),
      linear-gradient(145deg, #192a24, #0d1e1a);
    box-shadow:
      0 30px 90px rgb(0 0 0 / 0.56),
      inset 0 0 0 5px rgb(255 255 255 / 0.025);
    animation: victory-enter 360ms cubic-bezier(0.22, 0.7, 0.24, 1);
  }

  @keyframes victory-enter {
    from {
      opacity: 0;
      transform: translateY(18px) scale(0.97);
    }
  }

  .victory-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.35rem 1.5rem 1rem;
    border-bottom: 1px solid rgb(221 191 133 / 0.14);
  }

  .finish-mark {
    width: 62px;
    height: 62px;
    flex: 0 0 62px;
    display: grid;
    place-items: center;
    border: 1px solid rgb(232 199 134 / 0.35);
    border-radius: 18px;
    color: #d6b16e;
    background: #0a1a17;
  }

  .finish-mark img {
    width: 33px;
    height: 31px;
    object-fit: contain;
    filter: invert(80%) sepia(45%) saturate(620%) hue-rotate(355deg) brightness(91%);
  }

  .finish-mark span {
    margin-top: -8px;
    font-size: 0.48rem;
    font-weight: 850;
    letter-spacing: 0.14em;
  }

  .victory-copy p,
  .section-kicker,
  .party-highlight-kicker {
    margin: 0;
    color: #c8a565;
    font-size: 0.62rem;
    font-weight: 850;
    letter-spacing: 0.15em;
  }

  .victory-copy h1 {
    margin: 0.25rem 0 0;
    color: #fffaf0;
    font-size: clamp(1.55rem, 5vw, 2.25rem);
    line-height: 1;
  }

  .winner-card {
    position: relative;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 1rem;
    margin: 1.1rem 1.5rem;
    padding: 1.1rem 1.2rem;
    overflow: hidden;
    border: 1px solid rgb(227 192 124 / 0.3);
    border-radius: 18px;
    background:
      radial-gradient(circle at 90% 20%, rgb(229 184 97 / 0.18), transparent 34%),
      rgb(32 53 45 / 0.72);
  }

  .winner-card > div {
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .winner-card span {
    color: #d2b77f;
    font-size: 0.68rem;
    font-weight: 750;
  }

  .winner-card strong {
    overflow: hidden;
    color: #fff9e9;
    font-size: 1.4rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .winner-card small {
    margin-top: 0.15rem;
    color: #b9c7bd;
    font-size: 0.72rem;
  }

  .winner-sparkle {
    color: #dfb968;
  }

  .victory-content {
    display: grid;
    gap: 0.85rem;
    padding: 0 1.5rem;
  }

  .reward-section,
  .party-highlight-card {
    padding: 1.05rem;
    border: 1px solid rgb(255 255 255 / 0.08);
    border-radius: 16px;
    background: rgb(5 21 18 / 0.5);
  }

  .reward-section > p:not(.section-kicker) {
    margin: 0.45rem 0 0;
    color: #dce5de;
    font-size: 0.84rem;
    line-height: 1.45;
  }

  .reward-section .reward-action {
    color: #efd7aa;
    font-weight: 720;
  }

  .players-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 0.55rem;
    margin-top: 0.9rem;
  }

  .player-item {
    min-width: 0;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem;
    border: 1px solid rgb(255 255 255 / 0.07);
    border-radius: 12px;
    background: rgb(255 255 255 / 0.035);
  }

  .player-name {
    overflow: hidden;
    color: #f5efe4;
    font-size: 0.74rem;
    font-weight: 740;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .punishment-count {
    grid-column: 1 / -1;
    justify-self: stretch;
    padding: 0.2rem 0.45rem;
    border-radius: 7px;
    color: #f4d2c0;
    background: rgb(154 68 54 / 0.26);
    font-size: 0.65rem;
    font-weight: 760;
    text-align: center;
  }

  .party-highlight-card {
    text-align: left;
    background:
      linear-gradient(135deg, rgb(138 66 48 / 0.26), rgb(34 76 63 / 0.28)), rgb(5 21 18 / 0.5);
  }

  .party-highlight-card h2 {
    margin: 0.35rem 0 0.75rem;
    color: #fff4df;
    font-size: 1rem;
  }

  .party-highlight-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.55rem;
  }

  .party-highlight-grid span {
    padding: 0.65rem;
    border-radius: 10px;
    color: #c7d3cb;
    background: rgb(4 18 15 / 0.48);
    font-size: 0.72rem;
    line-height: 1.45;
  }

  .victory-actions {
    display: flex;
    justify-content: flex-end;
    padding: 1rem 1.5rem 1.4rem;
  }

  .play-again-button {
    min-width: 150px;
    min-height: 48px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    border: 1px solid #ebca89;
    border-radius: 999px;
    color: #17221e;
    background: linear-gradient(180deg, #f2d797, #cda45d);
    box-shadow: 0 8px 24px rgb(5 11 9 / 0.36);
    font-size: 0.88rem;
    font-weight: 850;
    cursor: pointer;
  }

  .play-again-button:hover {
    filter: brightness(1.07);
    transform: translateY(-1px);
  }

  .play-again-button:focus-visible {
    outline: 3px solid #fff0bd;
    outline-offset: 3px;
  }

  @media (max-width: 560px) {
    .victory-screen-overlay {
      align-items: end;
      padding: 0;
    }

    .victory-screen {
      width: 100%;
      max-height: calc(100dvh - max(0.5rem, env(safe-area-inset-top)));
      border-radius: 24px 24px 0 0;
    }

    .victory-header,
    .winner-card,
    .victory-content,
    .victory-actions {
      margin-right: 0;
      margin-left: 0;
      padding-right: 1rem;
      padding-left: 1rem;
    }

    .finish-mark {
      width: 52px;
      height: 52px;
      flex-basis: 52px;
      border-radius: 15px;
    }

    .party-highlight-grid {
      grid-template-columns: 1fr;
    }

    .victory-actions {
      position: sticky;
      bottom: 0;
      background: linear-gradient(transparent, #0d1e1a 30%);
      padding-top: 1.5rem;
      padding-bottom: max(1rem, env(safe-area-inset-bottom));
    }

    .play-again-button {
      width: 100%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .victory-screen {
      animation: none;
    }

    .play-again-button {
      transition: none;
    }
  }
</style>
