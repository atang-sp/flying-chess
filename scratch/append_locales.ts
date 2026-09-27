import * as fs from 'fs'

const jaContent = `

const JA_STANDARD_TOOLS = {
  '平手': { intensity: 2, ratio: 8 },
  '定規': { intensity: 3, ratio: 8 },
  '木の板': { intensity: 5, ratio: 8 },
  '竹の鞭': { intensity: 7, ratio: 8 },
  '戒尺': { intensity: 5, ratio: 8 },
  '赤いスパンカー': { intensity: 7, ratio: 8 },
  '緑のスパンカー': { intensity: 7, ratio: 8 },
  'グルースティック': { intensity: 9, ratio: 6 },
  '充電ケーブル': { intensity: 9, ratio: 8 },
  'ヘアブラシ': { intensity: 5, ratio: 8 },
  'レザークロップ': { intensity: 7, ratio: 8 },
  'アクリル板': { intensity: 7, ratio: 6 },
} as const

const JA_STANDARD_BODY_PARTS = {
  'お尻': { sensitivity: 10, ratio: 80 },
  '背中': { sensitivity: 7, ratio: 5 },
  '太もも': { sensitivity: 5, ratio: 5 },
  'お尻の谷間': { sensitivity: 2, ratio: 5 },
  '手のひら': { sensitivity: 2, ratio: 5 },
} as const

const JA_STANDARD_POSITIONS = {
  '直立': { ratio: 20, compatibleBodyParts: ['お尻', '背中', '太もも', 'お尻の谷間', '手のひら'] },
  '壁に手をつく': { ratio: 20, compatibleBodyParts: ['お尻', '背中', '太もも', 'お尻の谷間'] },
  '机にうつ伏せ': { ratio: 20, compatibleBodyParts: ['お尻', '背中', '太もも', 'お尻の谷間'] },
  '膝を掴む': { ratio: 20, compatibleBodyParts: ['お尻', '太もも', 'お尻の谷間'] },
  '四つん這い': { ratio: 20, compatibleBodyParts: ['お尻', '背中', '太もも', 'お尻の谷間'] },
} as const

const JA_STANDARD_TRAPS: TrapAction[] = [
  { name: 'お尻さらしの罠', description: '5分間お尻を露出する' },
  { name: 'ランダム罰の罠', description: '前に罰を受けたプレイヤーに任意の道具でお尻を打たれる。「私のお尻を打ってください」と大声でお願いする' },
]

const JA_PARTY_TRAPS: TrapAction[] = [
  { name: 'お尻さらしの罠', description: '5分間お尻を露出する', trapVariant: 'text' },
  { name: 'お願いの罠', description: '「私のお尻を打ってください」と大声でお願いする', trapVariant: 'text' },
  { name: '全員の罠', description: '全員が一列に並び、罠を踏んだ人が順番に平手で全員のお尻を3回打つ', trapVariant: 'all_players' },
  { name: '全員じゃんけん', description: '全員で反射神経テスト。一番早い人が1回罰を免除', trapVariant: 'mini_game_reaction' },
  { name: '神経衰弱', description: '3つの絵柄の順番を覚える。失敗した人は次の罰が倍になる', trapVariant: 'mini_game_memory' },
]

const JA_PARTY_QA_QUESTIONS = {
  warmup: [
    'あなたのセーフワードは？',
    '一番好きな道具は何？',
    '初めてSP（スパンキング）を知ったのはいつ？',
    '打たれている時に声を出す？',
    '痛みと未知の恐怖、どっちが怖い？',
    '耐えられる道具の限界は？',
    'ずっと試してみたかった姿勢はある？',
    '罰を待っている時と打たれている時、どっちが苦痛？',
  ],
  heating: [
    '一番印象に残っている罰の経験を教えて',
    '絶対に受け入れられないプレイはある？',
    'お尻を打たれて泣いたことはある？それはどんな状況？',
    '立たされたり跪かされたりしたことはある？どんな気分だった？',
    'アフターケアは普段どれくらい必要？',
    '途中でセーフワードを使おうと思った瞬間はある？',
    'お仕置きの前の「お説教」は必要だと思う？',
  ],
  finale: [
    'もし選べるなら、打つ方と打たれる方どっちがいい？',
    '理想のSP関係はどんな感じ？',
    'SPを日常生活の一部にしたい？',
    'パートナーのために妥協できる最大のラインは？',
    '純粋な痛みと儀式感、どっちを重視する？',
    '脳内で一番多く妄想したシチュエーションを教えて',
  ],
} as const

const JA_PARTY_DARE_INSTRUCTIONS = {
  warmup: [
    '目を閉じて、誰かに任意の道具で手の甲を軽く触ってもらい、道具を当てる',
    '打たれて痛い時の表情を真似て、10秒間キープ',
    '左側の人に30秒間肩もみをする',
    '一番厳しい口調で右側の人に「ここに来てお仕置きを受けなさい！」と言う',
    '立って標準的なお仕置きの姿勢を実演し、15秒間キープ',
  ],
  heating: [
    '右側の人に次のターンの罰の姿勢を指定してもらう',
    '目を閉じて手のひらを出し、誰かに3回打ってもらい、誰が打ったか当てる',
    '誰か1人を選んで、30秒間見つめ合う（笑ってはいけない）',
    'みんなが満足するまで許しを乞う演技をする',
    '右側の人と盤上の位置を交換する',
  ],
  finale: [
    '全員で一番痛みに耐えた人を投票で選ぶ',
    '誰か1人を選んで、好きな道具で手の甲を軽く5回打つ',
    '正式に罰を請う：どの道具でどこを打たれたいか大声で言う',
    '手のひらを出し、左側の人に3回打たれる（避けてはいけない）',
    '現実で体験したい罰のシチュエーションを語り、今すぐ実行するか全員で投票する',
  ],
} as const

const JA_STANDARD_PUNISHMENT_CONFIG: PunishmentConfig = {
  tools: Object.fromEntries(
    Object.entries(JA_STANDARD_TOOLS).map(([name, value]) => [name, { ...value, name }])
  ),
  bodyParts: Object.fromEntries(
    Object.entries(JA_STANDARD_BODY_PARTS).map(([name, value]) => [name, { ...value, name }])
  ),
  positions: Object.fromEntries(
    Object.entries(JA_STANDARD_POSITIONS).map(([name, value]) => [
      name,
      { ...value, name, compatibleBodyParts: [...value.compatibleBodyParts] },
    ])
  ) as Record<string, PunishmentPosition>,
  minStrikes: 10,
  maxStrikes: 30,
  step: 5,
  maxTakeoffFailures: 5,
  doublePunishmentChance: 20,
}

const KO_STANDARD_TOOLS = {
  '손바닥': { intensity: 2, ratio: 8 },
  '자': { intensity: 3, ratio: 8 },
  '나무판자': { intensity: 5, ratio: 8 },
  '회초리': { intensity: 7, ratio: 8 },
  '계척': { intensity: 5, ratio: 8 },
  '빨간 스팽커': { intensity: 7, ratio: 8 },
  '초록 스팽커': { intensity: 7, ratio: 8 },
  '글루스틱': { intensity: 9, ratio: 6 },
  '충전 케이블': { intensity: 9, ratio: 8 },
  '헤어브러시': { intensity: 5, ratio: 8 },
  '가죽 패들': { intensity: 7, ratio: 8 },
  '아크릴판': { intensity: 7, ratio: 6 },
} as const

const KO_STANDARD_BODY_PARTS = {
  '엉덩이': { sensitivity: 10, ratio: 80 },
  '등': { sensitivity: 7, ratio: 5 },
  '허벅지': { sensitivity: 5, ratio: 5 },
  '엉덩이 골': { sensitivity: 2, ratio: 5 },
  '손바닥': { sensitivity: 2, ratio: 5 },
} as const

const KO_STANDARD_POSITIONS = {
  '서있기': { ratio: 20, compatibleBodyParts: ['엉덩이', '등', '허벅지', '엉덩이 골', '손바닥'] },
  '벽 짚기': { ratio: 20, compatibleBodyParts: ['엉덩이', '등', '허벅지', '엉덩이 골'] },
  '책상에 엎드리기': { ratio: 20, compatibleBodyParts: ['엉덩이', '등', '허벅지', '엉덩이 골'] },
  '무릎 잡기': { ratio: 20, compatibleBodyParts: ['엉덩이', '허벅지', '엉덩이 골'] },
  '네발로 엎드리기': { ratio: 20, compatibleBodyParts: ['엉덩이', '등', '허벅지', '엉덩이 골'] },
} as const

const KO_STANDARD_TRAPS: TrapAction[] = [
  { name: '엉덩이 노출 함정', description: '5분 동안 엉덩이 노출하기' },
  { name: '랜덤 체벌 함정', description: '이전에 벌을 받은 플레이어가 임의의 도구로 엉덩이를 때림. "제 엉덩이를 때려주세요"라고 큰 소리로 부탁해야 함' },
]

const KO_PARTY_TRAPS: TrapAction[] = [
  { name: '엉덩이 노출 함정', description: '5분 동안 엉덩이 노출하기', trapVariant: 'text' },
  { name: '체벌 부탁 함정', description: '"제 엉덩이를 때려주세요"라고 큰 소리로 부탁해야 함', trapVariant: 'text' },
  { name: '전원 함정', description: '모두 일렬로 서고, 함정을 밟은 사람이 차례대로 손바닥으로 모두의 엉덩이를 3번씩 때림', trapVariant: 'all_players' },
  { name: '전원 가위바위보', description: '모두 반사신경 테스트 참여. 가장 빠른 사람은 체벌 1회 면제', trapVariant: 'mini_game_reaction' },
  { name: '카드 뒤집기', description: '3개의 그림 순서를 기억하기. 실패한 사람은 다음 체벌이 두 배가 됨', trapVariant: 'mini_game_memory' },
]

const KO_PARTY_QA_QUESTIONS = {
  warmup: [
    '당신의 세이프워드는 무엇인가요?',
    '가장 좋아하는 도구는 무엇인가요?',
    '처음 SP를 접한 것은 언제인가요?',
    '맞을 때 소리를 내는 편인가요?',
    '아픔과 미지에 대한 공포 중 어느 것이 더 두렵나요?',
    '견딜 수 있는 도구의 한계는 어디까지인가요?',
    '계속 해보고 싶었지만 아직 못해본 자세가 있나요?',
    '체벌을 기다리는 것과 맞는 것 중 어느 것이 더 괴로운가요?',
  ],
  heating: [
    '가장 기억에 남는 체벌 경험을 설명해주세요',
    '절대 받아들일 수 없는 플레이가 있나요?',
    '엉덩이를 맞고 운 적이 있나요? 어떤 상황이었나요?',
    '벌을 받기 위해 서 있거나 무릎 꿇은 적이 있나요? 기분이 어땠나요?',
    '체벌 후 애프터케어는 보통 얼마나 필요한가요?',
    '도중에 세이프워드를 쓰고 싶었던 순간이 있었나요?',
    '체벌 전 "훈계"가 필요하다고 생각하나요?',
  ],
  finale: [
    '하나만 고를 수 있다면, 때리는 쪽과 맞는 쪽 중 어느 쪽이 좋나요?',
    '당신이 이상적으로 생각하는 SP 관계는 어떤 모습인가요?',
    'SP가 일상의 일부가 되었으면 하나요?',
    '파트너를 위해 타협할 수 있는 최대 한계는 어디까지인가요?',
    '순수한 통각과 의식적인 느낌 중 어느 것을 더 중요하게 생각하나요?',
    '머릿속으로 가장 많이 상상해본 상황을 설명해주세요',
  ],
} as const

const KO_PARTY_DARE_INSTRUCTIONS = {
  warmup: [
    '눈을 감고, 누군가 임의의 도구로 손등을 살짝 터치하게 한 후 도구를 맞추기',
    '맞아서 아플 때의 표정을 흉내내고 10초간 유지하기',
    '왼쪽 사람의 어깨를 30초 동안 주물러주기',
    '가장 엄격한 말투로 오른쪽 사람에게 "이리 와서 맞으세요!"라고 말하기',
    '일어나서 표준적인 체벌 자세를 시연하고 15초간 유지하기',
  ],
  heating: [
    '오른쪽 사람에게 다음 턴의 체벌 자세를 지정해달라고 하기',
    '눈을 감고 손바닥을 내밀면, 누군가 3번 때리고 누가 때렸는지 맞추기',
    '한 사람을 선택해서 30초 동안 눈을 맞추기 (웃으면 안 됨)',
    '모두가 만족할 때까지 용서를 구하는 연기하기',
    '오른쪽 사람과 보드판의 위치를 바꾸기',
  ],
  finale: [
    '모두 투표로 이번 게임에서 가장 고통을 잘 참은 사람 뽑기',
    '한 사람을 선택해서, 가장 좋아하는 도구로 손등을 살짝 5번 때리기',
    '정식으로 체벌 요청하기: 어떤 도구로 어디를 맞고 싶은지 큰 소리로 말하기',
    '손바닥을 내밀고 왼쪽 사람에게 3번 맞기 (피하면 안 됨)',
    '현실에서 경험하고 싶은 체벌 상황을 설명하고, 지금 당장 실행할지 모두 투표하기',
  ],
} as const

const KO_STANDARD_PUNISHMENT_CONFIG: PunishmentConfig = {
  tools: Object.fromEntries(
    Object.entries(KO_STANDARD_TOOLS).map(([name, value]) => [name, { ...value, name }])
  ),
  bodyParts: Object.fromEntries(
    Object.entries(KO_STANDARD_BODY_PARTS).map(([name, value]) => [name, { ...value, name }])
  ),
  positions: Object.fromEntries(
    Object.entries(KO_STANDARD_POSITIONS).map(([name, value]) => [
      name,
      { ...value, name, compatibleBodyParts: [...value.compatibleBodyParts] },
    ])
  ) as Record<string, PunishmentPosition>,
  minStrikes: 10,
  maxStrikes: 30,
  step: 5,
  maxTakeoffFailures: 5,
  doublePunishmentChance: 20,
}

const JA_LOCALE_CONTENT: LocaleContent = {
  punishmentConfig: JA_STANDARD_PUNISHMENT_CONFIG,
  standardTraps: JA_STANDARD_TRAPS,
  partyTraps: JA_PARTY_TRAPS,
  partyQaQuestions: JA_PARTY_QA_QUESTIONS,
  partyDareInstructions: JA_PARTY_DARE_INSTRUCTIONS,
  defaultPlayerName: (index: number) => \`プレイヤー\${index + 1}\`,
}

const KO_LOCALE_CONTENT: LocaleContent = {
  punishmentConfig: KO_STANDARD_PUNISHMENT_CONFIG,
  standardTraps: KO_STANDARD_TRAPS,
  partyTraps: KO_PARTY_TRAPS,
  partyQaQuestions: KO_PARTY_QA_QUESTIONS,
  partyDareInstructions: KO_PARTY_DARE_INSTRUCTIONS,
  defaultPlayerName: (index: number) => \`플레이어 \${index + 1}\`,
}

`

const path = 'packages/game-core/src/sharedConfig.ts'
let content = fs.readFileSync(path, 'utf8')

// replace getLocaleContent
const originalFunc = `export function getLocaleContent(language: string): LocaleContent {
  const normalized = language.toLowerCase()
  if (normalized.startsWith('zh')) return ZH_LOCALE_CONTENT
  return EN_LOCALE_CONTENT
}`
const newFunc = `export function getLocaleContent(language: string): LocaleContent {
  const normalized = language.toLowerCase()
  if (normalized.startsWith('zh')) return ZH_LOCALE_CONTENT
  if (normalized.startsWith('ja')) return JA_LOCALE_CONTENT
  if (normalized.startsWith('ko')) return KO_LOCALE_CONTENT
  return EN_LOCALE_CONTENT
}`

if (!content.includes(newFunc)) {
  content = content.replace(originalFunc, newFunc)
  const insertIndex = content.indexOf('/**\n * Returns the appropriate locale content')
  content = content.slice(0, insertIndex) + jaContent + content.slice(insertIndex)
  fs.writeFileSync(path, content)
}
