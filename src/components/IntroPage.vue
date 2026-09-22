<script setup lang="ts">
  import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
  import {
    Dices,
    Star,
    Gem,
    Code2,
    ExternalLink,
    Users,
    User,
    Minus,
    Plus,
    Rocket,
    Clock,
    Target,
    Eraser,
    Check,
    Flame,
    ShieldCheck,
    Sparkles,
    Trophy,
    Zap,
    Play,
    Settings,
  } from '@lucide/vue'
  import {
    savePlayerSettings,
    loadPlayerSettings,
    clearAllLocalGameData,
    loadVictoryConfig,
    loadPartyEventDeck,
    savePartyEventDeck,
    loadLocalProgress,
    loadPartyStudioConfig,
    savePartyStudioConfig,
    saveVictoryConfig,
  } from '../utils/cache'
  import { SecureRandom } from '../utils/secureRandom'
  import { devLog } from '../utils/logger'
  import VersionDisplay from './VersionDisplay.vue'
  import PartySceneSelector from './PartySceneSelector.vue'
  import VictoryConfigPanel from './VictoryConfig.vue'
  import PartyEventDeckEditor from './PartyEventDeckEditor.vue'
  import CommunityPackBrowser from './CommunityPackBrowser.vue'
  import ProgressAchievements from './ProgressAchievements.vue'
  import PartyStudioEditor from './PartyStudioEditor.vue'
  import type { GameMode } from '../config/modes'
  import { VERSION } from '../config/version'
  import type { PartyScenePreset, VictoryConfig } from '@flying-chess/game-core/types'
  import { PARTY_MIN_PLAYERS } from '@flying-chess/game-core/party-mode'
  import type { PartyEventCard } from '@flying-chess/game-core/party-events'
  import type { CommunityPack } from '../services/communityPacks'
  import { validatePartyStudioConfig, type PartyStudioConfig } from '../services/partyStudio'

  interface Emits {
    (
      e: 'start',
      playerConfig: {
        count: number
        names: string[]
        mode: GameMode
        scenePreset?: PartyScenePreset | 'default'
        multiDevice?: boolean
        victoryConfig: VictoryConfig
        eventDeck: readonly PartyEventCard[]
        studioConfig: PartyStudioConfig
        quickStart?: boolean
      }
    ): void
    (e: 'mode-selected', mode: GameMode): void
  }

  const props = defineProps<{ initialMode: GameMode }>()
  const emit = defineEmits<Emits>()

  // 玩家配置状态（默认2人以兼容既有端到端测试与快速对决）
  const playerCount = ref(2)
  const playerNames = ref<string[]>(['玩家1', '玩家2'])
  const selectedMode = ref<GameMode>(props.initialMode)
  const onlinePartyUrl = `${import.meta.env.BASE_URL}online.html`
  const applicationVersion = VERSION
  const selectedScenePreset = ref<PartyScenePreset | 'default'>('default')
  const multiDeviceMode = ref(false)
  const victoryConfig = ref<VictoryConfig>(loadVictoryConfig())
  const eventDeck = ref<readonly PartyEventCard[]>(loadPartyEventDeck())
  const localProgress = loadLocalProgress()
  const studioConfig = ref<PartyStudioConfig>(loadPartyStudioConfig())
  const canStart = computed(
    () =>
      selectedMode.value === 'classic' ||
      (playerCount.value >= PARTY_MIN_PLAYERS &&
        (!studioConfig.value.enabled || validatePartyStudioConfig(studioConfig.value).ok))
  )

  interface ScenarioPreset {
    id: 'classic' | 'classic-2' | 'classic-3' | 'party'
    title: string
    tag: string
    badge?: string
    desc: string
    playerCount: number
    defaultNames: string[]
    mode: GameMode
    scenePreset?: PartyScenePreset | 'default'
    featured?: boolean
    icon: unknown
  }

  // 快捷对局预设：优先推广经典局（3款经典对决 + 1款派对拓展）
  const scenarioPresets: ScenarioPreset[] = [
    {
      id: 'classic',
      title: '经典 4 人标准局',
      tag: '👑 官方推荐',
      badge: '最经典',
      desc: '4人满员起飞 · 撞子回航 · 原汁原味的经典飞行棋对战',
      playerCount: 4,
      defaultNames: ['玩家1', '玩家2', '玩家3', '玩家4'],
      mode: 'classic',
      featured: true,
      icon: Trophy,
    },
    {
      id: 'classic-2',
      title: '经典 2 人极速局',
      tag: '⚡ 双人速战',
      badge: '快节奏',
      desc: '双人面对面较量 · 快速起飞 · 轻松休闲的策略博弈',
      playerCount: 2,
      defaultNames: ['玩家1', '玩家2'],
      mode: 'classic',
      icon: Zap,
    },
    {
      id: 'classic-3',
      title: '经典 3 人好友局',
      tag: '🎯 三人同行',
      badge: '好友局',
      desc: '三人环形棋盘 · 攻防牵制 · 欢乐互动的经典对弈',
      playerCount: 3,
      defaultNames: ['玩家1', '玩家2', '玩家3'],
      mode: 'classic',
      icon: Users,
    },
    {
      id: 'party',
      title: '聚会升温拓展局',
      tag: '🔥 派对自选',
      badge: '拓展玩法',
      desc: '真心话大冒险、筹码干预与同场反应 · 破冰酒局必备',
      playerCount: 4,
      defaultNames: ['玩家1', '玩家2', '玩家3', '玩家4'],
      mode: 'party',
      scenePreset: 'icebreaker',
      icon: Flame,
    },
  ]

  const activeScenarioId = ref<string | null>('classic-2')
  const presetFeedback = ref<string>('')

  const applyScenarioPreset = (preset: ScenarioPreset) => {
    activeScenarioId.value = preset.id
    selectedMode.value = preset.mode
    playerCount.value = preset.playerCount
    if (preset.scenePreset) {
      selectedScenePreset.value = preset.scenePreset
    }
    const isGeneric = playerNames.value.every(
      (name, idx) => !name || name === `玩家${idx + 1}` || name === '男生' || name === '女生'
    )
    if (isGeneric) {
      playerNames.value = [...preset.defaultNames]
    } else {
      updatePlayerNames()
    }
    presetFeedback.value = `已选定【${preset.title}】，可点击「立即开局」直接掷骰，或在下方调整玩家昵称与规则`
  }

  // 点击卡片上的“一键开局”按钮直接开局
  const quickStartPreset = (preset: ScenarioPreset) => {
    applyScenarioPreset(preset)
    emit('start', {
      count: playerCount.value,
      names: [...playerNames.value],
      mode: preset.mode,
      scenePreset: preset.scenePreset,
      multiDevice: multiDeviceMode.value,
      victoryConfig: { ...victoryConfig.value },
      eventDeck: eventDeck.value,
      studioConfig: studioConfig.value,
      quickStart: true,
    })
  }

  // 主操作区：一键快速开局（直接跳过配置步骤进入对局）
  const startQuickGame = () => {
    if (!canStart.value) return
    emit('start', {
      count: playerCount.value,
      names: [...playerNames.value],
      mode: selectedMode.value,
      scenePreset: selectedMode.value === 'party' ? selectedScenePreset.value : undefined,
      multiDevice: selectedMode.value === 'party' ? multiDeviceMode.value : undefined,
      victoryConfig: { ...victoryConfig.value },
      eventDeck: eventDeck.value,
      studioConfig: studioConfig.value,
      quickStart: true,
    })
  }

  // 详细配置与启动（经典局进入自定义配置引导，升温局进入游戏）
  const startGame = () => {
    if (!canStart.value) return
    emit('start', {
      count: playerCount.value,
      names: [...playerNames.value],
      mode: selectedMode.value,
      scenePreset: selectedMode.value === 'party' ? selectedScenePreset.value : undefined,
      multiDevice: selectedMode.value === 'party' ? multiDeviceMode.value : undefined,
      victoryConfig: { ...victoryConfig.value },
      eventDeck: eventDeck.value,
      studioConfig: studioConfig.value,
      quickStart: false,
    })
  }

  // 快速开局按钮的提示文本
  const quickStartBtnText = computed(() => {
    if (selectedMode.value === 'party') {
      return '一键开始升温局'
    }
    const currentPreset = scenarioPresets.find(p => p.id === activeScenarioId.value)
    if (currentPreset && currentPreset.mode === 'classic') {
      return `⚡ 立即开局（${currentPreset.title}）`
    }
    return `⚡ 立即开始经典局（${playerCount.value}人）`
  })

  // 加载玩家设置的函数
  const loadAndApplyPlayerSettings = () => {
    const cachedSettings = loadPlayerSettings()
    if (cachedSettings) {
      devLog('IntroPage: 加载玩家设置', cachedSettings)
      playerCount.value = cachedSettings.playerCount
      playerNames.value = [...cachedSettings.playerNames]
    }
    if (selectedMode.value === 'classic') {
      if (playerCount.value === 4) activeScenarioId.value = 'classic'
      else if (playerCount.value === 2) activeScenarioId.value = 'classic-2'
      else if (playerCount.value === 3) activeScenarioId.value = 'classic-3'
      else activeScenarioId.value = null
    }
  }

  // 初始化时尝试加载本地缓存的玩家设置
  loadAndApplyPlayerSettings()

  // 监听玩家数量和名称变化并持久化
  watch(
    () => [playerCount.value, playerNames.value],
    () => {
      savePlayerSettings({ playerCount: playerCount.value, playerNames: playerNames.value })
    },
    { deep: true }
  )

  watch(eventDeck, deck => savePartyEventDeck(deck), { deep: true })
  watch(studioConfig, config => savePartyStudioConfig(config), { deep: true })

  watch(
    victoryConfig,
    config => {
      saveVictoryConfig(config)
    },
    { deep: true }
  )

  // 更新玩家名称数组
  const updatePlayerNames = () => {
    const currentNames = [...playerNames.value]
    const newNames: string[] = []

    for (let i = 0; i < playerCount.value; i++) {
      if (i < currentNames.length) {
        newNames.push(currentNames[i])
      } else {
        newNames.push(`玩家${i + 1}`)
      }
    }

    playerNames.value = newNames
  }

  // 监听玩家数量变化
  const onPlayerCountChange = (newCount: number) => {
    playerCount.value = newCount
    updatePlayerNames()
    if (selectedMode.value === 'classic') {
      if (newCount === 4) activeScenarioId.value = 'classic'
      else if (newCount === 2) activeScenarioId.value = 'classic-2'
      else if (newCount === 3) activeScenarioId.value = 'classic-3'
      else activeScenarioId.value = null
    }
  }

  // 更新单个玩家名称
  const updatePlayerName = (index: number, name: string) => {
    playerNames.value[index] = name
  }

  const selectMode = (mode: GameMode) => {
    selectedMode.value = mode
    emit('mode-selected', mode)
  }

  const selectScenePreset = (preset: PartyScenePreset | 'default') => {
    selectedScenePreset.value = preset
  }

  const applyCommunityPack = (pack: CommunityPack) => {
    if (pack.eventDeck) eventDeck.value = pack.eventDeck
    if (pack.victoryConfig) victoryConfig.value = { ...pack.victoryConfig }
    if (pack.studioConfig) studioConfig.value = structuredClone(pack.studioConfig)
  }

  // 监听玩家设置更新事件
  const handlePlayerSettingsUpdate = (event: CustomEvent) => {
    devLog('IntroPage: 收到玩家设置更新事件', event.detail)
    loadAndApplyPlayerSettings()
  }

  // 显示清空成功提示
  const showClearSuccess = ref(false)
  let clearSuccessTimer: ReturnType<typeof setTimeout> | undefined

  // 清空缓存功能
  const clearCache = () => {
    try {
      clearAllLocalGameData()
      victoryConfig.value = loadVictoryConfig()
      eventDeck.value = loadPartyEventDeck()
      studioConfig.value = loadPartyStudioConfig()
      showClearSuccess.value = true
      if (clearSuccessTimer !== undefined) clearTimeout(clearSuccessTimer)
      clearSuccessTimer = setTimeout(() => {
        showClearSuccess.value = false
        clearSuccessTimer = undefined
      }, 3000)
      devLog('本地游戏数据已清空')
    } catch (error) {
      console.error('清空缓存时出错:', error)
    }
  }

  // 粒子系统
  const particles = ref<
    Array<{ x: number; y: number; vx: number; vy: number; size: number; opacity: number }>
  >([])
  const animationId = ref<number>()

  onMounted(() => {
    initParticles()
    animateParticles()
    updatePlayerNames() // 初始化玩家名称

    // 监听玩家设置更新事件
    window.addEventListener('playerSettingsUpdated', handlePlayerSettingsUpdate as EventListener)
    devLog('IntroPage: 已注册玩家设置更新监听器')
  })

  onUnmounted(() => {
    if (animationId.value) {
      cancelAnimationFrame(animationId.value)
    }
    if (clearSuccessTimer !== undefined) {
      clearTimeout(clearSuccessTimer)
      clearSuccessTimer = undefined
    }

    // 移除事件监听器
    window.removeEventListener('playerSettingsUpdated', handlePlayerSettingsUpdate as EventListener)
    devLog('IntroPage: 已移除玩家设置更新监听器')
  })

  const initParticles = () => {
    particles.value = Array.from({ length: 50 }, () => ({
      x: SecureRandom.random() * window.innerWidth,
      y: SecureRandom.random() * window.innerHeight,
      vx: (SecureRandom.random() - 0.5) * 0.5,
      vy: (SecureRandom.random() - 0.5) * 0.5,
      size: SecureRandom.random() * 3 + 1,
      opacity: SecureRandom.random() * 0.5 + 0.1,
    }))
  }

  const animateParticles = () => {
    particles.value.forEach(particle => {
      particle.x += particle.vx
      particle.y += particle.vy

      if (particle.x < 0 || particle.x > window.innerWidth) particle.vx *= -1
      if (particle.y < 0 || particle.y > window.innerHeight) particle.vy *= -1
    })

    animationId.value = requestAnimationFrame(animateParticles)
  }

  const getDiceStyle = (index: number) => {
    const delay = index * 0.5
    const left = 10 + index * 15
    const top = 20 + (index % 3) * 30

    return {
      left: `${left}%`,
      top: `${top}%`,
      animationDelay: `${delay}s`,
    }
  }

  const getStarStyle = (index: number) => {
    const delay = index * 0.3
    const right = 5 + index * 12
    const top = 15 + (index % 4) * 25

    return {
      right: `${right}%`,
      top: `${top}%`,
      animationDelay: `${delay}s`,
    }
  }

  const getParticleStyle = (particle: { x: number; y: number; size: number; opacity: number }) => {
    return {
      left: `${particle.x}px`,
      top: `${particle.y}px`,
      width: `${particle.size}px`,
      height: `${particle.size}px`,
      opacity: particle.opacity,
    }
  }
