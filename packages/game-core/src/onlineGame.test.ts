import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ONLINE_ROOM_SETTINGS,
  applyOnlineGameCommand,
  applyOnlineGameTimeout,
  createOnlineGame,
  projectOnlineGameView,
  removeOnlinePlayerAtSafeNode,
  type BoardCell,
  type PartyEventCard,
  type OnlinePlayerInput,
} from './index'

const roster: readonly OnlinePlayerInput[] = [
  { id: 'p1', nickname: '玩家一', color: '#ff6b6b' },
  { id: 'p2', nickname: '玩家二', color: '#4ecdc4' },
  { id: 'p3', nickname: '玩家三', color: '#45b7d1' },
]

const quietEventDeck: readonly PartyEventCard[] = [
  {
    id: 'quiet-event',
    title: '测试占位事件',
    description: '本测试不会触发',
    tags: ['test'],
    trigger: { kind: 'every_n_turns', interval: 100 },
    effect: { kind: 'punishment_multiplier', multiplier: 1, durationTurns: 1 },
  },
]

describe('联网升温局权威规则内核', () => {
  it('允许两名玩家创建联机升温局', () => {
    const game = createOnlineGame(roster.slice(0, 2))

    expect(game.players).toHaveLength(2)
    expect(game.status).toBe('playing')
  })

  it('安全节点允许三人局移除至两人，但不允许只剩一人', () => {
    const twoPlayerGame = removeOnlinePlayerAtSafeNode(createOnlineGame(roster), 'p3')

    expect(twoPlayerGame.players.map(player => player.id)).toEqual(['p1', 'p2'])
    expect(() => removeOnlinePlayerAtSafeNode(twoPlayerGame, 'p2')).toThrow(
      '联网升温局至少保留两名玩家'
    )
  })

  it('反应者预测成功后可镜像骰点，镜像后的当前玩家不能再次重掷', () => {
    let game = createOnlineGame(roster)
    expect(projectOnlineGameView(game, 'p2').allowedCommands).toContain('submit_prediction')
    expect(projectOnlineGameView(game, 'p1').allowedCommands).not.toContain('submit_prediction')

    game = applyOnlineGameCommand(game, 'p2', {
      type: 'submit_prediction',
      prediction: 'high',
    })
    expect(projectOnlineGameView(game, 'p1').allowedCommands).toContain('roll_dice')

    game = applyOnlineGameCommand(game, 'p1', { type: 'roll_dice' }, { rollDice: () => 6 })
    expect(game.phase).toBe('awaiting_reaction')
    expect(projectOnlineGameView(game, 'p2').allowedCommands).toContain('decide_reaction')

    game = applyOnlineGameCommand(game, 'p2', {
      type: 'decide_reaction',
      decision: 'mirror',
    })
    expect(game.diceValue).toBe(1)
    expect(projectOnlineGameView(game, 'p1').allowedCommands).toContain('move')
  })

  it('惩罚选择和筹码干预只投影给相关玩家，并由服务器结算免疫', () => {
    const board: BoardCell[] = Array.from({ length: 40 }, (_, index) => ({
      id: index + 1,
      position: index + 1,
      type: 'bonus',
      effect: { type: 'move', value: 0, description: '普通格子' },
    }))
    board[6] = {
      id: 7,
      position: 7,
      type: 'punishment',
      effect: {
        type: 'punishment',
        value: 0,
        description: '测试惩罚格',
        punishment: {
          tool: { name: '手掌', intensity: 2, ratio: 100 },
          bodyPart: { name: '手心', sensitivity: 2, ratio: 100 },
          position: { name: '站立', ratio: 100, compatibleBodyParts: ['手心'] },
          strikes: 5,
          description: '测试私密惩罚',
        },
      },
    }

    let game = createOnlineGame(roster, DEFAULT_ONLINE_ROOM_SETTINGS, {
      board,
      eventDeck: quietEventDeck,
    })
    game = applyOnlineGameCommand(game, 'p2', {
      type: 'submit_prediction',
      prediction: 'high',
    })
    game = applyOnlineGameCommand(game, 'p1', { type: 'roll_dice' }, { rollDice: () => 6 })
    game = applyOnlineGameCommand(game, 'p2', {
      type: 'decide_reaction',
      decision: 'keep',
    })
    game = applyOnlineGameCommand(game, 'p1', { type: 'move' })
    for (const playerId of ['p2', 'p3']) {
      game = applyOnlineGameCommand(game, playerId, { type: 'roll_dice' }, { rollDice: () => 6 })
      game = applyOnlineGameCommand(game, playerId, { type: 'move' })
    }
    game = applyOnlineGameCommand(game, 'p1', { type: 'roll_dice' }, { rollDice: () => 6 })
    game = applyOnlineGameCommand(game, 'p1', { type: 'move' })

    const privateChoice = projectOnlineGameView(game, 'p1')
    const unrelatedChoice = projectOnlineGameView(game, 'p2')
    expect(privateChoice.allowedCommands).toContain('choose_punishment')
    expect(privateChoice.pendingAction).toMatchObject({
      kind: 'punishment_choice',
      choices: [{ description: expect.any(String) }, { description: expect.any(String) }],
    })
    expect(unrelatedChoice.pendingAction).toEqual({ kind: 'punishment_choice' })
    expect(JSON.stringify(unrelatedChoice)).not.toContain('测试私密惩罚')

    game = applyOnlineGameCommand(game, 'p1', {
      type: 'choose_punishment',
      selectedIndex: null,
    })
    expect(projectOnlineGameView(game, 'p1').pendingAction).toMatchObject({
      kind: 'punishment_intervention',
      actions: ['transfer', 'immunity'],
    })
    expect(projectOnlineGameView(game, 'p2').pendingAction).toMatchObject({
      kind: 'punishment_intervention',
      actions: ['amplify'],
    })

    game = applyOnlineGameCommand(game, 'p1', { type: 'intervene', action: 'immunity' })
    expect(game.currentPlayerId).toBe('p2')
    expect(projectOnlineGameView(game, 'p1').myTokensRemaining).toBe(1)
  })

  it('事件投票保持逐玩家私密，收齐后统一结算并恢复下一回合', () => {
    const board: BoardCell[] = Array.from({ length: 40 }, (_, index) => ({
      id: index + 1,
      position: index + 1,
      type: 'bonus',
      effect: { type: 'move', value: 0, description: '普通格子' },
    }))
    const eventDeck: readonly PartyEventCard[] = [
      {
        id: 'private-vote',
        title: '私密投票',
        description: '测试投票',
        tags: ['投票'],
        trigger: { kind: 'every_n_turns', interval: 1 },
        effect: { kind: 'vote', prompt: '选择气氛', options: ['轻松', '加码'] },
      },
    ]
    let game = createOnlineGame(roster, DEFAULT_ONLINE_ROOM_SETTINGS, { board, eventDeck })
    game = applyOnlineGameCommand(game, 'p2', {
      type: 'submit_prediction',
      prediction: 'high',
    })
    game = applyOnlineGameCommand(game, 'p1', { type: 'roll_dice' }, { rollDice: () => 6 })
    game = applyOnlineGameCommand(game, 'p2', {
      type: 'decide_reaction',
      decision: 'keep',
    })
    game = applyOnlineGameCommand(game, 'p1', { type: 'move' })

    expect(projectOnlineGameView(game, 'p1').pendingAction).toMatchObject({
      kind: 'event_vote',
      prompt: '选择气氛',
      options: ['轻松', '加码'],
      submittedCount: 0,
    })
    game = applyOnlineGameCommand(game, 'p1', { type: 'vote', optionIndex: 0 })
    const playerTwoView = projectOnlineGameView(game, 'p2')
    expect(playerTwoView.pendingAction).toMatchObject({
      kind: 'event_vote',
      submittedCount: 1,
      hasSubmitted: false,
    })
    expect(JSON.stringify(playerTwoView)).not.toContain('"p1":0')

    game = applyOnlineGameCommand(game, 'p2', { type: 'vote', optionIndex: 1 })
    game = applyOnlineGameCommand(game, 'p3', { type: 'vote', optionIndex: 1 })
    expect(game.currentPlayerId).toBe('p2')
    expect(game.pendingAction).toMatchObject({ kind: 'event_result', summary: '投票结果：加码' })
    game = applyOnlineGameCommand(game, 'p2', { type: 'acknowledge_event_result' })
    expect(game.phase).toBe('awaiting_roll')
    expect(game.pendingAction).toBeNull()
  })

  it('全员猜拳在收齐前不投影任何玩家的私密选择', () => {
    const board: BoardCell[] = Array.from({ length: 40 }, (_, index) => ({
      id: index + 1,
      position: index + 1,
      type: 'bonus',
      effect: { type: 'move', value: 0, description: '普通格子' },
    }))
    const eventDeck: readonly PartyEventCard[] = [
      {
        id: 'private-rps',
        title: '私密猜拳',
        description: '测试猜拳',
        tags: ['猜拳'],
        trigger: { kind: 'every_n_turns', interval: 1 },
        effect: { kind: 'rock_paper_scissors' },
      },
    ]
    let game = createOnlineGame(roster, DEFAULT_ONLINE_ROOM_SETTINGS, { board, eventDeck })
    game = applyOnlineGameCommand(game, 'p2', {
      type: 'submit_prediction',
      prediction: 'high',
    })
    game = applyOnlineGameCommand(game, 'p1', { type: 'roll_dice' }, { rollDice: () => 6 })
    game = applyOnlineGameCommand(game, 'p2', {
      type: 'decide_reaction',
      decision: 'keep',
    })
    game = applyOnlineGameCommand(game, 'p1', { type: 'move' })

    game = applyOnlineGameCommand(game, 'p1', { type: 'rps', choice: 'rock' })
    const unrelated = projectOnlineGameView(game, 'p2')
    expect(unrelated.pendingAction).toMatchObject({
      kind: 'event_rps',
      submittedCount: 1,
      hasSubmitted: false,
    })
    expect(JSON.stringify(unrelated)).not.toContain('rock')

    game = applyOnlineGameCommand(game, 'p2', { type: 'rps', choice: 'paper' })
    game = applyOnlineGameCommand(game, 'p3', { type: 'rps', choice: 'scissors' })
    expect(projectOnlineGameView(game, 'p1').pendingAction).toMatchObject({
      kind: 'event_result',
      summary: expect.stringContaining('玩家三：剪刀'),
    })
    game = applyOnlineGameCommand(game, 'p2', { type: 'acknowledge_event_result' })
    expect(game.phase).toBe('awaiting_roll')
    expect(game.pendingAction).toBeNull()
  })

  it('记忆小游戏序列只投影给参与者，错误答案由服务器判定为下次惩罚加倍', () => {
    const board: BoardCell[] = Array.from({ length: 40 }, (_, index) => ({
      id: index + 1,
      position: index + 1,
      type: 'bonus',
      effect: { type: 'move', value: 0, description: '普通格子' },
    }))
    const eventDeck: readonly PartyEventCard[] = [
      {
        id: 'server-memory',
        title: '服务器记忆挑战',
        description: '测试记忆',
        tags: ['小游戏'],
        trigger: { kind: 'every_n_turns', interval: 1 },
        effect: { kind: 'mini_game', game: 'memory' },
      },
    ]
    let game = createOnlineGame(roster, DEFAULT_ONLINE_ROOM_SETTINGS, { board, eventDeck })
    game = applyOnlineGameCommand(game, 'p2', {
      type: 'submit_prediction',
      prediction: 'high',
    })
    game = applyOnlineGameCommand(game, 'p1', { type: 'roll_dice' }, { rollDice: () => 6 })
    game = applyOnlineGameCommand(game, 'p2', {
      type: 'decide_reaction',
      decision: 'keep',
    })
    game = applyOnlineGameCommand(game, 'p1', { type: 'move' })
    game = applyOnlineGameCommand(
      game,
      'p2',
      { type: 'resolve_event' },
      { rollDice: () => 1, now: () => 100, choice: entries => entries[0] }
    )

    const participant = projectOnlineGameView(game, 'p2')
    const unrelated = projectOnlineGameView(game, 'p1')
    expect(participant.pendingAction).toMatchObject({
      kind: 'event_mini_game',
      game: 'memory',
      sequence: expect.any(Array),
      options: expect.any(Array),
    })
    expect(unrelated.pendingAction).toMatchObject({ kind: 'event_mini_game', game: 'memory' })
    expect((unrelated.pendingAction as { sequence?: unknown }).sequence).toBeUndefined()
    if (participant.pendingAction?.kind !== 'event_mini_game') {
      throw new Error('expected memory mini game projection')
    }
    const memory = participant.pendingAction
    const wrongSymbol = memory.options?.find(symbol => symbol !== memory.sequence?.[0])
    if (!wrongSymbol) throw new Error('expected an alternate memory symbol')

    game = applyOnlineGameCommand(game, 'p2', {
      type: 'mini_game_memory_answer',
      sequence: (memory.sequence ?? []).map(() => wrongSymbol),
    })
    expect(game.players[1]?.pendingMiniGameMultiplier).toBe(2)
    game = applyOnlineGameCommand(game, 'p2', { type: 'acknowledge_event_result' })
    expect(game.phase).toBe('awaiting_roll')
  })

  it('反应小游戏拒绝服务器 GO 时刻前的抢按，并把免罚授予首个有效玩家', () => {
    const board: BoardCell[] = Array.from({ length: 40 }, (_, index) => ({
      id: index + 1,
      position: index + 1,
      type: 'bonus',
      effect: { type: 'move', value: 0, description: '普通格子' },
    }))
    const eventDeck: readonly PartyEventCard[] = [
      {
        id: 'server-reaction',
        title: '服务器反应挑战',
        description: '测试反应',
        tags: ['小游戏'],
        trigger: { kind: 'every_n_turns', interval: 1 },
        effect: { kind: 'mini_game', game: 'reaction' },
      },
    ]
    let game = createOnlineGame(roster, DEFAULT_ONLINE_ROOM_SETTINGS, { board, eventDeck })
    game = applyOnlineGameCommand(game, 'p2', {
      type: 'submit_prediction',
      prediction: 'high',
    })
    game = applyOnlineGameCommand(game, 'p1', { type: 'roll_dice' }, { rollDice: () => 6 })
    game = applyOnlineGameCommand(game, 'p2', {
      type: 'decide_reaction',
      decision: 'keep',
    })
    game = applyOnlineGameCommand(game, 'p1', { type: 'move' })
    game = applyOnlineGameCommand(
      game,
      'p2',
      { type: 'resolve_event' },
      { rollDice: () => 1, now: () => 100, randomInt: () => 700 }
    )

    expect(() =>
      applyOnlineGameCommand(
        game,
        'p1',
        { type: 'mini_game_press' },
        { rollDice: () => 1, now: () => 799 }
      )
    ).toThrow('反应挑战尚未开始')
    game = applyOnlineGameCommand(
      game,
      'p3',
      { type: 'mini_game_press' },
      { rollDice: () => 1, now: () => 800 }
    )
    expect(game.players[2]?.pendingMiniGameImmunity).toBe(true)
    game = applyOnlineGameCommand(game, 'p2', { type: 'acknowledge_event_result' })
    expect(game.phase).toBe('awaiting_roll')
  })

  it('快速问答超过服务器截止时间后即使自报完成也按失败结算', () => {
    const board: BoardCell[] = Array.from({ length: 40 }, (_, index) => ({
      id: index + 1,
      position: index + 1,
      type: 'bonus',
      effect: { type: 'move', value: 0, description: '普通格子' },
    }))
    const eventDeck: readonly PartyEventCard[] = [
      {
        id: 'server-quiz',
        title: '服务器快速问答',
        description: '测试问答',
        tags: ['小游戏'],
        trigger: { kind: 'every_n_turns', interval: 1 },
        effect: { kind: 'mini_game', game: 'quick_quiz' },
      },
    ]
    let game = createOnlineGame(roster, DEFAULT_ONLINE_ROOM_SETTINGS, { board, eventDeck })
    game = applyOnlineGameCommand(game, 'p2', {
      type: 'submit_prediction',
      prediction: 'high',
    })
    game = applyOnlineGameCommand(game, 'p1', { type: 'roll_dice' }, { rollDice: () => 6 })
    game = applyOnlineGameCommand(game, 'p2', {
      type: 'decide_reaction',
      decision: 'keep',
    })
    game = applyOnlineGameCommand(game, 'p1', { type: 'move' })
    game = applyOnlineGameCommand(
      game,
      'p2',
      { type: 'resolve_event' },
      { rollDice: () => 1, now: () => 100 }
    )
    game = applyOnlineGameCommand(
      game,
      'p2',
      { type: 'mini_game_quiz_result', completed: true },
      { rollDice: () => 1, now: () => 8_101 }
    )
    expect(game.players[1]?.pendingMiniGameMultiplier).toBe(2)
    game = applyOnlineGameCommand(game, 'p2', { type: 'acknowledge_event_result' })
    expect(game.phase).toBe('awaiting_roll')
  })

  it('20 分钟只在轮边界触发终局，并列玩家按服务器骰点决胜后统一结算', () => {
    const board: BoardCell[] = Array.from({ length: 40 }, (_, index) => ({
      id: index + 1,
      position: index + 1,
      type: 'bonus',
      effect: { type: 'move', value: 0, description: '普通格子' },
    }))
    let game = createOnlineGame(roster, DEFAULT_ONLINE_ROOM_SETTINGS, {
      board,
      eventDeck: quietEventDeck,
      startedAt: 0,
    })
    const clock = { rollDice: () => 6, now: () => 20 * 60_000 + 1 }
    game = applyOnlineGameCommand(game, 'p2', {
      type: 'submit_prediction',
      prediction: 'high',
    })
    game = applyOnlineGameCommand(game, 'p1', { type: 'roll_dice' }, clock)
    game = applyOnlineGameCommand(game, 'p2', {
      type: 'decide_reaction',
      decision: 'keep',
    })
    game = applyOnlineGameCommand(game, 'p1', { type: 'move' }, clock)
    for (const playerId of ['p2', 'p3']) {
      game = applyOnlineGameCommand(game, playerId, { type: 'roll_dice' }, clock)
      game = applyOnlineGameCommand(game, playerId, { type: 'move' }, clock)
    }

    expect(game.phase).toBe('awaiting_tiebreak')
    expect(projectOnlineGameView(game, 'p1').allowedCommands).toContain('tiebreak_roll')
    const tieRolls = [2, 5, 3]
    for (const [index, playerId] of ['p1', 'p2', 'p3'].entries()) {
      game = applyOnlineGameCommand(
        game,
        playerId,
        { type: 'tiebreak_roll' },
        { rollDice: () => tieRolls[index] ?? 1 }
      )
    }
    expect(game.status).toBe('finished')
    expect(game.winnerPlayerId).toBe('p2')
    expect(game.victorySettlement).toHaveLength(2)
  })

  it('权威截止时间采用安全默认值，暂停期间冻结截止时间且所有玩家都能恢复', () => {
    let game = createOnlineGame(roster, DEFAULT_ONLINE_ROOM_SETTINGS, {
      eventDeck: quietEventDeck,
      startedAt: 1_000,
    })
    expect(game.deadlineAt).toBe(11_000)

    game = applyOnlineGameCommand(
      game,
      'p3',
      { type: 'pause_game' },
      { rollDice: () => 1, now: () => 5_000 }
    )
    expect(projectOnlineGameView(game, 'p1')).toMatchObject({ paused: true, deadlineAt: 11_000 })
    expect(projectOnlineGameView(game, 'p1').allowedCommands).toEqual(['resume_game'])
    expect(applyOnlineGameTimeout(game, 20_000)).toBe(game)

    game = applyOnlineGameCommand(
      game,
      'p1',
      { type: 'resume_game' },
      { rollDice: () => 1, now: () => 20_000 }
    )
    expect(game.deadlineAt).toBe(26_000)
    game = applyOnlineGameTimeout(game, 26_000, { rollDice: () => 1, now: () => 26_000 })
    expect(game.phase).toBe('awaiting_roll')
    expect(game.partySession.reaction?.prediction).toBe('low')
    expect(game.deadlineAt).toBeNull()
  })

  it('移动类格子由服务器确认结算，休息效果会在下一轮跳过对应玩家', () => {
    const board: BoardCell[] = Array.from({ length: 40 }, (_, index) => ({
      id: index + 1,
      position: index + 1,
      type: 'bonus',
      effect: { type: 'move', value: 0, description: '普通格子' },
    }))
    board[6] = {
      id: 7,
      position: 7,
      type: 'special',
      effect: { type: 'rest', value: 1, description: '休息一回合' },
    }
    let game = createOnlineGame(roster, DEFAULT_ONLINE_ROOM_SETTINGS, {
      board,
      eventDeck: quietEventDeck,
      startedAt: 0,
    })
    game = {
      ...game,
      players: game.players.map(player => ({ ...player, position: 1, hasTakenOff: true })),
    }
    game = applyOnlineGameCommand(game, 'p2', { type: 'submit_prediction', prediction: 'high' })
    game = applyOnlineGameCommand(game, 'p1', { type: 'roll_dice' }, { rollDice: () => 6 })
    game = applyOnlineGameCommand(game, 'p2', { type: 'decide_reaction', decision: 'keep' })
    game = applyOnlineGameCommand(game, 'p1', { type: 'move' })
    expect(game.pendingAction).toMatchObject({ kind: 'content', contentType: 'cell_effect' })
    game = applyOnlineGameCommand(game, 'p1', { type: 'resolve_content', accepted: true })
    expect(game.currentPlayerId).toBe('p2')

    for (const playerId of ['p2', 'p3']) {
      game = applyOnlineGameCommand(game, playerId, { type: 'roll_dice' }, { rollDice: () => 1 })
      game = applyOnlineGameCommand(game, playerId, { type: 'move' })
    }
    expect(game.currentPlayerId).toBe('p2')
    expect(game.players[0]?.pendingSkippedTurns).toBe(0)
  })

  it('事件倍率与小游戏倍率叠加后只消费一次，并把绑定惩罚依次投影给两名相关玩家', () => {
    const board: BoardCell[] = Array.from({ length: 40 }, (_, index) => ({
      id: index + 1,
      position: index + 1,
      type: 'bonus',
      effect: { type: 'move', value: 0, description: '普通格子' },
    }))
    board[6] = {
      id: 7,
      position: 7,
      type: 'punishment',
      effect: {
        type: 'punishment',
        value: 0,
        description: '倍率测试惩罚',
        punishment: {
          tool: { name: '测试工具', intensity: 1, ratio: 100 },
          bodyPart: { name: '测试部位', sensitivity: 5, ratio: 100 },
          position: { name: '测试姿势', ratio: 100, compatibleBodyParts: [] },
          strikes: 2,
          description: '测试惩罚 2 下',
        },
      },
    }
    let game = createOnlineGame(roster, DEFAULT_ONLINE_ROOM_SETTINGS, {
      board,
      eventDeck: quietEventDeck,
    })
    game = {
      ...game,
      players: game.players.map((player, index) => ({
        ...player,
        position: 1,
        hasTakenOff: true,
        pendingMiniGameMultiplier: index === 0 ? 2 : undefined,
      })),
      partySession: { ...game.partySession, tokensRemaining: [0, 0, 0] },
      eventState: {
        ...game.eventState,
        activePunishmentMultiplier: { multiplier: 3, remainingTurns: 2 },
        activeBinding: { playerIndices: [0, 1], remainingTurns: 2 },
      },
    }
    game = applyOnlineGameCommand(game, 'p2', { type: 'submit_prediction', prediction: 'high' })
    game = applyOnlineGameCommand(game, 'p1', { type: 'roll_dice' }, { rollDice: () => 6 })
    game = applyOnlineGameCommand(game, 'p2', { type: 'decide_reaction', decision: 'keep' })
    game = applyOnlineGameCommand(
      game,
      'p1',
      { type: 'move' },
      { rollDice: () => 1, now: () => 1_000 }
    )
    expect(game.players[0]?.pendingMiniGameMultiplier).toBeUndefined()
    expect(game.pendingAction?.kind).toBe('acknowledgement')
    if (game.pendingAction?.kind !== 'acknowledgement') throw new Error('expected punishment')
    expect(game.pendingAction.resolution.count).toMatchObject({ kind: 'fixed' })
    const firstCount =
      game.pendingAction.resolution.count.kind === 'fixed'
        ? game.pendingAction.resolution.count.value
        : 0
    expect(firstCount).toBeGreaterThanOrEqual(30)
    expect(firstCount % 6).toBe(0)
    expect(game.deadlineAt).toBe(21_000)

    game = applyOnlineGameCommand(
      game,
      'p1',
      { type: 'acknowledge' },
      { rollDice: () => 1, now: () => 5_000 }
    )
    expect(game.pendingAction).toMatchObject({ kind: 'acknowledgement', playerIndex: 1 })
    expect(game.deadlineAt).toBe(25_000)
    expect(projectOnlineGameView(game, 'p3').pendingAction).toEqual({ kind: 'acknowledgement' })
    game = applyOnlineGameCommand(game, 'p2', { type: 'acknowledge' })
    expect(game.currentPlayerId).toBe('p2')
  })
})
