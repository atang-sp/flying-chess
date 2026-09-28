import { describe, it, expect } from 'vitest'
import {
  localizeToolName,
  localizeBodyPartName,
  localizePositionName,
  localizePunishmentDescription,
} from '../utils/punishmentLocalization'
import type { PunishmentAction } from '@flying-chess/game-core/types'

describe('punishmentLocalization', () => {
  it('translates default tools across languages', () => {
    // Chinese to English
    expect(localizeToolName('尺子', 'en')).toBe('Ruler')
    expect(localizeToolName('手掌', 'en')).toBe('Hand')
    expect(localizeToolName('木板', 'en')).toBe('Paddle')

    // Chinese to Japanese
    expect(localizeToolName('尺子', 'ja')).toBe('定規')
    expect(localizeToolName('手掌', 'ja')).toBe('平手')

    // Chinese to Korean
    expect(localizeToolName('尺子', 'ko')).toBe('자')
    expect(localizeToolName('手掌', 'ko')).toBe('손바닥')

    // Chinese to Spanish
    expect(localizeToolName('尺子', 'es')).toBe('Regla')

    // English to Chinese
    expect(localizeToolName('Ruler', 'zh')).toBe('尺子')
    expect(localizeToolName('Hand', 'zh')).toBe('手掌')

    // English to Japanese
    expect(localizeToolName('Ruler', 'ja')).toBe('定規')

    // Preserves custom names
    expect(localizeToolName('特制鸡毛掸子', 'en')).toBe('特制鸡毛掸子')
    expect(localizeToolName('Custom Whip', 'zh')).toBe('Custom Whip')
  })

  it('translates default body parts across languages', () => {
    // Chinese to English
    expect(localizeBodyPartName('屁股', 'en')).toBe('Bottom')
    expect(localizeBodyPartName('臀部', 'en')).toBe('Bottom') // alias
    expect(localizeBodyPartName('后背', 'en')).toBe('Thighs')

    // Chinese to Japanese
    expect(localizeBodyPartName('屁股', 'ja')).toBe('お尻')

    // Chinese to Korean
    expect(localizeBodyPartName('屁股', 'ko')).toBe('엉덩이')

    // English to Chinese
    expect(localizeBodyPartName('Bottom', 'zh')).toBe('屁股')

    // Preserves custom names
    expect(localizeBodyPartName('小腿', 'en')).toBe('小腿')
  })

  it('translates default positions across languages', () => {
    // Chinese to English
    expect(localizePositionName('跪趴', 'en')).toBe('Over-the-knee (OTK)')
    expect(localizePositionName('站立', 'en')).toBe('Standing')
    expect(localizePositionName('手扶墙', 'en')).toBe('Hands on wall')
    expect(localizePositionName('趴在桌子上', 'en')).toBe('Bent over a table')

    // Chinese to Japanese
    expect(localizePositionName('跪趴', 'ja')).toBe('四つん這い')

    // Chinese to Spanish
    expect(localizePositionName('跪趴', 'es')).toBe('A gatas')

    // English to Chinese
    expect(localizePositionName('Over-the-knee (OTK)', 'zh')).toBe('跪趴')
  })

  it('generates localized punishment description', () => {
    const punishment: PunishmentAction = {
      tool: { name: '尺子', intensity: 3, ratio: 8 },
      bodyPart: { name: '屁股', sensitivity: 10, ratio: 80 },
      position: { name: '跪趴', ratio: 20, compatibleBodyParts: ['屁股'] },
      strikes: 15,
      description: '用尺子打屁股15下，姿势：跪趴',
    }

    // English description
    expect(localizePunishmentDescription(punishment, 'en')).toBe(
      'Use Ruler on Bottom for 15 strikes, position: Over-the-knee (OTK)'
    )

    // Japanese description
    expect(localizePunishmentDescription(punishment, 'ja')).toBe(
      '定規でお仕置き：お尻を15回、姿勢：四つん這い'
    )

    // Korean description
    expect(localizePunishmentDescription(punishment, 'ko')).toBe(
      '자(으)로 엉덩이 15대, 자세: 네발로 엎드리기'
    )

    // Chinese description
    expect(localizePunishmentDescription(punishment, 'zh')).toBe('用尺子打屁股15下，姿势：跪趴')
  })

  it('handles dynamic multipliers and targeted players', () => {
    const punishment: PunishmentAction = {
      tool: { name: '尺子', intensity: 3, ratio: 8 },
      bodyPart: { name: '屁股', sensitivity: 10, ratio: 80 },
      position: { name: '跪趴', ratio: 20, compatibleBodyParts: ['屁股'] },
      dynamicType: 'dice_multiplier',
      multiplier: 2,
      targetPlayer: 'previous',
      description: '上一个玩家：用尺子打屁股，姿势：跪趴（骰子点数×2）',
    }

    expect(localizePunishmentDescription(punishment, 'en')).toBe(
      'Previous player: Use Ruler on Bottom, position: Over-the-knee (OTK) (Dice roll × 2)'
    )
  })
})
