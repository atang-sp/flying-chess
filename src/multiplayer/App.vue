<script setup lang="ts">
  import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
  import QRCode from 'qrcode'
  import {
    ONLINE_TURN_DURATION_OPTIONS,
    ONLINE_PLAYER_COLORS,
    cloneOnlineRoomSettings,
    createOnlineBoardConfig,
    type BoardCell,
    type BoardConfig,
    type OnlineClientMessage,
    type OnlineRoomPlayerView,
    type OnlineRoomSettings,
    type OnlineRoomView,
    type OnlineServerMessage,
    type Player,
    type PunishmentConfig,
    type TrapAction,
  } from '@flying-chess/game-core'
  import { VERSION } from '../config/version'
  import BoardConfigPanel from '../components/BoardConfig.vue'
  import PunishmentConfigPanel from '../components/PunishmentConfig.vue'
  import TrapConfigPanel from '../components/TrapConfig.vue'
  import GameBoard from '../components/GameBoard.vue'
  import { OnlineRoomClient, type OnlineConnectionStatus } from './roomClient'

  const serverUrl = import.meta.env.VITE_ROOM_SERVER_URL ?? 'wss://rooms.atang-sp.run.place'
  const SESSION_STORAGE_KEY = 'flying-chess-online-session-v1'
  const localGameUrl = import.meta.env.BASE_URL
  const onlineEntryUrl = `${import.meta.env.BASE_URL}online.html`
  const query = new URLSearchParams(window.location.search)
  const roomCodeFromQuery = (query.get('room') ?? '').trim().toUpperCase()
  const invitedRoomCode = /^[A-Z2-9]{6}$/.test(roomCodeFromQuery) ? roomCodeFromQuery : ''
  const nickname = ref('')
  const color = ref<(typeof ONLINE_PLAYER_COLORS)[number]>(ONLINE_PLAYER_COLORS[0])
  const roomCodeInput = ref(roomCodeFromQuery)
  const applicationVersion = VERSION
  const status = ref<OnlineConnectionStatus>('connecting')
  const errorMessage = ref('')
  const session = ref<Extract<OnlineServerMessage, { type: 'session' }> | null>(null)
  const room = ref<OnlineRoomView | null>(null)
  const settingsDraft = ref<OnlineRoomSettings>(cloneOnlineRoomSettings())
  let lastSyncedSettings = settingsSignature(settingsDraft.value)
  const qrCodeUrl = ref('')
  const memoryAnswer = ref<string[]>([])
  const eventSelectedPlayerIds = ref<string[]>([])
  const hostTransferNotice = ref('')
  const currentTime = ref(Date.now())
  let requestSequence = 0
  let clockTimer: number | undefined

  interface StoredSession {
    readonly roomCode: string
    readonly playerId: string
    readonly resumeToken: string
  }

  function settingsSignature(settings: OnlineRoomSettings | OnlineRoomView['settings']): string {
    const payload: Record<string, unknown> = {
      scenePreset: settings.scenePreset,
      boardPreset: settings.boardPreset,
      boardConfig: settings.boardConfig,
      turnDurationSeconds: settings.turnDurationSeconds,
    }
    if (settings.punishmentConfig) payload.punishmentConfig = settings.punishmentConfig
    if (settings.traps) payload.traps = settings.traps
    return JSON.stringify(payload)
  }

  function loadStoredSession(): StoredSession | null {
    try {
      const value = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY) ?? 'null') as unknown
      if (!value || typeof value !== 'object') return null
      const candidate = value as Record<string, unknown>
      return typeof candidate.roomCode === 'string' &&
        typeof candidate.playerId === 'string' &&
        typeof candidate.resumeToken === 'string'
        ? {
            roomCode: candidate.roomCode,
            playerId: candidate.playerId,
            resumeToken: candidate.resumeToken,
          }
        : null
    } catch {
      return null
    }
  }

  let storedSession = loadStoredSession()
  if (invitedRoomCode && storedSession?.roomCode !== invitedRoomCode) storedSession = null

  const client = new OnlineRoomClient(serverUrl, {
    onStatus: nextStatus => {
      status.value = nextStatus
      if (nextStatus === 'connected' && storedSession) {
        client.send({
          type: 'resume_room',
          requestId: requestId('resume'),
          ...storedSession,
        })
      }
    },
    onMessage: handleMessage,
  })

  const isHost = computed(
    () => !!session.value && room.value?.hostPlayerId === session.value.playerId
  )
  const canStart = computed(
    () =>
      isHost.value &&
      room.value?.status === 'lobby' &&
      (room.value?.players.length ?? 0) >= 2 &&
      room.value?.players.every(player => player.connected) &&
      room.value?.confirmedPlayerIds.length === room.value?.players.length
  )
  const isConfirmed = computed(
    () =>
      !!session.value && (room.value?.confirmedPlayerIds.includes(session.value.playerId) ?? false)
  )
  const hasUnsavedSettings = computed(
    () =>
      !!room.value &&
      settingsSignature(settingsDraft.value) !== settingsSignature(room.value.settings)
  )
  const game = computed(() => room.value?.game ?? null)
  const sharedBoard = computed<BoardCell[]>(() =>
    (game.value?.board ?? []).map(cell => ({
      id: cell.position,
      position: cell.position,
      type: cell.type,
      effect: cell.effect ? { ...cell.effect, description: '联机棋盘公开效果' } : undefined,
    }))
  )
  const sharedPlayers = computed<Player[]>(() =>
    (game.value?.players ?? []).map((player, index) => ({
      id: index + 1,
      name: player.nickname,
      color: player.color,
      position: player.position,
      isWinner: player.isWinner,
      hasTakenOff: player.hasTakenOff,
      failedTakeoffAttempts: player.failedTakeoffAttempts,
    }))
  )
  const sharedCurrentPlayerIndex = computed(() =>
    Math.max(
      0,
      (game.value?.players ?? []).findIndex(player => player.id === game.value?.currentPlayerId)
    )
  )
  const currentPlayer = computed(() =>
    game.value?.players.find(player => player.id === game.value?.currentPlayerId)
  )
  const canPredict = computed(
    () => game.value?.allowedCommands.includes('submit_prediction') ?? false
  )
  const canRoll = computed(() => game.value?.allowedCommands.includes('roll_dice') ?? false)
  const canReact = computed(() => game.value?.allowedCommands.includes('decide_reaction') ?? false)
  const canReroll = computed(() => game.value?.allowedCommands.includes('reroll') ?? false)
  const canMove = computed(() => game.value?.allowedCommands.includes('move') ?? false)
  const pendingAction = computed(() => game.value?.pendingAction ?? null)
  const allowedCommands = computed(() => game.value?.allowedCommands ?? [])
  const deadlineSeconds = computed(() =>
    game.value?.deadlineAt == null
      ? null
      : Math.max(0, Math.ceil((game.value.deadlineAt - currentTime.value) / 1_000))
  )
  const isCoreOperation = computed(() =>
    ['awaiting_roll', 'awaiting_move', 'awaiting_tiebreak', 'awaiting_chain_roll'].includes(
      game.value?.phase ?? ''
    )
  )
  const hasRequestedPause = computed(
    () =>
      !!session.value &&
      (room.value?.pauseRequestedPlayerIds.includes(session.value.playerId) ?? false)
  )

  const scenePresetLabels: Record<OnlineRoomSettings['scenePreset'], string> = {
    default: '默认升温局',
    icebreaker: '初见破冰',
    hardcore: '老友加码',
    couple: '双人终局风格',
  }
  const boardPresetLabels: Record<OnlineRoomSettings['boardPreset'], string> = {
    standard: '标准模式棋盘',
    party_default: '升温局默认棋盘',
    icebreaker: '破冰棋盘',
    hardcore: '加码棋盘',
    couple_finale: '终局棋盘',
  }
  const actLabels: Record<'warmup' | 'heating' | 'finale', string> = {
    warmup: '热身阶段',
    heating: '升温阶段',
    finale: '终局阶段',
  }

  function offlineSeconds(disconnectedAt: number | undefined): number {
    return disconnectedAt === undefined
      ? 0
      : Math.max(0, Math.floor((currentTime.value - disconnectedAt) / 1_000))
  }

  function offlineRetentionMessage(player: OnlineRoomPlayerView): string {
    if (player.removalBlockReason === 'minimum_players') return '双人局需保留两位玩家'
    if (player.removalBlockReason === 'unsafe_game_state') return '等待新回合安全节点后可移除'
    if (player.removalBlockReason === 'reconnect_grace') return '保留原席位（90 秒保护）'
    return '保留原席位'
  }

  function punishmentCountOptions(
    minimum: number | undefined,
    maximum: number | undefined,
    step: number | undefined
  ): number[] {
    if (minimum === undefined || maximum === undefined) return []
    const safeStep = Math.max(1, step ?? 1)
    const values: number[] = []
    for (let value = minimum; value <= maximum; value += safeStep) values.push(value)
    return values
  }

  function handleBoardPresetChange(event: Event): void {
    const boardPreset = (event.target as HTMLSelectElement)
      .value as OnlineRoomSettings['boardPreset']
    settingsDraft.value = {
      ...settingsDraft.value,
      boardPreset,
      boardConfig: createOnlineBoardConfig(boardPreset),
    }
  }

  function handleBoardConfigUpdate(boardConfig: BoardConfig): void {
    settingsDraft.value = { ...settingsDraft.value, boardConfig: { ...boardConfig } }
  }

  function handlePunishmentConfigUpdate(punishmentConfig: PunishmentConfig): void {
    settingsDraft.value = { ...settingsDraft.value, punishmentConfig }
  }

  function handleTrapConfigUpdate(traps: TrapAction[]): void {
    settingsDraft.value = { ...settingsDraft.value, traps }
  }

  function handleMessage(message: OnlineServerMessage): void {
    if (message.type === 'session') {
      session.value = message
      roomCodeInput.value = message.roomCode
      storedSession = {
        roomCode: message.roomCode,
        playerId: message.playerId,
        resumeToken: message.resumeToken,
      }
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(storedSession))
      return
    }
    if (message.type === 'room_state') {
      room.value = message.room
      errorMessage.value = ''
      return
    }
    if (
      message.code === 'INVALID_RESUME_TOKEN' ||
      message.code === 'ROOM_NOT_FOUND' ||
      message.code === 'ROOM_EXPIRED'
    ) {
      storedSession = null
      session.value = null
      room.value = null
      sessionStorage.removeItem(SESSION_STORAGE_KEY)
    }
    errorMessage.value = message.message
  }

  function requestId(prefix: string): string {
    requestSequence += 1
    return `${prefix}-${Date.now()}-${requestSequence}`
  }

  function send(message: OnlineClientMessage): void {
    errorMessage.value = ''
    try {
      client.send(message)
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '操作发送失败'
    }
  }

  function createRoom(): void {
    send({
      type: 'create_room',
      requestId: requestId('create'),
      nickname: nickname.value,
      color: color.value,
    })
  }

  function joinRoom(): void {
    send({
      type: 'join_room',
      requestId: requestId('join'),
      roomCode: roomCodeInput.value.trim().toUpperCase(),
      nickname: nickname.value,
      color: color.value,
    })
  }

  function sendGameCommand(type: 'start_game' | 'roll_dice' | 'reroll' | 'move'): void {
    send({ type, requestId: requestId(type) })
  }

  function chooseMemorySymbol(symbol: string): void {
    if (pendingAction.value?.kind !== 'event_mini_game') return
    const sequenceLength = pendingAction.value.sequence?.length ?? 0
    if (memoryAnswer.value.length >= sequenceLength) return
    memoryAnswer.value = [...memoryAnswer.value, symbol]
    if (memoryAnswer.value.length < sequenceLength) return
    send({
      type: 'mini_game_memory_answer',
      requestId: requestId('memory'),
      sequence: memoryAnswer.value,
    })
  }

  function toggleEventPlayer(playerId: string, requiredCount: number): void {
    if (eventSelectedPlayerIds.value.includes(playerId)) {
      eventSelectedPlayerIds.value = eventSelectedPlayerIds.value.filter(id => id !== playerId)
      return
    }
    if (eventSelectedPlayerIds.value.length >= requiredCount) return
    eventSelectedPlayerIds.value = [...eventSelectedPlayerIds.value, playerId]
  }

  function playerNickname(playerId: string | null | undefined): string {
    if (!playerId) return ''
    return game.value?.players.find(player => player.id === playerId)?.nickname ?? ''
  }

  watch(
    () => session.value?.roomCode,
    async code => {
      if (!code) return
      const invitationUrl = new URL(
        `${import.meta.env.BASE_URL}online.html`,
        window.location.origin
      )
      invitationUrl.searchParams.set('room', code)
      invitationUrl.searchParams.set('v', applicationVersion)
      qrCodeUrl.value = await QRCode.toDataURL(invitationUrl.toString(), {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 240,
      })
    }
  )

  watch(
    () => room.value?.settings,
    settings => {
      if (!settings) return
      const signature = settingsSignature(settings)
      if (signature === lastSyncedSettings) return
      settingsDraft.value = cloneOnlineRoomSettings(settings)
      lastSyncedSettings = signature
    },
    { deep: true }
  )

  watch(
    () => room.value?.hostPlayerId,
    (nextHostPlayerId, previousHostPlayerId) => {
      if (
        previousHostPlayerId &&
        nextHostPlayerId &&
        nextHostPlayerId !== previousHostPlayerId &&
        nextHostPlayerId === session.value?.playerId
      ) {
        hostTransferNotice.value = '原主持人离线或已转交，你已接任主持人。'
      } else if (nextHostPlayerId !== session.value?.playerId) {
        hostTransferNotice.value = ''
      }
    }
  )

  watch(
    () => pendingAction.value?.kind,
    kind => {
      if (kind !== 'event_mini_game') memoryAnswer.value = []
    }
  )

  watch(
    () => `${game.value?.revision ?? 0}:${pendingAction.value?.kind ?? 'none'}`,
    () => {
      eventSelectedPlayerIds.value = []
    }
  )

  onMounted(async () => {
    clockTimer = window.setInterval(() => {
      currentTime.value = Date.now()
    }, 250)
    try {
      await client.connect()
    } catch (error) {
      status.value = 'disconnected'
      errorMessage.value = error instanceof Error ? error.message : '无法连接房间服务'
    }
  })

  onUnmounted(() => {
    if (clockTimer !== undefined) window.clearInterval(clockTimer)
    client.close()
  })