</script>

<template>
  <div class="intro-page">
    <!-- 粒子背景 -->
    <div class="particles-container">
      <div
        v-for="(particle, index) in particles"
        :key="index"
        class="particle"
        :style="getParticleStyle(particle)"
      ></div>
    </div>

    <!-- 主内容 -->
    <div class="intro-content">
      <!-- 标题区域 -->
      <div class="intro-header">
        <div class="title-container">
          <h1 class="game-title">
            <Dices :size="48" class="title-icon" />
            <span class="title-main">惩罚飞行棋</span>
            <div class="title-glow"></div>
          </h1>
          <div class="title-decoration">
            <div class="decoration-line left"></div>
            <div class="decoration-center">
              <Star :size="24" class="decoration-star" />
              <Gem :size="24" class="decoration-diamond" />
            </div>
            <div class="decoration-line right"></div>
          </div>
        </div>

        <div class="game-subtitle">
          <span class="subtitle-text">环形棋盘 · 自定义惩罚 · 刺激体验</span>
          <div class="subtitle-underline"></div>
        </div>

        <div class="developer-info">
          <div class="dev-card">
            <div class="dev-avatar"><Code2 :size="28" /></div>
            <div class="dev-details">
              <span class="dev-name">开发者：阿汤</span>
              <!-- 论坛宣传链接 -->
              <a
                href="https://atang-sp.run.place"
                target="_blank"
                rel="noopener noreferrer"
                class="dev-link"
              >
                <span class="dev-id">论坛: atang-sp.run.place</span>
                <ExternalLink :size="14" class="link-icon" />
              </a>
              <a
                href="https://x.com/sp_with_py"
                target="_blank"
                rel="noopener noreferrer"
                class="dev-link"
              >
                <span class="dev-id">@sp_with_py</span>
                <ExternalLink :size="14" class="link-icon" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- 快捷场景预设 (Scenario Presets) -->
      <section class="scenario-presets" aria-labelledby="scenario-presets-title">
        <div class="settings-header">
          <h2 id="scenario-presets-title" class="settings-title">
            <Sparkles :size="22" class="settings-icon" />
            <span class="settings-title-text">快速开局推荐</span>
            <span class="settings-title-badge">👑 经典局优先</span>
          </h2>
          <div class="settings-underline"></div>
        </div>
        <p class="presets-intro-subtitle">
          选择推荐配置即可一键直接掷骰开局，或点击卡片选定后在下方按需微调
        </p>

        <div class="scenario-grid">
          <div
            v-for="preset in scenarioPresets"
            :key="preset.id"
            class="scenario-card"
            :class="{
              'scenario-card--selected': activeScenarioId === preset.id,
              'scenario-card--featured': preset.featured,
            }"
            :data-testid="`scenario-preset-${preset.id}`"
            role="button"
            tabindex="0"
            @click="applyScenarioPreset(preset)"
            @keydown.enter="applyScenarioPreset(preset)"
            @keydown.space.prevent="applyScenarioPreset(preset)"
          >
            <div class="scenario-card__header">
              <span class="scenario-card__icon" :class="`scenario-card__icon--${preset.id}`">
                <component :is="preset.icon" :size="20" />
              </span>
              <span
                class="scenario-card__tag"
                :class="{ 'scenario-card__tag--featured': preset.featured }"
              >
                {{ preset.tag }}
              </span>
            </div>

            <div class="scenario-card__body">
              <div class="scenario-card__title-row">
                <strong class="scenario-card__title">{{ preset.title }}</strong>
                <span v-if="preset.badge" class="scenario-card__badge">{{ preset.badge }}</span>
              </div>
              <span class="scenario-card__desc">{{ preset.desc }}</span>
              <div class="scenario-card__meta">
                <span class="scenario-card__meta-item">
                  <Users :size="13" />
                  {{ preset.playerCount }}人对决
                </span>
                <span class="scenario-card__meta-item">
                  <Clock :size="13" />
                  {{
                    preset.mode === 'party'
                      ? '约20分'
                      : preset.playerCount === 2
                        ? '约10分'
                        : '约15分'
                  }}
                </span>
              </div>
            </div>

            <div class="scenario-card__action">
              <button
                type="button"
                class="scenario-card__quick-btn"
                :class="{ 'scenario-card__quick-btn--featured': preset.featured }"
                :data-testid="`quick-start-preset-${preset.id}`"
                :title="`以【${preset.title}】一键开局`"
                @click.stop="quickStartPreset(preset)"
              >
                <Play :size="13" class="btn-play-icon" />
                <span>一键开局</span>
              </button>
            </div>
          </div>
        </div>

        <div v-if="presetFeedback" class="preset-feedback-banner" role="status">
          <Check :size="16" class="feedback-icon" />
          <span class="feedback-text">{{ presetFeedback }}</span>
        </div>
      </section>

      <section class="mode-chooser" aria-labelledby="mode-chooser-title">
        <div class="settings-header">
          <h2 id="mode-chooser-title" class="settings-title">
            <Dices :size="22" class="settings-icon" />
            <span class="settings-title-text">本局玩法模式</span>
          </h2>
          <div class="settings-underline"></div>
        </div>

        <div class="mode-grid">
          <button
            type="button"
            class="mode-card mode-card--classic"
            :class="{
              'mode-card--selected': selectedMode === 'classic',
              'mode-card--recommended': true,
            }"
            :aria-pressed="selectedMode === 'classic'"
            data-testid="mode-classic"
            @click="selectMode('classic')"
          >
            <span class="mode-card__icon mode-card__icon--classic">
              <ShieldCheck :size="26" />
            </span>
            <span class="mode-card__content">
              <div class="mode-card__title-row">
                <strong>经典局</strong>
                <span class="mode-card__badge mode-card__badge--featured">
                  👑 官方推荐 · 核心玩法
                </span>
              </div>
              <span class="mode-card__desc">
                经典飞行棋完整规则 · 原汁原味起飞、撞子回航与策略博弈（支持 2–4 人）
              </span>
            </span>
          </button>

          <button
            type="button"
            class="mode-card mode-card--party"
            :class="{ 'mode-card--selected': selectedMode === 'party' }"
            :aria-pressed="selectedMode === 'party'"
            data-testid="mode-party"
            @click="selectMode('party')"
          >
            <span class="mode-card__icon mode-card__icon--party">
              <Flame :size="26" />
            </span>
            <span class="mode-card__content">
              <div class="mode-card__title-row">
                <strong>升温局</strong>
                <span class="mode-card__badge mode-card__badge--party">🔥 聚会拓展</span>
              </div>
              <span class="mode-card__desc">
                派对互动玩法 · 约 20 分钟 · 三幕进程、筹码干预与真心话大冒险
              </span>
            </span>
          </button>
        </div>

        <PartySceneSelector
          v-if="selectedMode === 'party'"
          :selected="selectedScenePreset"
          @select="selectScenePreset"
        />

        <div v-if="selectedMode === 'party'" class="multi-device-toggle">
          <button
            class="mode-card"
            :class="{ 'mode-card--active': multiDeviceMode }"
            @click="multiDeviceMode = !multiDeviceMode"
          >
            <span class="mode-card__icon">📱</span>
            <span class="mode-card__title">多设备模式</span>
            <span class="mode-card__desc">每人用自己的手机操作</span>
          </button>
        </div>

        <a
          v-if="selectedMode === 'party'"
          :href="onlinePartyUrl"
          class="mode-card online-mode-link"
          data-testid="online-party-entry"
        >
          <span class="mode-card__icon">🌐</span>
          <span class="mode-card__content">
            <strong>联机升温局</strong>
            <span>2–8 人扫码加入，由房间服务器同步局面</span>
          </span>
          <span class="mode-card__badge mode-card__badge--party">
            应用 v{{ applicationVersion }} · party_v3
          </span>
        </a>
      </section>

      <!-- 玩家设置区域 -->
      <div class="player-settings">
        <div class="settings-header">
          <h2 class="settings-title">
            <Users :size="22" class="settings-icon" />
            <span class="settings-title-text">玩家设置</span>
          </h2>
          <div class="settings-underline"></div>
        </div>

        <!-- 玩家数量设置 -->
        <div class="player-count-section">
          <div class="setting-item">
            <label class="setting-label">
              <User :size="20" class="label-icon" />
              <span class="label-text">玩家人数</span>
            </label>
            <div class="count-controls">
              <button
                class="btn btn-secondary count-btn minus"
                aria-label="减少玩家人数"
                :disabled="playerCount <= 1"
                @click="onPlayerCountChange(Math.max(1, playerCount - 1))"
              >
                <Minus :size="18" />
              </button>
              <div class="count-display">
                <span class="count-number">{{ playerCount }}</span>
                <span class="count-unit">人</span>
              </div>
              <button
                class="btn btn-secondary count-btn plus"
                aria-label="增加玩家人数"
                @click="onPlayerCountChange(playerCount + 1)"
              >
                <Plus :size="18" />
              </button>
            </div>
          </div>
        </div>

        <!-- 玩家名称设置 -->
        <div class="player-names-section">
          <div class="names-header">
            <span class="names-title">玩家昵称</span>
          </div>
          <div class="names-list">
            <div v-for="(name, index) in playerNames" :key="index" class="name-item">
              <div class="name-input-container">
                <input
                  type="text"
                  :value="name"
                  class="name-input"
                  :placeholder="`玩家${index + 1}`"
                  maxlength="10"
                  @input="updatePlayerName(index, ($event.target as HTMLInputElement).value)"
                />
                <div class="input-glow"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 主操作区域：置顶直达 -->
      <div class="intro-actions">
        <div class="action-buttons-group">
          <!-- 一键快速开局 -->
          <button
            class="btn btn-primary quick-start-btn"
            :disabled="!canStart"
            data-testid="quick-start-game"
            @click="startQuickGame"
          >
            <Rocket :size="22" />
            <span class="btn-text">{{ quickStartBtnText }}</span>
          </button>

          <!-- 详细配置入口 -->
          <button
            class="btn btn-secondary start-btn"
            :disabled="!canStart"
            data-testid="start-game"
            @click="startGame"
          >
            <Settings :size="18" />
            <span class="btn-text">
              {{ selectedMode === 'party' ? '升温局局况与工坊' : '⚙️ 自定义规则配置' }}
            </span>
          </button>
        </div>

        <p
          v-if="selectedMode === 'party' && playerCount < PARTY_MIN_PLAYERS"
          class="party-player-hint"
        >
          升温局需要至少两名玩家参与反应。
        </p>

        <div class="game-info">
          <div class="info-item">
            <Clock :size="16" class="info-icon" />
            <span class="info-text">
              游戏时长：{{
                selectedMode === 'party'
                  ? '约20分钟'
                  : playerCount === 2
                    ? '约10分钟'
                    : '约15-20分钟'
              }}
            </span>
          </div>
          <div class="info-item">
            <Target :size="16" class="info-icon" />
            <span class="info-text">
              {{
                selectedMode === 'party' ? '适合年龄：18岁以上（聚会互动）' : '全年龄段休闲益智对战'
              }}
            </span>
          </div>
        </div>
      </div>

      <!-- 高级局况定制与工坊（置于开始按钮下方，按需定制） -->
      <section class="advanced-settings-section" aria-label="局况定制与工坊">
        <VictoryConfigPanel
          v-if="selectedMode === 'party'"
          :config="victoryConfig"
          :player-count="playerCount"
          @update="victoryConfig = $event"
        />

        <PartyEventDeckEditor
          v-if="selectedMode === 'party'"
          :deck="eventDeck"
          @update="eventDeck = $event"
        />

        <CommunityPackBrowser v-if="selectedMode === 'party'" @apply="applyCommunityPack" />

        <PartyStudioEditor
          v-if="selectedMode === 'party'"
          :config="studioConfig"
          @update="studioConfig = $event"
        />

        <ProgressAchievements :progress="localProgress" />
      </section>

      <!-- 底部隐私说明与数据管理 -->
      <div class="intro-footer-actions">
        <p class="privacy-note">
          本应用使用无 Cookie
          的匿名统计改进体验；不会上传玩家姓名、游戏配置内容，也不启用录屏或页面回放。
        </p>

        <!-- 清空缓存选项 -->
        <div class="cache-controls">
          <button
            class="btn btn-danger clear-cache-btn"
            title="清除保存在此设备上的游戏配置、玩家设置和引导偏好"
            @click="clearCache"
          >
            <Eraser :size="16" />
            <span class="btn-text">清除本地游戏数据</span>
          </button>
          <p class="cache-hint">清除后刷新页面即可从默认配置重新开始</p>
        </div>

        <!-- 清空成功提示 -->
        <div v-if="showClearSuccess" class="clear-success-toast">
          <Check :size="18" class="toast-icon" />
          <span class="toast-text">本地游戏数据已清除</span>
        </div>
      </div>
    </div>

    <!-- 背景装饰 -->
    <div class="background-decoration">
      <div v-for="i in 8" :key="i" class="floating-dice" :style="getDiceStyle(i)">
        <Dices :size="28" />
      </div>
      <div v-for="i in 12" :key="i" class="floating-star" :style="getStarStyle(i)">
        <Star :size="24" />
      </div>
      <div class="geometric-shapes">
        <div class="shape shape-1"></div>
        <div class="shape shape-2"></div>
        <div class="shape shape-3"></div>
      </div>
    </div>

    <!-- 光效装饰 -->
    <div class="light-effects">
      <div class="light-beam light-1"></div>
      <div class="light-beam light-2"></div>
      <div class="light-beam light-3"></div>
    </div>

    <!-- 版本显示组件 -->
    <VersionDisplay />
  </div>
