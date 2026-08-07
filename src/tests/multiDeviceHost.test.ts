import { describe, expect, it } from 'vitest'
import { controllerMessageMatchesRequiredAction } from '../composables/useMultiDeviceHost'

describe('局域网手柄动作授权', () => {
  it('只允许玩家提交其当前私密投影要求的动作', () => {
    expect(
      controllerMessageMatchesRequiredAction(
        { type: 'reaction_decision', decision: 'mirror' },
        { type: 'predict', timeoutSeconds: 5 },
        false
      )
    ).toBe(false)
    expect(
      controllerMessageMatchesRequiredAction(
        { type: 'predict', prediction: 'high' },
        { type: 'predict', timeoutSeconds: 5 },
        false
      )
    ).toBe(true)
    expect(controllerMessageMatchesRequiredAction({ type: 'roll_dice' }, null, true)).toBe(true)
    expect(controllerMessageMatchesRequiredAction({ type: 'roll_dice' }, null, false)).toBe(false)
  })
})
