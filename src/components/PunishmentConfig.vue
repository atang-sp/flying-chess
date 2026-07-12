<script setup lang="ts">
  import { ref, watch, nextTick, computed } from 'vue'
  import { Settings, Target, ChevronRight, Minus, Plus, RotateCcw } from '@lucide/vue'
  import type {
    PunishmentConfig,
    PunishmentTool,
    PunishmentBodyPart,
    PunishmentPosition,
  } from '../types/game'
  import { GameService } from '../services/gameService'
  import ConfigErrorModal from './ConfigErrorModal.vue'
  import RatioDistributor from './RatioDistributor.vue'
  import type { RatioItem } from './RatioDistributor.vue'

  interface Props {
    config: PunishmentConfig
  }

  interface Emits {
    (e: 'update', config: PunishmentConfig): void
    (e: 'validation-failed', errorMessage: string, requiredSensitivity?: number): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  const localConfig = ref<PunishmentConfig>({ ...props.config })

  watch(
    () => props.config,
    newConfig => {
      localConfig.value = { ...newConfig }
    },
    { deep: true, immediate: true }
  )

  const showErrorModal = ref(false)
  const errorMessage = ref('')
  const requiredSensitivity = ref<number>()

  const newToolName = ref('')
  const newToolIntensity = ref(5)
  const newBodyPartName = ref('')
  const newBodyPartSensitivity = ref(5)
  const newPositionName = ref('')

  const toolDistributorRef = ref<InstanceType<typeof RatioDistributor>>()
  const bodyPartDistributorRef = ref<InstanceType<typeof RatioDistributor>>()
  const positionDistributorRef = ref<InstanceType<typeof RatioDistributor>>()

  // Computed arrays for RatioDistributor
  const toolItems = computed<RatioItem[]>(() => Object.values(localConfig.value.tools))
  const bodyPartItems = computed<RatioItem[]>(() => Object.values(localConfig.value.bodyParts))
  const positionItems = computed<RatioItem[]>(() => Object.values(localConfig.value.positions))

  const closeErrorModal = () => {
    showErrorModal.value = false
  }

  function showError(validation: { errorMessage?: string; requiredSensitivity?: number }) {
    errorMessage.value = validation.errorMessage || '配置验证失败'
    requiredSensitivity.value = validation.requiredSensitivity
    showErrorModal.value = true
    emit('validation-failed', validation.errorMessage!, validation.requiredSensitivity)
  }

  // --- Ratio auto-distribution ---
  function autoDistributeRatio(list: { ratio: number }[], changedIdx: number, newValue: number) {
    const n = list.length
    if (n === 1) {
      list[0].ratio = 100
      return
    }

    newValue = Math.max(0, Math.min(100, newValue))

    let sumBefore = 0
    for (let i = 0; i < changedIdx; i++) {
      sumBefore += list[i].ratio
    }

    const availableRatio = 100 - sumBefore
    if (newValue > availableRatio) {
      newValue = availableRatio
    }

    list[changedIdx].ratio = newValue

    const remainingRatio = availableRatio - newValue
    const afterCount = n - changedIdx - 1

    if (afterCount > 0) {
      const baseRatio = Math.floor(remainingRatio / afterCount)
      const remainder = remainingRatio % afterCount

      for (let i = changedIdx + 1; i < n; i++) {
        if (i === n - 1) {
          list[i].ratio = baseRatio + remainder
        } else {
          list[i].ratio = baseRatio
        }
      }
    } else if (afterCount === 0) {
      list[changedIdx].ratio = 100 - sumBefore
    }
  }

  function validateAndEmit(originalConfig: PunishmentConfig): boolean {
    const validation = GameService.validatePunishmentConfig(localConfig.value)
    if (validation.isValid) {
      emit('update', localConfig.value)
      return true
    } else {
      localConfig.value = originalConfig
      showError(validation)
      return false
    }
  }

  // --- Tool handlers ---
  const onToolRatioUpdate = (idx: number, value: number) => {
    const originalConfig = JSON.parse(JSON.stringify(localConfig.value))
    const toolsArray = Object.values(localConfig.value.tools)
    autoDistributeRatio(toolsArray, idx, value)
    validateAndEmit(originalConfig)
  }

  const updateToolIntensity = (toolName: string, newIntensity: number) => {
    const tool = localConfig.value.tools[toolName]
    if (tool && newIntensity >= 1 && newIntensity <= 10) {
      const originalIntensity = tool.intensity
      tool.intensity = newIntensity

      const validation = GameService.validatePunishmentConfig(localConfig.value)
      if (validation.isValid) {
        emit('update', localConfig.value)
      } else {
        tool.intensity = originalIntensity
        showError(validation)
      }
    }
  }

  const removeTool = async (toolName: string) => {
    const originalConfig = JSON.parse(JSON.stringify(localConfig.value))
    if (toolName in localConfig.value.tools) {
      delete localConfig.value.tools[toolName]

      const toolsArray = Object.values(localConfig.value.tools)
      if (toolsArray.length > 0) {
        autoDistributeRatio(toolsArray, 0, toolsArray[0].ratio)
      }

      const validation = GameService.validatePunishmentConfig(localConfig.value)
      if (validation.isValid) {
        emit('update', localConfig.value)
      } else {
        await nextTick()
        localConfig.value = originalConfig
        showError(validation)
      }
    }
  }

  const addTool = async () => {
    if (newToolName.value.trim()) {
      const toolName = newToolName.value.trim()
      if (toolName in localConfig.value.tools) return

      const originalConfig = JSON.parse(JSON.stringify(localConfig.value))
      const toolsArray = Object.values(localConfig.value.tools)
      const n = toolsArray.length + 1
      const ratio = 100 / n

      toolsArray.forEach(t => (t.ratio = ratio))

      const newTool: PunishmentTool = {
        name: toolName,
        intensity: Math.max(1, Math.min(10, newToolIntensity.value)),
        ratio,
      }

      localConfig.value.tools[toolName] = newTool

      if (validateAndEmit(originalConfig)) {
        newToolName.value = ''
        newToolIntensity.value = 5
        toolDistributorRef.value?.closeAddForm()
      }
    }
  }

  const equalDistributeTools = () => {
    const originalConfig = JSON.parse(JSON.stringify(localConfig.value))
    const toolsArray = Object.values(localConfig.value.tools)
    const ratio = Math.floor(100 / toolsArray.length)
    const remainder = 100 - ratio * toolsArray.length
    toolsArray.forEach((t, i) => {
      t.ratio = i === toolsArray.length - 1 ? ratio + remainder : ratio
    })
    validateAndEmit(originalConfig)
  }

  // --- Body part handlers ---
  const onBodyPartRatioUpdate = (idx: number, value: number) => {
    const originalConfig = JSON.parse(JSON.stringify(localConfig.value))
    const bodyPartsArray = Object.values(localConfig.value.bodyParts)
    autoDistributeRatio(bodyPartsArray, idx, value)
    validateAndEmit(originalConfig)
  }

  const updateBodyPartSensitivity = (bodyPartName: string, newSensitivity: number) => {
    const bodyPart = localConfig.value.bodyParts[bodyPartName]
    if (bodyPart && newSensitivity >= 1 && newSensitivity <= 10) {
      const originalSensitivity = bodyPart.sensitivity
      bodyPart.sensitivity = newSensitivity

      const validation = GameService.validatePunishmentConfig(localConfig.value)
      if (validation.isValid) {
        emit('update', localConfig.value)
      } else {
        bodyPart.sensitivity = originalSensitivity
        showError(validation)
      }
    }
  }

  const removeBodyPart = async (bodyPartName: string) => {
    const originalConfig = JSON.parse(JSON.stringify(localConfig.value))
    if (bodyPartName in localConfig.value.bodyParts) {
      delete localConfig.value.bodyParts[bodyPartName]

      const bodyPartsArray = Object.values(localConfig.value.bodyParts)
      if (bodyPartsArray.length > 0) {
        autoDistributeRatio(bodyPartsArray, 0, bodyPartsArray[0].ratio)
      }

      const validation = GameService.validatePunishmentConfig(localConfig.value)
      if (validation.isValid) {
        emit('update', localConfig.value)
      } else {
        await nextTick()
        localConfig.value = originalConfig
        showError(validation)
      }
    }
  }

  const addBodyPart = async () => {
    if (newBodyPartName.value.trim()) {
      const bodyPartName = newBodyPartName.value.trim()
      if (bodyPartName in localConfig.value.bodyParts) return

      const originalConfig = JSON.parse(JSON.stringify(localConfig.value))
      const bodyPartsArray = Object.values(localConfig.value.bodyParts)
      const n = bodyPartsArray.length + 1
      const ratio = 100 / n

      bodyPartsArray.forEach(b => (b.ratio = ratio))

      const newBodyPart: PunishmentBodyPart = {
        name: bodyPartName,
        sensitivity: Math.max(1, Math.min(10, newBodyPartSensitivity.value)),
        ratio,
      }

      localConfig.value.bodyParts[bodyPartName] = newBodyPart

      if (validateAndEmit(originalConfig)) {
        newBodyPartName.value = ''
        newBodyPartSensitivity.value = 5
        bodyPartDistributorRef.value?.closeAddForm()
      }
    }
  }

  const equalDistributeBodyParts = () => {
    const originalConfig = JSON.parse(JSON.stringify(localConfig.value))
    const arr = Object.values(localConfig.value.bodyParts)
    const ratio = Math.floor(100 / arr.length)
    const remainder = 100 - ratio * arr.length
    arr.forEach((b, i) => {
      b.ratio = i === arr.length - 1 ? ratio + remainder : ratio
    })
    validateAndEmit(originalConfig)
  }

  // --- Position handlers ---
  const onPositionRatioUpdate = (idx: number, value: number) => {
    const originalConfig = JSON.parse(JSON.stringify(localConfig.value))
    const positionsArray = Object.values(localConfig.value.positions)
    autoDistributeRatio(positionsArray, idx, value)
    validateAndEmit(originalConfig)
  }

  const removePosition = async (positionName: string) => {
    const originalConfig = JSON.parse(JSON.stringify(localConfig.value))
    if (positionName in localConfig.value.positions) {
      delete localConfig.value.positions[positionName]

      const positionsArray = Object.values(localConfig.value.positions)
      if (positionsArray.length > 0) {
        autoDistributeRatio(positionsArray, 0, positionsArray[0].ratio)
      }

      const validation = GameService.validatePunishmentConfig(localConfig.value)
      if (validation.isValid) {
        emit('update', localConfig.value)
      } else {
        await nextTick()
        localConfig.value = originalConfig
        showError(validation)
      }
    }
  }

  const addPosition = async () => {
    if (newPositionName.value.trim()) {
      const positionName = newPositionName.value.trim()
      if (positionName in localConfig.value.positions) return

      const originalConfig = JSON.parse(JSON.stringify(localConfig.value))
      const positionsArray = Object.values(localConfig.value.positions)
      const n = positionsArray.length + 1
      const ratio = 100 / n

      positionsArray.forEach(p => (p.ratio = ratio))

      const newPosition: PunishmentPosition = {
        name: positionName,
        ratio,
        compatibleBodyParts: Object.keys(localConfig.value.bodyParts),
      }

      localConfig.value.positions[positionName] = newPosition

      if (validateAndEmit(originalConfig)) {
        newPositionName.value = ''
        positionDistributorRef.value?.closeAddForm()
      }
    }
  }

  const equalDistributePositions = () => {
    const originalConfig = JSON.parse(JSON.stringify(localConfig.value))
    const arr = Object.values(localConfig.value.positions)
    const ratio = Math.floor(100 / arr.length)
    const remainder = 100 - ratio * arr.length
    arr.forEach((p, i) => {
      p.ratio = i === arr.length - 1 ? ratio + remainder : ratio
    })
    validateAndEmit(originalConfig)
  }

  const isBodyPartCompatible = (position: PunishmentPosition, bodyPartName: string): boolean => {
    if (!position.compatibleBodyParts || position.compatibleBodyParts.length === 0) {
      return true
    }
    return position.compatibleBodyParts.includes(bodyPartName)
  }

  const toggleCompatibleBodyPart = async (positionName: string, bodyPartName: string) => {
    const position = localConfig.value.positions[positionName]
    if (!position) return

    const originalConfig = JSON.parse(JSON.stringify(localConfig.value))

    if (!position.compatibleBodyParts || position.compatibleBodyParts.length === 0) {
      const allNames = Object.values(localConfig.value.bodyParts).map(bp => bp.name)
      position.compatibleBodyParts = allNames.filter(n => n !== bodyPartName)
    } else {
      const idx = position.compatibleBodyParts.indexOf(bodyPartName)
      if (idx >= 0) {
        position.compatibleBodyParts.splice(idx, 1)
      } else {
        position.compatibleBodyParts.push(bodyPartName)
      }
    }

    const validation = GameService.validatePunishmentConfig(localConfig.value)
    if (validation.isValid) {
      emit('update', localConfig.value)
    } else {
      localConfig.value = originalConfig
      showError(validation)
    }
  }

  // --- Quantity handlers ---
  const updateMinStrikes = (newValue: number) => {
    const originalConfig = JSON.parse(JSON.stringify(localConfig.value))
    localConfig.value.minStrikes = Math.max(5, newValue)
    if (localConfig.value.minStrikes > localConfig.value.maxStrikes) {
      localConfig.value.maxStrikes = localConfig.value.minStrikes
    }
    validateAndEmit(originalConfig)
  }

  const updateMaxStrikes = (newValue: number) => {
    const originalConfig = JSON.parse(JSON.stringify(localConfig.value))
    localConfig.value.maxStrikes = Math.max(localConfig.value.minStrikes, newValue)
    validateAndEmit(originalConfig)
  }

  const updateMaxTakeoffFailures = (newValue: number) => {
    const originalConfig = JSON.parse(JSON.stringify(localConfig.value))
    localConfig.value.maxTakeoffFailures = Math.max(1, newValue)
    validateAndEmit(originalConfig)
  }

  const updateDoublePunishmentChance = (newValue: number) => {
    localConfig.value.doublePunishmentChance = Math.max(0, Math.min(50, newValue))
    emit('update', localConfig.value)
  }

  const resetToDefault = async () => {
    const originalConfig = JSON.parse(JSON.stringify(localConfig.value))
    const defaultConfig = GameService.createPunishmentConfig()
    localConfig.value = defaultConfig
    validateAndEmit(originalConfig)
  }
</script>

<template>
  <div class="punishment-config glass-card">
    <div class="config-header">
      <h3>
        <Settings :size="22" />
        惩罚设置
      </h3>
    </div>

    <div class="config-sections">
      <!-- 工具设置 -->
      <RatioDistributor
        ref="toolDistributorRef"
        :items="toolItems"
        title="工具设置"
        :icon="Settings"
        :hue-offset="0"
        @update:ratio="onToolRatioUpdate"
        @remove="removeTool"
        @equal-distribute="equalDistributeTools"
      >
        <template #detail="{ item }">
          <div class="detail-stat-row">
            <span class="detail-stat-label">强度</span>
            <div class="detail-stat-controls">
              <button
                :disabled="item.intensity <= 1"
                class="btn-stat"
                @click="updateToolIntensity(item.name, item.intensity - 1)"
              >
                <Minus :size="14" />
              </button>
              <span class="detail-stat-value">{{ item.intensity }}/10</span>
              <button
                :disabled="item.intensity >= 10"
                class="btn-stat"
                @click="updateToolIntensity(item.name, item.intensity + 1)"
              >
                <Plus :size="14" />
              </button>
            </div>
          </div>
        </template>

        <template #add-form="{ close }">
          <div class="add-form-content">
            <div class="add-form-row">
              <input v-model="newToolName" placeholder="工具名称" class="input-field" />
              <input
                v-model.number="newToolIntensity"
                type="number"
                min="1"
                max="10"
                class="input-mini"
                placeholder="强度"
              />
            </div>
            <div class="add-form-actions">
              <button :disabled="!newToolName.trim()" class="btn-confirm" @click="addTool">
                <Plus :size="14" />
                添加
              </button>
              <button class="btn-cancel" @click="close">取消</button>
            </div>
          </div>
        </template>
      </RatioDistributor>

      <!-- 部位设置 -->
      <RatioDistributor
        ref="bodyPartDistributorRef"
        :items="bodyPartItems"
        title="部位设置"
        :icon="Target"
        :hue-offset="120"
        @update:ratio="onBodyPartRatioUpdate"
        @remove="removeBodyPart"
        @equal-distribute="equalDistributeBodyParts"
      >
        <template #detail="{ item }">
          <div class="detail-stat-row">
            <span class="detail-stat-label">耐受度</span>
            <div class="detail-stat-controls">
              <button
                :disabled="item.sensitivity <= 1"
                class="btn-stat"
                @click="updateBodyPartSensitivity(item.name, item.sensitivity - 1)"
              >
                <Minus :size="14" />
              </button>
              <span class="detail-stat-value">{{ item.sensitivity }}/10</span>
              <button
                :disabled="item.sensitivity >= 10"
                class="btn-stat"
                @click="updateBodyPartSensitivity(item.name, item.sensitivity + 1)"
              >
                <Plus :size="14" />
              </button>
            </div>
          </div>
        </template>

        <template #add-form="{ close }">
          <div class="add-form-content">
            <div class="add-form-row">
              <input v-model="newBodyPartName" placeholder="部位名称" class="input-field" />
              <input
                v-model.number="newBodyPartSensitivity"
                type="number"
                min="1"
                max="10"
                class="input-mini"
                placeholder="耐受度"
              />
            </div>
            <div class="add-form-actions">
              <button :disabled="!newBodyPartName.trim()" class="btn-confirm" @click="addBodyPart">
                <Plus :size="14" />
                添加
              </button>
              <button class="btn-cancel" @click="close">取消</button>
            </div>
          </div>
        </template>
      </RatioDistributor>

      <!-- 姿势设置 -->
      <RatioDistributor
        ref="positionDistributorRef"
        :items="positionItems"
        title="姿势设置"
        :icon="ChevronRight"
        :hue-offset="240"
        @update:ratio="onPositionRatioUpdate"
        @remove="removePosition"
        @equal-distribute="equalDistributePositions"
      >
        <template #detail="{ item }">
          <div class="detail-compatible-section">
            <span class="detail-stat-label">兼容部位</span>
            <div class="body-part-chips">
              <label
                v-for="bp in Object.values(localConfig.bodyParts)"
                :key="bp.name"
                class="chip-label"
                :class="{ active: isBodyPartCompatible(item as PunishmentPosition, bp.name) }"
              >
                <input
                  type="checkbox"
                  :checked="isBodyPartCompatible(item as PunishmentPosition, bp.name)"
                  @change="toggleCompatibleBodyPart(item.name, bp.name)"
                />
                {{ bp.name }}
              </label>
            </div>
          </div>
        </template>

        <template #add-form="{ close }">
          <div class="add-form-content">
            <div class="add-form-row">
              <input v-model="newPositionName" placeholder="姿势名称" class="input-field" />
            </div>
            <div class="add-form-actions">
              <button :disabled="!newPositionName.trim()" class="btn-confirm" @click="addPosition">
                <Plus :size="14" />
                添加
              </button>
              <button class="btn-cancel" @click="close">取消</button>
            </div>
          </div>
        </template>
      </RatioDistributor>

      <!-- 惩罚数量设置 -->
      <div class="quantity-section">
        <div class="quantity-header">
          <Settings :size="18" />
          <h4>惩罚数量设置</h4>
        </div>
        <div class="quantity-grid">
          <div class="quantity-cell">
            <span class="quantity-label">最小次数</span>
            <div class="quantity-controls">
              <button
                :disabled="localConfig.minStrikes <= 5"
                class="btn-stat"
                @click="updateMinStrikes(localConfig.minStrikes - 5)"
              >
                <Minus :size="14" />
              </button>
              <span class="quantity-value">{{ localConfig.minStrikes }}</span>
              <button
                :disabled="localConfig.minStrikes >= localConfig.maxStrikes"
                class="btn-stat"
                @click="updateMinStrikes(localConfig.minStrikes + 5)"
              >
                <Plus :size="14" />
              </button>
            </div>
          </div>

          <div class="quantity-cell">
            <span class="quantity-label">最大次数</span>
            <div class="quantity-controls">
              <button
                :disabled="localConfig.maxStrikes <= localConfig.minStrikes"
                class="btn-stat"
                @click="updateMaxStrikes(localConfig.maxStrikes - 5)"
              >
                <Minus :size="14" />
              </button>
              <span class="quantity-value">{{ localConfig.maxStrikes }}</span>
              <button
                :disabled="localConfig.maxStrikes >= 100"
                class="btn-stat"
                @click="updateMaxStrikes(localConfig.maxStrikes + 5)"
              >
                <Plus :size="14" />
              </button>
            </div>
          </div>

          <div class="quantity-cell">
            <span class="quantity-label">起飞失败上限</span>
            <div class="quantity-controls">
              <button
                :disabled="localConfig.maxTakeoffFailures <= 1"
                class="btn-stat"
                @click="updateMaxTakeoffFailures(localConfig.maxTakeoffFailures - 1)"
              >
                <Minus :size="14" />
              </button>
              <span class="quantity-value">{{ localConfig.maxTakeoffFailures }}</span>
              <button
                :disabled="localConfig.maxTakeoffFailures >= 10"
                class="btn-stat"
                @click="updateMaxTakeoffFailures(localConfig.maxTakeoffFailures + 1)"
              >
                <Plus :size="14" />
              </button>
            </div>
          </div>

          <div class="quantity-cell">
            <span class="quantity-label">翻倍概率</span>
            <div class="quantity-controls">
              <button
                :disabled="(localConfig.doublePunishmentChance ?? 0) <= 0"
                class="btn-stat"
                @click="updateDoublePunishmentChance((localConfig.doublePunishmentChance ?? 0) - 5)"
              >
                <Minus :size="14" />
              </button>
              <span class="quantity-value">{{ localConfig.doublePunishmentChance ?? 0 }}%</span>
              <button
                :disabled="(localConfig.doublePunishmentChance ?? 0) >= 50"
                class="btn-stat"
                @click="updateDoublePunishmentChance((localConfig.doublePunishmentChance ?? 0) + 5)"
              >
                <Plus :size="14" />
              </button>
            </div>
          </div>
        </div>
        <div class="quantity-summary">
          {{ localConfig.minStrikes }} - {{ localConfig.maxStrikes }} 次随机
        </div>
      </div>
    </div>

    <div class="config-actions">
      <button class="btn btn-secondary" @click="resetToDefault">
        <RotateCcw :size="16" />
        <span class="btn-text">重置默认</span>
      </button>
    </div>

    <ConfigErrorModal
      :show="showErrorModal"
      :error-message="errorMessage"
      :required-sensitivity="requiredSensitivity"
      @close="closeErrorModal"
    />
  </div>
</template>

<style scoped>
  .punishment-config {
    margin-bottom: 1rem;
  }

  .punishment-config:hover {
    border-color: rgba(255, 255, 255, 0.1);
  }

  .config-header {
    text-align: center;
    margin-bottom: 1.2rem;
  }

  .config-header h3 {
    margin: 0;
    color: var(--text-primary);
    font-size: 1.3rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .config-sections {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.2rem;
  }

  /* Detail slot styling */
  .detail-stat-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .detail-stat-label {
    font-size: 0.8rem;
    color: var(--text-secondary);
    min-width: 42px;
  }

  .detail-stat-controls {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .btn-stat {
    width: 24px;
    height: 24px;
    border: var(--glass-border);
    background: var(--bg-secondary);
    color: var(--text-primary);
    border-radius: var(--radius-sm);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-fast);
  }

  .btn-stat:hover:not(:disabled) {
    background: var(--bg-glass-hover);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .btn-stat:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .detail-stat-value {
    min-width: 30px;
    text-align: center;
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--text-primary);
  }

  /* Compatible body parts chips */
  .detail-compatible-section {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .body-part-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }

  .chip-label {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    padding: 0.15rem 0.45rem;
    border: var(--glass-border);
    border-radius: var(--radius-full);
    font-size: 0.75rem;
    cursor: pointer;
    background: var(--bg-secondary);
    color: var(--text-secondary);
    transition: all var(--transition-fast);
    user-select: none;
  }

  .chip-label input[type='checkbox'] {
    display: none;
  }

  .chip-label.active {
    background: rgba(102, 126, 234, 0.25);
    color: var(--color-accent-light);
    border-color: rgba(102, 126, 234, 0.4);
  }

  .chip-label:hover {
    border-color: rgba(102, 126, 234, 0.3);
    background: var(--bg-glass-hover);
  }

  /* Add form styling */
  .add-form-content {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .add-form-row {
    display: flex;
    gap: 0.5rem;
  }

  .input-field {
    flex: 1;
    padding: 0.45rem 0.6rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: var(--text-primary);
    border-radius: var(--radius-sm);
    font-size: 0.85rem;
    outline: none;
    transition: border-color var(--transition-normal);
    font-family: inherit;
  }

  .input-field::placeholder {
    color: var(--text-muted);
  }

  .input-field:focus {
    border-color: var(--color-accent);
  }

  .input-mini {
    width: 55px;
    padding: 0.45rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: var(--text-primary);
    border-radius: var(--radius-sm);
    font-size: 0.85rem;
    text-align: center;
    outline: none;
    transition: border-color var(--transition-normal);
    font-family: inherit;
  }

  .input-mini::placeholder {
    color: var(--text-muted);
  }

  .input-mini:focus {
    border-color: var(--color-accent);
  }

  .add-form-actions {
    display: flex;
    gap: 0.4rem;
  }

  .btn-confirm {
    flex: 1;
    padding: 0.4rem 0.6rem;
    border: 1px solid rgba(102, 126, 234, 0.4);
    background: rgba(102, 126, 234, 0.2);
    color: var(--color-accent-light);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.3rem;
    transition: all var(--transition-normal);
  }

  .btn-confirm:hover:not(:disabled) {
    background: rgba(102, 126, 234, 0.3);
  }

  .btn-confirm:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .btn-cancel {
    padding: 0.4rem 0.6rem;
    border: var(--glass-border);
    background: var(--bg-secondary);
    color: var(--text-secondary);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 0.8rem;
    transition: all var(--transition-normal);
  }

  .btn-cancel:hover {
    background: var(--bg-glass-hover);
    color: var(--text-primary);
  }

  /* Quantity section - 2x2 grid */
  .quantity-section {
    border: var(--glass-border);
    border-radius: var(--radius-md);
    padding: 0.8rem;
    background: var(--bg-surface);
  }

  .quantity-header {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-bottom: 0.6rem;
    color: var(--text-primary);
  }

  .quantity-header h4 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
  }

  .quantity-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  .quantity-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    padding: 0.5rem;
    background: var(--bg-glass);
    border: var(--glass-border);
    border-radius: var(--radius-sm);
  }

  .quantity-label {
    font-size: 0.75rem;
    color: var(--text-secondary);
    font-weight: 500;
  }

  .quantity-controls {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .quantity-value {
    min-width: 32px;
    text-align: center;
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--color-warning);
  }

  .quantity-summary {
    text-align: center;
    padding: 0.4rem;
    margin-top: 0.5rem;
    background: rgba(245, 158, 11, 0.1);
    border-radius: var(--radius-sm);
    color: var(--color-warning);
    font-size: 0.8rem;
    border: 1px solid rgba(245, 158, 11, 0.25);
    font-weight: 600;
  }

  .config-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }

  .btn-text {
    font-weight: 600;
  }

  @media (max-width: 768px) {
    .config-header h3 {
      font-size: 1.2rem;
    }

    .config-sections {
      gap: 0.8rem;
    }

    .quantity-grid {
      gap: 0.4rem;
    }

    .quantity-cell {
      padding: 0.4rem;
    }

    .quantity-label {
      font-size: 0.7rem;
    }

    .quantity-value {
      font-size: 0.85rem;
    }

    .config-actions {
      flex-direction: column;
      gap: 0.8rem;
    }

    .config-actions .btn {
      width: 100%;
      max-width: min(300px, 80vw);
      justify-content: center;
    }
  }

  @media (max-width: 480px) {
    .config-header h3 {
      font-size: 1.1rem;
    }

    .config-sections {
      gap: 0.6rem;
    }

    .quantity-grid {
      grid-template-columns: 1fr;
      gap: 0.3rem;
    }

    .quantity-cell {
      flex-direction: row;
      justify-content: space-between;
      padding: 0.4rem 0.6rem;
    }

    .btn-stat {
      width: 22px;
      height: 22px;
    }

    .config-actions {
      gap: 0.6rem;
    }
  }
</style>