</template>

<style scoped>
  .intro-page {
    min-height: 100dvh;
    background: linear-gradient(
      135deg,
      #0c0c0c 0%,
      #1a1a2e 25%,
      #16213e 50%,
      #0f3460 75%,
      #533483 100%
    );
    display: flex;
    flex-direction: column;
    position: relative;
    overflow-x: hidden;
    overflow-y: auto;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }

  /* 粒子背景 */
  .particles-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
  }

  .particle {
    position: absolute;
    background: radial-gradient(
      circle,
      rgba(255, 255, 255, 0.8) 0%,
      rgba(255, 255, 255, 0.2) 70%,
      transparent 100%
    );
    border-radius: 50%;
    pointer-events: none;
  }

  /* 主内容 */
  .intro-content {
    margin: auto;
    text-align: center;
    color: var(--text-primary);
    z-index: 10;
    max-width: min(900px, 95vw);
    padding: clamp(1rem, 4vw, 2rem);
    position: relative;
  }

  /* 标题区域 */
  .intro-header {
    margin-bottom: clamp(3rem, 8vw, 4rem);
  }

  .title-container {
    position: relative;
    margin-bottom: clamp(1rem, 3vw, 2rem);
  }

  .game-title {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: clamp(0.5rem, 2vw, 1rem);
    font-size: clamp(2.5rem, 10vw, 5rem);
    font-weight: 900;
    margin: 0;
    position: relative;
    z-index: 2;
  }

  .title-main {
    background: linear-gradient(
      135deg,
      var(--player-1),
      var(--player-2),
      var(--player-3),
      var(--player-4),
      var(--color-accent)
    );
    background-size: 300% 300%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation:
      gradientShift 3s ease-in-out infinite,
      titleFloat 4s ease-in-out infinite;
  }

  .title-icon {
    flex-shrink: 0;
    color: var(--color-accent-light);
    animation: titleFloat 4s ease-in-out infinite;
  }

  .title-glow {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      135deg,
      var(--player-1),
      var(--player-2),
      var(--player-3),
      var(--player-4),
      var(--color-accent)
    );
    background-size: 300% 300%;
    filter: blur(20px);
    opacity: 0.3;
    z-index: -1;
    animation: gradientShift 3s ease-in-out infinite;
  }

  .title-decoration {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: clamp(1rem, 3vw, 2rem);
    margin: clamp(1rem, 3vw, 2rem) 0;
  }

  .decoration-line {
    width: clamp(80px, 20vw, 150px);
    height: 3px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8), transparent);
    position: relative;
  }

  .decoration-line::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(90deg, transparent, var(--player-1), transparent);
    animation: lineGlow 2s ease-in-out infinite;
  }

  .decoration-center {
    display: flex;
    gap: clamp(0.5rem, 2vw, 1rem);
  }

  .decoration-star,
  .decoration-diamond {
    color: var(--color-accent-light);
    animation: starTwinkle 2s ease-in-out infinite;
  }

  .decoration-diamond {
    animation-delay: 1s;
  }

  .game-subtitle {
    font-size: clamp(1.2rem, 4vw, 1.5rem);
    margin: clamp(1rem, 3vw, 2rem) 0;
    position: relative;
    display: inline-block;
  }

  .subtitle-text {
    position: relative;
    z-index: 2;
    font-weight: 300;
    letter-spacing: 1px;
    color: var(--text-secondary);
  }

  .subtitle-underline {
    position: absolute;
    bottom: -5px;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--player-1), transparent);
    animation: underlineGlow 2s ease-in-out infinite;
  }

  /* 开发者信息 */
  .developer-info {
    margin-top: clamp(1.5rem, 4vw, 2rem);
  }

  .dev-card {
    display: inline-flex;
    align-items: center;
    gap: clamp(0.8rem, 2vw, 1rem);
    padding: clamp(0.8rem, 2vw, 1.2rem) clamp(1.5rem, 4vw, 2rem);
    background: var(--bg-glass);
    border-radius: var(--radius-xl);
    backdrop-filter: blur(var(--glass-blur));
    border: var(--glass-border);
    transition: all var(--transition-normal);
  }

  .dev-card:hover {
    transform: translateY(-3px);
    background: var(--bg-glass-hover);
    box-shadow: var(--glass-shadow);
  }

  .dev-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-accent-light);
    animation: avatarFloat 3s ease-in-out infinite;
  }

  .dev-details {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .dev-name {
    font-size: clamp(0.9rem, 2.5vw, 1rem);
    font-weight: 500;
    color: var(--text-primary);
  }

  .dev-link {
    font-size: clamp(0.7rem, 2vw, 0.8rem);
    opacity: 0.8;
    font-weight: bold;
    color: var(--player-2);
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    transition: all var(--transition-normal);
    padding: 0.2rem 0.5rem;
    border-radius: var(--radius-sm);
    background: rgba(var(--player-2-rgb), 0.1);
    border: 1px solid rgba(var(--player-2-rgb), 0.2);
  }

  .dev-link:hover {
    opacity: 1;
    color: var(--text-primary);
    background: rgba(var(--player-2-rgb), 0.2);
    border-color: rgba(var(--player-2-rgb), 0.4);
    transform: translateY(-1px);
    box-shadow: var(--glow-sm) rgba(var(--player-2-rgb), 0.3);
  }

  .link-icon {
    flex-shrink: 0;
    transition: transform var(--transition-normal);
  }

  .dev-link:hover .link-icon {
    transform: scale(1.2);
  }

  /* 快捷场景预设 */
  /* 快捷场景预设 */
  .scenario-presets {
    margin: clamp(1.8rem, 5vw, 2.5rem) 0 0;
    padding: clamp(1.2rem, 3.5vw, 1.6rem);
    background: rgba(15, 23, 42, 0.76);
    border: var(--glass-border);
    border-radius: var(--radius-xl);
    backdrop-filter: blur(var(--glass-blur));
    box-shadow: var(--glass-shadow);
  }

  .settings-title-badge {
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.2rem 0.6rem;
    border-radius: 9999px;
    background: rgba(245, 158, 11, 0.18);
    border: 1px solid rgba(245, 158, 11, 0.4);
    color: #fbbf24;
    margin-left: 0.5rem;
    letter-spacing: 0.5px;
    display: inline-flex;
    align-items: center;
  }

  .presets-intro-subtitle {
    margin: 0.35rem 0 1rem;
    font-size: 0.82rem;
    color: var(--text-secondary);
    line-height: 1.4;
  }

  .scenario-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.85rem;
  }

  @media (max-width: 960px) {
    .scenario-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 520px) {
    .scenario-grid {
      grid-template-columns: 1fr;
      gap: 0.75rem;
    }
  }

  .scenario-card {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 1rem;
    border-radius: var(--radius-lg);
    background: rgba(30, 41, 59, 0.6);
    border: 1px solid rgba(148, 163, 184, 0.22);
    color: var(--text-primary);
    cursor: pointer;
    text-align: left;
    transition:
      transform var(--transition-fast),
      border-color var(--transition-fast),
      background var(--transition-fast),
      box-shadow var(--transition-fast);
  }

  .scenario-card:hover {
    transform: translateY(-2px);
    background: rgba(30, 41, 59, 0.88);
    border-color: rgba(129, 140, 248, 0.5);
  }

  .scenario-card--selected {
    background: rgba(49, 46, 129, 0.35);
    border-color: #818cf8;
    box-shadow:
      0 0 0 2px rgba(129, 140, 248, 0.28),
      0 8px 24px rgba(15, 23, 42, 0.4);
  }

  .scenario-card--featured {
    border-color: rgba(245, 158, 11, 0.45);
    background: rgba(30, 41, 59, 0.75);
    box-shadow: 0 4px 18px rgba(245, 158, 11, 0.1);
  }

  .scenario-card--featured:hover {
    border-color: rgba(245, 158, 11, 0.8);
    box-shadow: 0 6px 22px rgba(245, 158, 11, 0.2);
  }

  .scenario-card--featured.scenario-card--selected {
    border-color: #f59e0b;
    box-shadow:
      0 0 0 2px rgba(245, 158, 11, 0.35),
      0 8px 24px rgba(245, 158, 11, 0.25);
  }

  .scenario-card__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    margin-bottom: 0.6rem;
  }

  .scenario-card__icon {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border-radius: 12px;
  }

  .scenario-card__icon--classic {
    color: #f59e0b;
    background: rgba(245, 158, 11, 0.18);
  }

  .scenario-card__icon--classic-2 {
    color: #38bdf8;
    background: rgba(56, 189, 248, 0.16);
  }

  .scenario-card__icon--classic-3 {
    color: #a855f7;
    background: rgba(168, 85, 247, 0.16);
  }

  .scenario-card__icon--party {
    color: #f43f5e;
    background: rgba(244, 63, 94, 0.16);
  }

  .scenario-card__tag {
    font-size: 0.68rem;
    font-weight: 700;
    padding: 0.15rem 0.45rem;
    border-radius: 9999px;
    background: rgba(255, 255, 255, 0.08);
    color: var(--text-secondary);
  }

  .scenario-card__tag--featured {
    background: rgba(245, 158, 11, 0.22);
    color: #fbbf24;
    border: 1px solid rgba(245, 158, 11, 0.35);
  }

  .scenario-card__body {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    width: 100%;
  }

  .scenario-card__title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .scenario-card__title {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .scenario-card__badge {
    font-size: 0.65rem;
    font-weight: 700;
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
    background: rgba(148, 163, 184, 0.15);
    color: var(--text-secondary);
    white-space: nowrap;
  }

  .scenario-card--featured .scenario-card__badge {
    background: rgba(245, 158, 11, 0.2);
    color: #fbbf24;
  }

  .scenario-card__desc {
    font-size: 0.75rem;
    color: var(--text-secondary);
    line-height: 1.35;
  }

  .scenario-card__meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-top: 0.35rem;
    font-size: 0.72rem;
    color: var(--text-muted);
  }

  .scenario-card__meta-item {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }

  .scenario-card__action {
    margin-top: 0.85rem;
    width: 100%;
  }

  .scenario-card__quick-btn {
    width: 100%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    padding: 0.42rem 0.75rem;
    border-radius: var(--radius-md);
    background: rgba(99, 102, 241, 0.22);
    border: 1px solid rgba(129, 140, 248, 0.45);
    color: #c7d2fe;
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .scenario-card__quick-btn:hover {
    background: #6366f1;
    border-color: #6366f1;
    color: #ffffff;
    box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
    transform: translateY(-1px);
  }

  .scenario-card__quick-btn:active {
    transform: translateY(0);
  }

  .scenario-card__quick-btn--featured {
    background: rgba(245, 158, 11, 0.22);
    border-color: rgba(245, 158, 11, 0.55);
    color: #fef08a;
  }

  .scenario-card__quick-btn--featured:hover {
    background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%);
    border-color: #f59e0b;
    color: #1a1a2e;
    box-shadow: 0 4px 14px rgba(245, 158, 11, 0.45);
  }

  .btn-play-icon {
    flex-shrink: 0;
  }

  .preset-feedback-banner {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.85rem;
    padding: 0.5rem 0.85rem;
    border-radius: var(--radius-md);
    background: rgba(16, 185, 129, 0.14);
    border: 1px solid rgba(16, 185, 129, 0.35);
    color: #6ee7b7;
    font-size: 0.82rem;
  }

  .feedback-icon {
    flex-shrink: 0;
    color: #34d399;
  }

  /* 玩法选择区域 */
  .mode-chooser {
    margin: clamp(2rem, 6vw, 3rem) 0 0;
    padding: clamp(1.25rem, 4vw, 1.75rem);
    background: rgba(15, 23, 42, 0.72);
    border: var(--glass-border);
    border-radius: var(--radius-xl);
    backdrop-filter: blur(var(--glass-blur));
    box-shadow: var(--glass-shadow);
  }

  .mode-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }

  .mode-card {
    position: relative;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.85rem;
    min-height: 132px;
    padding: 1.1rem;
    color: var(--text-primary);
    text-align: left;
    background: rgba(15, 23, 42, 0.76);
    border: 1px solid rgba(148, 163, 184, 0.28);
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition:
      transform var(--transition-fast),
      border-color var(--transition-fast),
      background var(--transition-fast);
  }

  .mode-card:hover {
    transform: translateY(-2px);
    border-color: rgba(129, 140, 248, 0.7);
    background: rgba(30, 41, 59, 0.9);
  }

  .mode-card--recommended {
    border-color: rgba(245, 158, 11, 0.35);
  }

  .mode-card__title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .mode-card__badge--featured {
    background: rgba(245, 158, 11, 0.2);
    color: #fbbf24;
    border: 1px solid rgba(245, 158, 11, 0.4);
    font-size: 0.72rem;
    font-weight: 700;
  }

  .mode-card--selected {
    border-color: #818cf8;
    box-shadow:
      0 0 0 2px rgba(129, 140, 248, 0.18),
      0 16px 34px rgba(15, 23, 42, 0.35);
  }

  .mode-card--party.mode-card--selected {
    border-color: #fb7185;
    box-shadow:
      0 0 0 2px rgba(251, 113, 133, 0.18),
      0 16px 34px rgba(76, 5, 25, 0.28);
  }

  .mode-card__icon {
    display: grid;
    place-items: center;
    width: 46px;
    height: 46px;
    border-radius: 14px;
  }

  .mode-card__icon--classic {
    color: #c7d2fe;
    background: rgba(99, 102, 241, 0.2);
  }

  .mode-card__icon--party {
    color: #fecdd3;
    background: rgba(244, 63, 94, 0.2);
  }

  .mode-card__content {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    padding-right: 0.5rem;
  }

  .mode-card__content strong {
    font-size: 1.1rem;
  }

  .mode-card__content span {
    color: var(--text-secondary);
    font-size: 0.86rem;
    line-height: 1.5;
  }

  .mode-card__badge {
    position: absolute;
    right: 0.75rem;
    bottom: 0.65rem;
    color: #c7d2fe;
    font-size: 0.68rem;
    letter-spacing: 0.04em;
  }

  .mode-card__badge--party {
    color: #fecdd3;
  }

  .player-settings {
    margin: clamp(2rem, 6vw, 3rem) 0;
    padding: clamp(1.5rem, 4vw, 2rem);
    background: var(--bg-glass);
    border-radius: var(--radius-xl);
    backdrop-filter: blur(var(--glass-blur));
    border: var(--glass-border);
    box-shadow: var(--glass-shadow);
  }

  .settings-header {
    text-align: center;
    margin-bottom: clamp(1.5rem, 4vw, 2rem);
  }

  .settings-title {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-size: clamp(1.3rem, 4vw, 1.6rem);
    font-weight: 700;
    margin: 0 0 clamp(0.5rem, 1.5vw, 0.8rem) 0;
  }

  .settings-icon {
    color: var(--player-2);
    flex-shrink: 0;
  }

  .settings-title-text {
    background: linear-gradient(135deg, var(--player-2), var(--player-3));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .settings-underline {
    width: clamp(60px, 15vw, 100px);
    height: 3px;
    background: linear-gradient(90deg, var(--player-2), var(--player-3));
    margin: 0 auto;
    border-radius: 2px;
    animation: underlineGlow 2s ease-in-out infinite;
  }

  /* 玩家数量设置 */
  .player-count-section {
    margin-bottom: clamp(1.5rem, 4vw, 2rem);
  }

  .setting-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: clamp(1rem, 3vw, 1.5rem);
    padding: clamp(1rem, 3vw, 1.5rem);
    background: var(--bg-surface);
    border-radius: var(--radius-lg);
    border: var(--glass-border);
    transition: all var(--transition-normal);
  }

  .setting-item:hover {
    background: var(--bg-glass);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .setting-label {
    display: flex;
    align-items: center;
    gap: clamp(0.5rem, 1.5vw, 0.8rem);
    font-size: clamp(1rem, 3vw, 1.1rem);
    font-weight: 600;
    color: var(--text-primary);
    cursor: pointer;
  }

  .label-icon {
    color: var(--color-accent-light);
    flex-shrink: 0;
  }

  .count-controls {
    display: flex;
    align-items: center;
    gap: clamp(0.8rem, 2vw, 1rem);
  }

  .count-btn {
    width: clamp(40px, 10vw, 50px);
    height: clamp(40px, 10vw, 50px);
    min-width: clamp(40px, 10vw, 50px);
    min-height: clamp(40px, 10vw, 50px);
    padding: 0;
    border-radius: var(--radius-full);
  }

  .count-display {
    display: flex;
    align-items: center;
    gap: clamp(0.3rem, 1vw, 0.5rem);
    padding: clamp(0.5rem, 1.5vw, 0.8rem) clamp(1rem, 3vw, 1.5rem);
    background: var(--bg-glass);
    border-radius: var(--radius-md);
    border: var(--glass-border);
    min-width: clamp(80px, 20vw, 100px);
    justify-content: center;
  }

  .count-number {
    font-size: clamp(1.2rem, 3.5vw, 1.4rem);
    font-weight: 700;
    color: var(--player-2);
  }

  .count-unit {
    font-size: clamp(0.9rem, 2.5vw, 1rem);
    color: var(--text-secondary);
  }

  /* 玩家名称设置 */
  .player-names-section {
    margin-top: clamp(1.5rem, 4vw, 2rem);
  }

  .names-header {
    margin-bottom: clamp(1rem, 3vw, 1.5rem);
    text-align: center;
  }

  .names-title {
    font-size: clamp(1rem, 3vw, 1.1rem);
    font-weight: 600;
    color: var(--text-primary);
  }

  .names-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(200px, 80vw), 1fr));
    gap: clamp(0.8rem, 2vw, 1rem);
  }

  .name-item {
    position: relative;
  }

  .name-input-container {
    position: relative;
    display: flex;
    align-items: center;
  }

  .name-input {
    width: 100%;
    padding: clamp(0.8rem, 2vw, 1rem) clamp(1rem, 3vw, 1.2rem);
    background: rgba(10, 10, 26, 0.6);
    border: var(--glass-border);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: clamp(0.9rem, 2.5vw, 1rem);
    font-weight: 500;
    transition: all var(--transition-normal);
    backdrop-filter: blur(var(--glass-blur));
  }

  .name-input::placeholder {
    color: var(--text-muted);
  }

  .name-input:focus {
    outline: none;
    border-color: var(--color-accent);
    background: var(--bg-glass-hover);
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
  }

  .name-input:hover {
    border-color: rgba(255, 255, 255, 0.2);
    background: var(--bg-glass);
  }

  .input-glow {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(139, 156, 247, 0.1));
    border-radius: inherit;
    opacity: 0;
    transition: opacity var(--transition-normal);
    pointer-events: none;
  }

  .name-input:focus + .input-glow {
    opacity: 1;
  }

  /* 操作区域 */
  .intro-actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: clamp(1.5rem, 4vw, 2.5rem);
    width: 100%;
  }

  .action-buttons-group {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    width: 100%;
    max-width: 640px;
  }

  .quick-start-btn {
    flex: 1 1 260px;
    padding: clamp(0.95rem, 2.8vw, 1.3rem) clamp(1.6rem, 4vw, 2.4rem);
    font-size: clamp(1.05rem, 3vw, 1.22rem);
    font-weight: 800;
    border-radius: var(--radius-full);
    min-height: clamp(52px, 10vw, 62px);
    background: linear-gradient(135deg, #2563eb 0%, #4f46e5 50%, #7c3aed 100%);
    box-shadow: 0 4px 20px rgba(79, 70, 229, 0.45);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    color: #ffffff;
    border: none;
    cursor: pointer;
    transition: all var(--transition-normal);
  }

  .quick-start-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba(79, 70, 229, 0.65);
  }

  .quick-start-btn:active:not(:disabled) {
    transform: translateY(0);
  }

  .party-player-hint {
    margin: -0.5rem 0 0;
    color: #fda4af;
    font-size: 0.86rem;
  }

  .start-btn {
    flex: 1 1 200px;
    padding: clamp(0.9rem, 2.5vw, 1.2rem) clamp(1.5rem, 3.5vw, 2rem);
    font-size: clamp(0.95rem, 2.5vw, 1.05rem);
    border-radius: var(--radius-full);
    min-height: clamp(50px, 10vw, 60px);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .game-info {
    display: flex;
    flex-direction: column;
    gap: clamp(0.5rem, 1.5vw, 0.8rem);
    opacity: 0.8;
  }

  .info-item {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: clamp(0.5rem, 1.5vw, 0.8rem);
    font-size: clamp(0.8rem, 2.5vw, 0.9rem);
    color: var(--text-secondary);
  }

  .info-icon {
    color: var(--color-accent-light);
    flex-shrink: 0;
  }

  .privacy-note {
    max-width: 620px;
    margin: 0;
    padding: 0.75rem 1rem;
    color: var(--text-muted);
    font-size: clamp(0.72rem, 2vw, 0.82rem);
    line-height: 1.6;
    text-align: center;
    background: rgba(15, 23, 42, 0.38);
    border: 1px solid rgba(148, 163, 184, 0.16);
    border-radius: var(--radius-md);
  }

  /* 高级局况定制区 */
  .advanced-settings-section {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    margin-top: 1.5rem;
  }

  .intro-footer-actions {
    margin-top: 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
    width: 100%;
  }

  /* 背景装饰 */
  .background-decoration {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
  }

  .floating-dice,
  .floating-star {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-accent-light);
    opacity: 0.2;
    filter: blur(0.5px);
  }

  .floating-dice {
    animation: floatDice 12s ease-in-out infinite;
  }

  .floating-star {
    animation: floatStar 15s ease-in-out infinite;
  }

  .geometric-shapes {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  .shape {
    position: absolute;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
    animation: shapeFloat 20s ease-in-out infinite;
  }

  .shape-1 {
    width: 100px;
    height: 100px;
    top: 10%;
    left: 10%;
    animation-delay: 0s;
  }

  .shape-2 {
    width: 150px;
    height: 150px;
    top: 60%;
    right: 15%;
    animation-delay: 5s;
  }

  .shape-3 {
    width: 80px;
    height: 80px;
    bottom: 20%;
    left: 20%;
    animation-delay: 10s;
  }

  /* 光效装饰 */
  .light-effects {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
  }

  .light-beam {
    position: absolute;
    width: 2px;
    height: 100%;
    background: linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.3), transparent);
    animation: lightSweep 8s ease-in-out infinite;
  }

  .light-1 {
    left: 20%;
    animation-delay: 0s;
  }

  .light-2 {
    left: 50%;
    animation-delay: 2.5s;
  }

  .light-3 {
    left: 80%;
    animation-delay: 5s;
  }

  /* 动画定义 */
  @keyframes gradientShift {
    0%,
    100% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
  }

  @keyframes titleFloat {
    0%,
    100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-10px);
    }
  }

  @keyframes lineGlow {
    0%,
    100% {
      opacity: 0.5;
    }
    50% {
      opacity: 1;
    }
  }

  @keyframes starTwinkle {
    0%,
    100% {
      opacity: 1;
      transform: scale(1) rotate(0deg);
    }
    50% {
      opacity: 0.7;
      transform: scale(1.2) rotate(180deg);
    }
  }

  @keyframes underlineGlow {
    0%,
    100% {
      opacity: 0.5;
    }
    50% {
      opacity: 1;
    }
  }

  @keyframes avatarFloat {
    0%,
    100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-5px);
    }
  }

  @keyframes floatDice {
    0%,
    100% {
      transform: translateY(0px) rotate(0deg) scale(1);
      opacity: 0.2;
    }
    50% {
      transform: translateY(-30px) rotate(180deg) scale(1.1);
      opacity: 0.4;
    }
  }

  @keyframes floatStar {
    0%,
    100% {
      transform: translateY(0px) scale(1) rotate(0deg);
      opacity: 0.2;
    }
    50% {
      transform: translateY(-25px) scale(1.3) rotate(90deg);
      opacity: 0.4;
    }
  }

  @keyframes shapeFloat {
    0%,
    100% {
      transform: translateY(0px) rotate(0deg);
      opacity: 0.1;
    }
    50% {
      transform: translateY(-40px) rotate(180deg);
      opacity: 0.3;
    }
  }

  @keyframes lightSweep {
    0% {
      transform: translateY(-100%) scaleY(0);
      opacity: 0;
    }
    50% {
      transform: translateY(0%) scaleY(1);
      opacity: 1;
    }
    100% {
      transform: translateY(100%) scaleY(0);
      opacity: 0;
    }
  }

  /* 移动端优化 */
  @media (max-width: 767px) {
    .intro-page {
      padding: 1rem;
      min-height: 100dvh;
    }

    .intro-content {
      gap: 1.5rem;
      padding: 1rem;
    }

    .intro-header {
      gap: 1rem;
    }

    .title-container {
      gap: 0.5rem;
    }

    .game-title {
      font-size: clamp(1.8rem, 6vw, 2.5rem);
      line-height: 1.2;
    }

    .title-decoration {
      gap: 0.5rem;
    }

    .decoration-line {
      height: 2px;
      width: clamp(40px, 15vw, 60px);
    }

    .decoration-center {
      gap: 0.3rem;
    }

    .decoration-star,
    .decoration-diamond {
      font-size: clamp(0.8rem, 2.5vw, 1rem);
    }

    .game-subtitle {
      gap: 0.3rem;
    }

    .subtitle-text {
      font-size: clamp(0.9rem, 2.5vw, 1rem);
    }

    .subtitle-underline {
      height: 1px;
      width: clamp(120px, 40vw, 200px);
    }

    .developer-info {
      gap: 0.5rem;
    }

    .dev-card {
      padding: 0.5rem;
      gap: 0.5rem;
    }

    .dev-avatar {
      font-size: clamp(1.5rem, 4vw, 2rem);
    }

    .dev-details {
      gap: 0.2rem;
    }

    .dev-name {
      font-size: clamp(0.8rem, 2.2vw, 0.9rem);
    }

    .dev-link {
      gap: 0.2rem;
    }

    .dev-id {
      font-size: clamp(0.7rem, 2vw, 0.8rem);
    }

    .link-icon {
      font-size: clamp(0.6rem, 1.8vw, 0.7rem);
    }

    .intro-actions {
      gap: 1rem;
    }

    .start-btn {
      padding: clamp(0.8rem, 3vw, 1rem) clamp(1.5rem, 5vw, 2rem);
      border-radius: var(--radius-md);
      min-height: clamp(48px, 12vw, 56px);
    }

    .btn-text {
      font-size: clamp(1rem, 2.8vw, 1.2rem);
    }

    .game-info {
      gap: 0.5rem;
    }

    .info-item {
      gap: 0.3rem;
    }

    .info-icon {
      font-size: clamp(0.8rem, 2.2vw, 0.9rem);
    }

    .info-text {
      font-size: clamp(0.7rem, 2vw, 0.8rem);
    }

    .floating-dice {
      display: none; /* 移动端隐藏浮动骰子以节省空间 */
    }

    .floating-stars {
      display: none; /* 移动端隐藏浮动星星以节省空间 */
    }
  }

  /* 小屏手机优化 */
  @media (max-width: 480px) {
    .intro-page {
      padding: 0.5rem;
    }

    .intro-content {
      gap: 1rem;
      padding: 0.5rem;
    }

    .intro-header {
      gap: 0.8rem;
    }

    .game-title {
      font-size: clamp(1.5rem, 5vw, 1.8rem);
    }

    .title-decoration {
      gap: 0.4rem;
    }

    .decoration-line {
      width: clamp(30px, 12vw, 40px);
    }

    .decoration-star,
    .decoration-diamond {
      font-size: clamp(0.7rem, 2vw, 0.8rem);
    }

    .subtitle-text {
      font-size: clamp(0.8rem, 2.2vw, 0.9rem);
    }

    .subtitle-underline {
      width: clamp(100px, 35vw, 150px);
    }

    .dev-card {
      padding: 0.4rem;
      gap: 0.4rem;
    }

    .dev-avatar {
      font-size: clamp(1.3rem, 3.5vw, 1.5rem);
    }

    .dev-name {
      font-size: clamp(0.75rem, 2vw, 0.8rem);
    }

    .dev-id {
      font-size: clamp(0.65rem, 1.8vw, 0.7rem);
    }

    .start-btn {
      padding: clamp(0.7rem, 2.5vw, 0.8rem) clamp(1.2rem, 4vw, 1.5rem);
      min-height: clamp(44px, 11vw, 48px);
    }

    .btn-text {
      font-size: clamp(0.9rem, 2.5vw, 1rem);
    }

    .game-info {
      gap: 0.4rem;
    }

    .info-item {
      gap: 0.25rem;
    }

    .info-icon {
      font-size: clamp(0.7rem, 2vw, 0.8rem);
    }

    .info-text {
      font-size: clamp(0.65rem, 1.8vw, 0.7rem);
    }
  }

  /* 超小屏手机优化 */
  @media (max-width: 360px) {
    .intro-page {
      padding: 0.3rem;
    }

    .intro-content {
      gap: 0.8rem;
      padding: 0.3rem;
    }

    .intro-header {
      gap: 0.6rem;
    }

    .game-title {
      font-size: clamp(1.3rem, 4.5vw, 1.5rem);
    }

    .title-decoration {
      gap: 0.3rem;
    }

    .decoration-line {
      width: clamp(25px, 10vw, 30px);
    }

    .decoration-star,
    .decoration-diamond {
      font-size: clamp(0.6rem, 1.8vw, 0.7rem);
    }

    .subtitle-text {
      font-size: clamp(0.75rem, 2vw, 0.8rem);
    }

    .subtitle-underline {
      width: clamp(80px, 30vw, 120px);
    }

    .dev-card {
      padding: 0.3rem;
      gap: 0.3rem;
    }

    .dev-avatar {
      font-size: clamp(1.1rem, 3vw, 1.3rem);
    }

    .dev-name {
      font-size: clamp(0.7rem, 1.8vw, 0.75rem);
    }

    .dev-id {
      font-size: clamp(0.6rem, 1.5vw, 0.65rem);
    }

    .intro-features {
      gap: 0.5rem;
    }

    .feature-item {
      padding: 0.5rem;
      gap: 0.3rem;
    }

    .feature-icon-container {
      width: clamp(30px, 8vw, 35px);
      height: clamp(30px, 8vw, 35px);
    }

    .feature-icon {
      font-size: clamp(0.9rem, 2.2vw, 1rem);
    }

    .feature-text h3 {
      font-size: clamp(0.75rem, 2vw, 0.8rem);
      margin-bottom: 0.1rem;
    }

    .feature-text p {
      font-size: clamp(0.6rem, 1.5vw, 0.65rem);
    }

    .start-btn {
      padding: clamp(0.6rem, 2vw, 0.7rem) clamp(1rem, 3.5vw, 1.2rem);
      min-height: clamp(40px, 10vw, 44px);
    }

    .btn-text {
      font-size: clamp(0.8rem, 2.2vw, 0.9rem);
    }

    .game-info {
      gap: 0.3rem;
    }

    .info-item {
      gap: 0.2rem;
    }

    .info-icon {
      font-size: clamp(0.65rem, 1.8vw, 0.7rem);
    }

    .info-text {
      font-size: clamp(0.6rem, 1.5vw, 0.65rem);
    }
  }

  /* 横屏模式优化 */
  @media (max-width: 767px) and (orientation: landscape) {
    .intro-page {
      padding: 0.5rem;
    }

    .intro-content {
      gap: 1rem;
      padding: 0.5rem;
    }

    .intro-header {
      gap: 0.8rem;
    }

    .game-title {
      font-size: clamp(1.5rem, 5vw, 1.8rem);
    }

    .title-decoration {
      gap: 0.4rem;
    }

    .decoration-line {
      width: clamp(30px, 12vw, 40px);
    }

    .decoration-star,
    .decoration-diamond {
      font-size: clamp(0.7rem, 2vw, 0.8rem);
    }

    .subtitle-text {
      font-size: clamp(0.8rem, 2.2vw, 0.9rem);
    }

    .subtitle-underline {
      width: clamp(100px, 35vw, 150px);
    }

    .dev-card {
      padding: 0.4rem;
      gap: 0.4rem;
    }

    .dev-avatar {
      font-size: clamp(1.3rem, 3.5vw, 1.5rem);
    }

    .dev-name {
      font-size: clamp(0.75rem, 2vw, 0.8rem);
    }

    .dev-id {
      font-size: clamp(0.65rem, 1.8vw, 0.7rem);
    }

    .start-btn {
      padding: clamp(0.7rem, 2.5vw, 0.8rem) clamp(1.2rem, 4vw, 1.5rem);
      min-height: clamp(44px, 11vw, 48px);
    }

    .btn-text {
      font-size: clamp(0.9rem, 2.5vw, 1rem);
    }

    .game-info {
      gap: 0.4rem;
    }

    .info-item {
      gap: 0.25rem;
    }

    .info-icon {
      font-size: clamp(0.7rem, 2vw, 0.8rem);
    }

    .info-text {
      font-size: clamp(0.65rem, 1.8vw, 0.7rem);
    }
  }

  /* 清空缓存控件样式 */
  .cache-controls {
    margin-top: 1.5rem;
    text-align: center;
  }

  .clear-cache-btn {
    font-size: 0.85rem;
  }

  .cache-hint {
    margin-top: 0.5rem;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  /* 清空成功提示样式 */
  .clear-success-toast {
    position: fixed;
    top: 2rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.8rem 1.5rem;
    background: rgba(34, 197, 94, 0.95);
    color: var(--text-primary);
    border-radius: var(--radius-sm);
    font-size: 0.9rem;
    font-weight: 500;
    box-shadow: var(--glass-shadow);
    backdrop-filter: blur(var(--glass-blur));
    border: 1px solid rgba(34, 197, 94, 0.3);
    z-index: 1000;
    animation: toastSlideIn 0.3s ease-out;
  }

  .toast-icon {
    flex-shrink: 0;
  }

  @keyframes toastSlideIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  /* 移动端适配 */
  @media (max-width: 768px) {
    .mode-grid {
      grid-template-columns: 1fr;
    }

    .mode-card {
      min-height: 112px;
    }

    .cache-controls {
      margin-top: 1rem;
    }

    .clear-cache-btn {
      padding: 0.5rem 1rem;
      font-size: 0.8rem;
    }

    .cache-hint {
      font-size: 0.7rem;
    }

    .clear-success-toast {
      top: 1rem;
      padding: 0.6rem 1.2rem;
      font-size: 0.85rem;
    }
  }

  .multi-device-toggle {
    margin-top: 1rem;
  }

  .multi-device-toggle .mode-card {
    width: 100%;
    max-width: 320px;
    margin: 0 auto;
  }

  .multi-device-toggle .mode-card__desc {
    font-size: 0.8rem;
    opacity: 0.6;
  }
</style>