</script>

<template>
  <main class="online-shell">
    <header class="online-header">
      <a :href="localGameUrl" class="back-link">← 返回本地玩法</a>
      <p class="eyebrow">应用 v{{ applicationVersion }} · 规则集 party_v2 · 联机升温局</p>
      <h1>每人一部手机，同步完成一局</h1>
      <p>服务器只在内存中保留房间；服务重启后房间结束。</p>
      <span class="connection-pill" :data-status="status">
        {{
          status === 'connected'
            ? '房间服务已连接'
            : status === 'connecting'
              ? '正在连接'
              : '连接已断开'
        }}
      </span>
    </header>

    <p v-if="errorMessage" class="error-banner" role="alert">{{ errorMessage }}</p>

    <section v-if="!session" class="online-card join-card">
      <h2>{{ invitedRoomCode ? '加入受邀房间' : '创建或加入房间' }}</h2>
      <div v-if="invitedRoomCode" class="invite-target">
        <p class="eyebrow">受邀房间</p>
        <strong class="room-code" data-testid="invite-room-code">{{ invitedRoomCode }}</strong>
        <p>填写昵称后即可加入，无需再次输入房间码。</p>
      </div>
      <label>
        昵称
        <input
          v-model="nickname"
          data-testid="nickname"
          maxlength="20"
          autocomplete="nickname"
          placeholder="你在本局显示的名字"
        />
      </label>
      <label>
        颜色
        <select v-model="color" data-testid="color">
          <option v-for="option in ONLINE_PLAYER_COLORS" :key="option" :value="option">
            {{ option }}
          </option>
        </select>
      </label>
      <template v-if="invitedRoomCode">
        <button
          class="btn btn-primary"
          data-testid="join-room"
          :disabled="status !== 'connected' || !nickname.trim()"
          @click="joinRoom"
        >
          加入这个房间
        </button>
        <a :href="onlineEntryUrl" class="text-button invite-alternative">
          创建房间或输入其他房间码
        </a>
      </template>
      <template v-else>
        <button
          class="btn btn-primary"
          data-testid="create-room"
          :disabled="status !== 'connected' || !nickname.trim()"
          @click="createRoom"
        >
          创建房间
        </button>
        <div class="join-divider"><span>或输入 6 位房间码</span></div>
        <label>
          房间码
          <input
            v-model="roomCodeInput"
            maxlength="6"
            autocapitalize="characters"
            placeholder="ABC234"
          />
        </label>
        <button
          class="btn btn-secondary"
          data-testid="join-room"
          :disabled="status !== 'connected' || !nickname.trim() || roomCodeInput.length !== 6"
          @click="joinRoom"
        >
          加入房间
        </button>
      </template>
    </section>

    <template v-else-if="room">
      <section v-if="room.status === 'lobby'" class="online-grid">
        <div class="online-card invite-card">
          <p class="eyebrow">房间码</p>
          <strong class="room-code" data-testid="room-code">{{ session.roomCode }}</strong>
          <img v-if="qrCodeUrl" :src="qrCodeUrl" alt="加入本房间的二维码" class="room-qr" />
          <p>让其他玩家扫码加入；房间会自动带入，无需手动输入房间码。</p>
        </div>

        <div class="online-card roster-card">
          <div class="card-title-row">
            <h2>已加入 {{ room.players.length }}/8</h2>
            <span v-if="isHost" class="host-badge">你是主持人</span>
          </div>
          <ul class="player-list">
            <li v-for="player in room.players" :key="player.id" data-testid="room-player">
              <span class="player-dot" :style="{ background: player.color }"></span>
              <span>{{ player.nickname }}</span>
              <button
                v-if="isHost && player.id !== session.playerId && player.connected"
                class="text-button"
                :data-testid="`transfer-host-${player.id}`"
                @click="
                  send({
                    type: 'transfer_host',
                    requestId: requestId('transfer'),
                    playerId: player.id,
                  })
                "
              >
                转交主持
              </button>
              <button
                v-if="isHost && player.removable"
                class="text-button"
                @click="
                  send({
                    type: 'remove_player',
                    requestId: requestId('remove'),
                    playerId: player.id,
                  })
                "
              >
                移除
              </button>
              <span v-else class="connection-label">
                {{
                  room.confirmedPlayerIds.includes(player.id)
                    ? '已确认'
                    : player.connected
                      ? '待确认'
                      : '离线'
                }}
              </span>
            </li>
          </ul>
          <div class="settings-panel">
            <h3>本局设置</h3>
            <template v-if="isHost">
              <label>
                场景
                <select v-model="settingsDraft.scenePreset">
                  <option value="default">默认升温局</option>
                  <option value="icebreaker">初见破冰</option>
                  <option value="hardcore">老友加码</option>
                  <option value="couple">双人终局风格</option>
                </select>
              </label>
              <label>
                棋盘基础模板
                <select :value="settingsDraft.boardPreset" @change="handleBoardPresetChange">
                  <option value="standard">标准模式棋盘</option>
                  <option value="party_default">升温局默认棋盘</option>
                  <option value="icebreaker">破冰棋盘</option>
                  <option value="hardcore">加码棋盘</option>
                  <option value="couple_finale">终局棋盘</option>
                </select>
              </label>
              <label>
                每次操作限时
                <select v-model.number="settingsDraft.turnDurationSeconds">
                  <option
                    v-for="duration in ONLINE_TURN_DURATION_OPTIONS"
                    :key="duration"
                    :value="duration"
                  >
                    {{ duration }} 秒
                  </option>
                </select>
              </label>
              <BoardConfigPanel
                :config="settingsDraft.boardConfig"
                :default-config="createOnlineBoardConfig(settingsDraft.boardPreset)"
                @update="handleBoardConfigUpdate"
              />
              <PunishmentConfigPanel
                :config="settingsDraft.punishmentConfig"
                @update="handlePunishmentConfigUpdate"
              />
              <TrapConfigPanel :traps="[...settingsDraft.traps]" @update="handleTrapConfigUpdate" />
              <button
                class="btn btn-secondary"
                data-testid="save-settings"
                :disabled="!hasUnsavedSettings"
                @click="
                  send({
                    type: 'update_settings',
                    requestId: requestId('settings'),
                    settings: settingsDraft,
                  })
                "
              >
                保存设置（会清空确认）
              </button>
            </template>
            <dl v-else class="settings-summary">
              <div>
                <dt>场景</dt>
                <dd data-testid="scene-setting-label">
                  {{ scenePresetLabels[room.settings.scenePreset] }}
                </dd>
              </div>
              <div>
                <dt>棋盘</dt>
                <dd data-testid="board-setting-label">
                  {{ boardPresetLabels[room.settings.boardPreset] }}
                </dd>
              </div>
              <div>
                <dt>棋盘大小</dt>
                <dd data-testid="board-size-setting">
                  {{ room.settings.boardConfig.totalCells }} 格
                </dd>
              </div>
              <div>
                <dt>操作限时</dt>
                <dd data-testid="turn-duration-setting">
                  {{ room.settings.turnDurationSeconds }} 秒
                </dd>
              </div>
            </dl>
          </div>
          <button
            v-if="!isConfirmed"
            class="btn btn-secondary"
            data-testid="confirm-settings"
            :disabled="isHost && hasUnsavedSettings"
            @click="send({ type: 'confirm_settings', requestId: requestId('confirm') })"
          >
            {{ isHost && hasUnsavedSettings ? '请先保存设置' : '我已查看并确认设置' }}
          </button>
          <p v-else class="confirmed-note">✓ 你已确认；设置变化后需重新确认。</p>
          <button
            v-if="isHost"
            class="btn btn-primary"
            data-testid="start-online-game"
            :disabled="!canStart"
            @click="sendGameCommand('start_game')"
          >
            全员到齐，开始游戏
          </button>
          <p v-if="isHost && room.players.length < 2" class="hint">至少 2 人才能开始。</p>
          <p v-else-if="isHost && room.players.some(player => !player.connected)" class="hint">
            等待所有玩家恢复连接后再开始。
          </p>
          <p v-else-if="isHost && !canStart" class="hint">等待所有玩家确认设置。</p>
          <p v-else-if="!isHost" class="hint">等待主持人开始。</p>
        </div>
      </section>

      <section v-else-if="game" class="game-layout">
        <div class="online-card game-status-card">
          <p class="eyebrow">第 {{ game.revision }} 次状态更新</p>
          <h2 v-if="game.status === 'finished'">对局结束</h2>
          <h2 v-else>{{ currentPlayer?.nickname }} 的回合</h2>
          <span v-if="isHost" class="host-badge" data-testid="host-role">你是主持人</span>
          <p v-if="hostTransferNotice" class="confirmed-note" role="status">
            {{ hostTransferNotice }}
          </p>
          <p>
            第 {{ game.roundNumber }} 轮 ·
            <span data-testid="act-label">{{ actLabels[game.currentAct] }}</span>
            · 你的筹码
            {{ game.myTokensRemaining }}
          </p>
          <p v-if="deadlineSeconds !== null" class="deadline-note" data-testid="deadline-note">
            本操作剩余 {{ deadlineSeconds }} 秒
          </p>
          <p v-if="game.paused" class="confirmed-note">游戏已暂停，倒计时已冻结。</p>
          <p v-if="room.skipRequestedPlayerIds.length" class="hint">
            {{ room.skipRequestedPlayerIds.length }} 人请求跳过当前核心操作，等待主持人决定。
          </p>
          <p v-if="room.pauseRequestedPlayerIds.length" class="hint">
            {{ room.pauseRequestedPlayerIds.length }} 人请求暂停，等待主持人决定。
          </p>
          <div class="decision-grid session-controls">
            <button
              v-if="game.paused && isHost"
              class="btn btn-secondary"
              data-testid="resume-game"
              @click="send({ type: 'resume_game', requestId: requestId('resume-game') })"
            >
              恢复游戏
            </button>
            <button
              v-else-if="!game.paused"
              class="btn btn-secondary"
              :data-testid="isHost ? 'pause-game' : 'request-pause'"
              :disabled="!isHost && hasRequestedPause"
              @click="send({ type: 'pause_game', requestId: requestId('pause') })"
            >
              {{ isHost ? '暂停游戏' : hasRequestedPause ? '已请求暂停' : '请求暂停' }}
            </button>
            <button
              v-if="!game.paused"
              class="text-button"
              @click="send({ type: 'skip_action', requestId: requestId('skip') })"
            >
              {{ isCoreOperation && !isHost ? '请求主持人跳过' : '跳过当前操作' }}
            </button>
          </div>
          <p v-if="game.paused && !isHost" class="hint">等待主持人恢复游戏。</p>
          <ul
            v-if="room.players.some(player => !player.connected)"
            class="player-list compact-list"
          >
            <li
              v-for="player in room.players.filter(candidate => !candidate.connected)"
              :key="player.id"
            >
              <span>{{ player.nickname }} 离线 {{ offlineSeconds(player.disconnectedAt) }} 秒</span>
              <button
                v-if="isHost && player.removable"
                class="text-button"
                @click="
                  send({
                    type: 'remove_player',
                    requestId: requestId('remove'),
                    playerId: player.id,
                  })
                "
              >
                移除离场玩家
              </button>
              <small v-else-if="player.removable" data-testid="offline-retention-status">
                等待主持人处理离场玩家
              </small>
              <small v-else data-testid="offline-retention-status">
                {{ offlineRetentionMessage(player) }}
              </small>
            </li>
          </ul>
          <div class="dice-face" data-testid="dice-value">{{ game.diceValue ?? '—' }}</div>
          <div v-if="canPredict" class="decision-grid">
            <button
              class="btn btn-secondary"
              data-testid="predict-low"
              @click="
                send({
                  type: 'submit_prediction',
                  requestId: requestId('predict'),
                  prediction: 'low',
                })
              "
            >
              预测 1–3
            </button>
            <button
              class="btn btn-secondary"
              data-testid="predict-high"
              @click="
                send({
                  type: 'submit_prediction',
                  requestId: requestId('predict'),
                  prediction: 'high',
                })
              "
            >
              预测 4–6
            </button>
          </div>
          <button
            v-if="canRoll"
            class="btn btn-primary"
            data-testid="roll-dice"
            @click="sendGameCommand('roll_dice')"
          >
            投掷骰子
          </button>
          <div v-if="canReact" class="decision-grid">
            <button
              class="btn btn-secondary"
              data-testid="reaction-keep"
              @click="
                send({
                  type: 'decide_reaction',
                  requestId: requestId('reaction'),
                  decision: 'keep',
                })
              "
            >
              保留点数
            </button>
            <button
              class="btn btn-secondary"
              data-testid="reaction-mirror"
              @click="
                send({
                  type: 'decide_reaction',
                  requestId: requestId('reaction'),
                  decision: 'mirror',
                })
              "
            >
              镜像点数
            </button>
          </div>
          <button
            v-if="canReroll"
            class="btn btn-secondary"
            data-testid="reroll"
            @click="sendGameCommand('reroll')"
          >
            使用筹码重掷
          </button>
          <button
            v-if="canMove"
            class="btn btn-primary"
            data-testid="move"
            @click="sendGameCommand('move')"
          >
            按骰点移动
          </button>
          <p
            v-if="
              game.status !== 'finished' &&
              !canPredict &&
              !canRoll &&
              !canReact &&
              !canReroll &&
              !canMove
            "
          >
            请在自己的手机上操作，当前状态会自动同步。
          </p>

          <div v-if="pendingAction?.kind === 'punishment_choice'" class="decision-panel">
            <h3>选择本次惩罚</h3>
            <button
              v-for="(choice, index) in pendingAction.choices ?? []"
              :key="index"
              class="btn btn-secondary"
              @click="
                send({
                  type: 'choose_punishment',
                  requestId: requestId('punishment'),
                  selectedIndex: index as 0 | 1,
                })
              "
            >
              {{ choice.description }}
            </button>
            <button
              v-if="allowedCommands.includes('choose_punishment')"
              class="text-button"
              @click="
                send({
                  type: 'choose_punishment',
                  requestId: requestId('punishment'),
                  selectedIndex: null,
                })
              "
            >
              不使用筹码，按原结果继续
            </button>
          </div>

          <div v-else-if="pendingAction?.kind === 'punishment_intervention'" class="decision-panel">
            <h3>惩罚干预</h3>
            <button
              v-for="action in (pendingAction.actions ?? []).filter(item => item !== 'transfer')"
              :key="action"
              class="btn btn-secondary"
              @click="send({ type: 'intervene', requestId: requestId('intervene'), action })"
            >
              {{ action === 'amplify' ? '加码 ×2' : '免疫本次惩罚' }}
            </button>
            <button
              v-for="targetPlayerId in pendingAction.transferTargetPlayerIds ?? []"
              :key="targetPlayerId"
              class="btn btn-secondary"
              @click="
                send({
                  type: 'intervene',
                  requestId: requestId('intervene'),
                  action: 'transfer',
                  targetPlayerId,
                })
              "
            >
              转嫁给 {{ game.players.find(player => player.id === targetPlayerId)?.nickname }}
            </button>
            <button
              v-if="allowedCommands.includes('decline_intervention')"
              class="text-button"
              @click="send({ type: 'decline_intervention', requestId: requestId('decline') })"
            >
              不干预
            </button>
          </div>

          <div v-else-if="pendingAction?.kind === 'punishment_count'" class="decision-panel">
            <h3>选择本次惩罚次数</h3>
            <div v-if="allowedCommands.includes('choose_punishment_count')" class="decision-grid">
              <button
                v-for="count in punishmentCountOptions(
                  pendingAction.minimum,
                  pendingAction.maximum,
                  pendingAction.step
                )"
                :key="count"
                class="btn btn-secondary"
                @click="
                  send({ type: 'choose_punishment_count', requestId: requestId('count'), count })
                "
              >
                {{ count }} 下
              </button>
            </div>
            <p v-else>相关玩家正在私密选择次数。</p>
          </div>

          <div v-else-if="pendingAction?.kind === 'punishment_variant'" class="decision-panel">
            <h3>惩罚变体 · {{ pendingAction.variant ?? '私密处理中' }}</h3>
            <p v-if="pendingAction.description">{{ pendingAction.description }}</p>
            <div v-if="allowedCommands.includes('resolve_condition')" class="decision-grid">
              <button
                class="btn btn-primary"
                @click="
                  send({
                    type: 'resolve_condition',
                    requestId: requestId('condition'),
                    conditionMet: true,
                  })
                "
              >
                条件完成，次数减半
              </button>
              <button
                class="btn btn-secondary"
                @click="
                  send({
                    type: 'resolve_condition',
                    requestId: requestId('condition'),
                    conditionMet: false,
                  })
                "
              >
                条件未完成，照常执行
              </button>
            </div>
            <div v-else-if="allowedCommands.includes('defer_punishment')" class="decision-grid">
              <button
                class="btn btn-primary"
                @click="
                  send({ type: 'defer_punishment', requestId: requestId('defer'), defer: true })
                "
              >
                延迟到下回合前
              </button>
              <button
                class="btn btn-secondary"
                @click="
                  send({ type: 'defer_punishment', requestId: requestId('defer'), defer: false })
                "
              >
                现在执行
              </button>
            </div>
          </div>

          <div v-else-if="pendingAction?.kind === 'acknowledgement'" class="decision-panel">
            <h3>规则结果</h3>
            <p v-if="pendingAction.description">{{ pendingAction.description }}</p>
            <button
              v-if="allowedCommands.includes('acknowledge')"
              class="btn btn-primary"
              @click="send({ type: 'acknowledge', requestId: requestId('acknowledge') })"
            >
              已完成，继续
            </button>
            <button
              v-if="allowedCommands.includes('request_mercy')"
              class="btn btn-secondary"
              @click="send({ type: 'request_mercy', requestId: requestId('mercy') })"
            >
              请求减半，下一次惩罚加码
            </button>
          </div>

          <div v-else-if="pendingAction?.kind === 'mercy_decision'" class="decision-panel">
            <h3>求饶请求</h3>
            <p v-if="pendingAction.description">{{ pendingAction.description }}</p>
            <div v-if="allowedCommands.includes('decide_mercy')" class="decision-grid">
              <button
                class="btn btn-primary"
                @click="
                  send({
                    type: 'decide_mercy',
                    requestId: requestId('mercy-decision'),
                    accepted: true,
                  })
                "
              >
                接受：本次减半
              </button>
              <button
                class="btn btn-secondary"
                @click="
                  send({
                    type: 'decide_mercy',
                    requestId: requestId('mercy-decision'),
                    accepted: false,
                  })
                "
              >
                拒绝：照常执行
              </button>
            </div>
            <p v-else>等待执行者私密决定。</p>
          </div>

          <div v-else-if="pendingAction?.kind === 'chain_roll'" class="decision-panel">
            <h3>连锁惩罚 · 第 {{ pendingAction.chainCount }} 次</h3>
            <p>服务器掷骰：奇数继续，偶数结束，最多连续 5 次。</p>
            <button
              v-if="allowedCommands.includes('chain_roll')"
              class="btn btn-primary"
              @click="send({ type: 'chain_roll', requestId: requestId('chain') })"
            >
              投掷连锁骰子
            </button>
          </div>

          <div v-else-if="pendingAction?.kind === 'content'" class="decision-panel">
            <h3>{{ pendingAction.contentType }}</h3>
            <p>{{ pendingAction.description }}</p>
            <div v-if="allowedCommands.includes('resolve_content')" class="decision-grid">
              <button
                class="btn btn-primary"
                @click="
                  send({ type: 'resolve_content', requestId: requestId('content'), accepted: true })
                "
              >
                已完成，继续
              </button>
              <button
                v-if="pendingAction.canRefuse"
                class="btn btn-secondary"
                @click="
                  send({
                    type: 'resolve_content',
                    requestId: requestId('content'),
                    accepted: false,
                  })
                "
              >
                拒绝并接受惩罚
              </button>
            </div>
          </div>

          <div v-else-if="pendingAction?.kind === 'event_vote'" class="decision-panel">
            <h3>{{ pendingAction.title }}</h3>
            <p>
              {{ pendingAction.prompt }} · 已提交 {{ pendingAction.submittedCount }}/{{
                game.players.length
              }}
            </p>
            <button
              v-for="(option, optionIndex) in pendingAction.options"
              :key="option"
              class="btn btn-secondary"
              :disabled="pendingAction.hasSubmitted"
              @click="send({ type: 'vote', requestId: requestId('vote'), optionIndex })"
            >
              {{ option }}
            </button>
          </div>

          <div v-else-if="pendingAction?.kind === 'event_rps'" class="decision-panel">
            <h3>{{ pendingAction.title }}</h3>
            <p>已提交 {{ pendingAction.submittedCount }}/{{ game.players.length }}</p>
            <button
              v-for="choice in ['rock', 'paper', 'scissors'] as const"
              :key="choice"
              class="btn btn-secondary"
              :disabled="pendingAction.hasSubmitted"
              @click="send({ type: 'rps', requestId: requestId('rps'), choice })"
            >
              {{ choice === 'rock' ? '石头' : choice === 'paper' ? '布' : '剪刀' }}
            </button>
          </div>

          <div v-else-if="pendingAction?.kind === 'event_result'" class="decision-panel">
            <h3>{{ pendingAction.title }} · 统一揭晓</h3>
            <p>{{ pendingAction.summary }}</p>
            <button
              v-if="allowedCommands.includes('acknowledge_event_result')"
              class="btn btn-primary"
              @click="
                send({ type: 'acknowledge_event_result', requestId: requestId('event-result') })
              "
            >
              已查看，继续
            </button>
          </div>

          <div v-else-if="pendingAction?.kind === 'event_activation'" class="decision-panel">
            <h3>{{ pendingAction.title }}</h3>
            <p>{{ pendingAction.description }}</p>
            <div
              v-if="
                allowedCommands.includes('resolve_event') && pendingAction.selectionPlayerCount > 0
              "
              class="decision-grid"
            >
              <button
                v-for="player in game.players"
                :key="player.id"
                class="btn btn-secondary"
                :aria-pressed="eventSelectedPlayerIds.includes(player.id)"
                :disabled="
                  !eventSelectedPlayerIds.includes(player.id) &&
                  eventSelectedPlayerIds.length >= pendingAction.selectionPlayerCount
                "
                @click="toggleEventPlayer(player.id, pendingAction.selectionPlayerCount)"
              >
                {{ eventSelectedPlayerIds.includes(player.id) ? '✓ ' : '' }}{{ player.nickname }}
              </button>
            </div>
            <button
              v-if="allowedCommands.includes('resolve_event')"
              class="btn btn-primary"
              :disabled="eventSelectedPlayerIds.length !== pendingAction.selectionPlayerCount"
              @click="
                send({
                  type: 'resolve_event',
                  requestId: requestId('event'),
                  selectedPlayerIds: eventSelectedPlayerIds,
                })
              "
            >
              激活事件
            </button>
          </div>

          <div v-else-if="pendingAction?.kind === 'event_mini_game'" class="decision-panel">
            <h3>{{ pendingAction.title }}</h3>
            <template v-if="pendingAction.game === 'reaction'">
              <p>等待服务器信号后抢按。</p>
              <button
                v-if="allowedCommands.includes('mini_game_press')"
                class="btn btn-primary"
                @click="send({ type: 'mini_game_press', requestId: requestId('reaction-game') })"
              >
                抢按
              </button>
            </template>
            <template v-else-if="pendingAction.game === 'memory' && pendingAction.sequence">
              <p class="memory-sequence">{{ pendingAction.sequence.join(' ') }}</p>
              <div class="decision-grid">
                <button
                  v-for="symbol in pendingAction.options ?? []"
                  :key="symbol"
                  class="btn btn-secondary"
                  :disabled="memoryAnswer.length >= pendingAction.sequence.length"
                  @click="chooseMemorySymbol(symbol)"
                >
                  {{ symbol }}
                </button>
              </div>
              <small>已选 {{ memoryAnswer.length }}/{{ pendingAction.sequence.length }}</small>
            </template>
            <template v-else-if="pendingAction.game === 'quick_quiz'">
              <p>在截止时间前说出三个棋盘格子类型。</p>
              <template v-if="allowedCommands.includes('mini_game_quiz_result')">
                <button
                  class="btn btn-primary"
                  @click="
                    send({
                      type: 'mini_game_quiz_result',
                      requestId: requestId('quiz'),
                      completed: true,
                    })
                  "
                >
                  已完成
                </button>
                <button
                  class="text-button"
                  @click="
                    send({
                      type: 'mini_game_quiz_result',
                      requestId: requestId('quiz'),
                      completed: false,
                    })
                  "
                >
                  放弃
                </button>
              </template>
              <p v-else>等待参与者完成快速问答。</p>
            </template>
          </div>

          <div v-else-if="pendingAction?.kind === 'tiebreak'" class="decision-panel">
            <h3>并列决胜 · 第 {{ pendingAction.roundNumber }} 轮</h3>
            <button
              v-if="allowedCommands.includes('tiebreak_roll')"
              class="btn btn-primary"
              @click="send({ type: 'tiebreak_roll', requestId: requestId('tiebreak') })"
            >
              投掷决胜骰子
            </button>
          </div>

          <div v-if="game.status === 'finished'" class="decision-panel">
            <h3>{{ playerNickname(game.winnerPlayerId) }} 获胜</h3>
            <p v-for="entry in game.victorySettlement" :key="entry.playerId">
              {{ playerNickname(entry.playerId) }}：第 {{ entry.place }} 名，{{ entry.count }} 次
            </p>
            <a
              v-if="room.achievementClaimUrl"
              class="btn btn-primary"
              data-testid="claim-forum-achievement"
              :href="room.achievementClaimUrl"
            >
              绑定论坛账号，保存本局成就
            </a>
            <p v-if="room.achievementClaimUrl" class="hint">
              可选操作；论坛只会保存服务器确认的完成记录，不公开你的游戏昵称。
            </p>
          </div>
        </div>

        <div class="online-card board-card">
          <h2>公共棋盘</h2>
          <GameBoard
            :board="sharedBoard"
            :players="sharedPlayers"
            :current-player-index="sharedCurrentPlayerIndex"
            :interaction-disabled="true"
          />
        </div>

        <div class="online-card positions-card">
          <h2>玩家位置</h2>
          <ul class="player-list">
            <li v-for="player in game.players" :key="player.id">
              <span class="player-dot" :style="{ background: player.color }"></span>
              <span>{{ player.nickname }}</span>
              <strong data-testid="player-position">第 {{ player.position }} 格</strong>
            </li>
          </ul>
        </div>
      </section>
    </template>
  </main>
</template>
