import { ref } from 'vue'
import {
  getLocalAchievements,
  type LocalAchievement,
  type LocalProgress,
} from '../services/localProgress'

// Only local gameplay events enter this session. Loading/importing/cloud merging
// progress never celebrates historical achievements.
export function useAchievementSession() {
  const unlocked = ref<LocalAchievement[]>([])
  const pending = ref<LocalAchievement[]>([])

  const record = (before: LocalProgress, after: LocalProgress) => {
    const known = new Set([
      ...getLocalAchievements(before)
        .filter(item => item.unlocked)
        .map(item => item.id),
      ...unlocked.value.map(item => item.id),
    ])
    const additions = getLocalAchievements(after).filter(
      item => item.unlocked && !known.has(item.id)
    )
    unlocked.value.push(...additions)
    pending.value.push(...additions)
  }

  const reset = () => {
    unlocked.value = []
    pending.value = []
  }

  return { unlocked, pending, record, reset }
}
