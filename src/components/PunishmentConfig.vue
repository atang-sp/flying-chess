<script setup lang="ts">
  import { ref, computed, watch, nextTick } from 'vue'
  import type {
    PunishmentConfig,
    PunishmentTool,
    PunishmentBodyPart,
    PunishmentPosition,
  } from '../types/game'
  import { GAME_CONFIG } from '../config/gameConfig'
  import { GameService } from '../services/gameService'
  import ConfigErrorModal from './ConfigErrorModal.vue'

  interface Props {
    config: PunishmentConfig
  }

  interface Emits {
    (e: 'update', config: PunishmentConfig): void
    (e: 'validation-failed', errorMessage: string, requiredSensitivity?: number): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  // 本地状态，避免直接修改props
  const localConfig = ref<PunishmentConfig>({ ...props.config })

  // 监听props变化，更新本地状态
  watch(
    () => props.config,
    newConfig => {
      localConfig.value = { ...newConfig }
    },
    { deep: true, immediate: true }
  )

  // 错误提示状态
  const showErrorModal = ref(false)
  const errorMessage = ref('')
  const requiredSensitivity = ref<number>()

  const newToolName = ref('')
  const newToolIntensity = ref(5)
  const newBodyPartName = ref('')
  const newBodyPartSensitivity = ref(5)
  const newPositionName = ref('')

  // 检查配置是否有效
  const isConfigValid = computed(() => {
    return (
      localConfig.value.tools.length > 0 &&
      localConfig.value.bodyParts.length > 0 &&
      localConfig.value.positions.length > 0
    )
  })

  // 验证配置并处理结果
  const validateAndUpdate = async (newConfig: PunishmentConfig) => {
    const validation = GameService.validatePunishmentConfig(newConfig)
    if (validation.isValid) {
      localConfig.value = newConfig
      emit('update', newConfig)
    } else {
      // 验证失败时，立即恢复本地状态到上一个有效状态
      localConfig.value = JSON.parse(JSON.stringify(props.config))

      // 等待DOM更新后显示错误提示
      await nextTick()

      // 显示错误提示
      errorMessage.value = validation.errorMessage || '配置验证失败'
      requiredSensitivity.value = validation.requiredSensitivity
      showErrorModal.value = true
      // 同时发送validation-failed事件给父组件
      emit('validation-failed', validation.errorMessage!, validation.requiredSensitivity)
    }
  }

  const closeErrorModal = () => {
    showErrorModal.value = false
  }

  const updateConfig = async () => {
    await validateAndUpdate(localConfig.value)
  }

  // 比例自动分配算法
  function autoDistributeRatio(list: { ratio: number }[], changedIdx: number, newValue: number) {
    const n = list.length
    if (n === 1) {
      list[0].ratio = 100
      return
    }

    // 限制新值在0~100之间
    newValue = Math.max(0, Math.min(100, newValue))

    // 计算当前选项之前的所有选项总和（这些保持不变）
    let sumBefore = 0
    for (let i = 0; i < changedIdx; i++) {
      sumBefore += list[i].ratio
    }

    // 计算当前选项和后续选项可用的总比例
    const availableRatio = 100 - sumBefore

    // 如果新值超过可用比例，限制新值
    if (newValue > availableRatio) {
      newValue = availableRatio
    }

    // 设置当前选项的比例
    list[changedIdx].ratio = newValue

    // 计算剩余比例
    const remainingRatio = availableRatio - newValue

    // 计算后续选项的数量
    const afterCount = n - changedIdx - 1

    if (afterCount > 0) {
      // 将剩余比例分配给后续选项
      const baseRatio = Math.floor(remainingRatio / afterCount)
      const remainder = remainingRatio % afterCount

      for (let i = changedIdx + 1; i < n; i++) {
        // 前面的选项获得基础比例，最后一个选项获得基础比例加余数
        if (i === n - 1) {
          list[i].ratio = baseRatio + remainder
        } else {
          list[i].ratio = baseRatio
        }
      }
    } else if (afterCount === 0) {
      // 如果没有后续选项，当前选项就是最后一个
      // 确保总和为100
      list[changedIdx].ratio = 100 - sumBefore
    }
  }

  const onToolRatioInput = async (idx: number, value: number) => {
    // 记录修改前的配置
    const originalConfig = JSON.parse(JSON.stringify(localConfig.value))

    // 先更新UI显示新值
    autoDistributeRatio(localConfig.value.tools, idx, value)

    // 验证配置
    const validation = GameService.validatePunishmentConfig(localConfig.value)
    if (validation.isValid) {
      // 配置有效，发送更新事件
      emit('update', localConfig.value)
    } else {
      // 配置无效，回退到修改前的值
      localConfig.value = originalConfig

      // 显示错误提示
      errorMessage.value = validation.errorMessage || '配置验证失败'
      requiredSensitivity.value = validation.requiredSensitivity
      showErrorModal.value = true
      emit('validation-failed', validation.errorMessage!, validation.requiredSensitivity)
    }
  }

  const onBodyPartRatioInput = async (idx: number, value: number) => {
    // 记录修改前的配置
    const originalConfig = JSON.parse(JSON.stringify(localConfig.value))

    // 先更新UI显示新值
    autoDistributeRatio(localConfig.value.bodyParts, idx, value)

    // 验证配置
    const validation = GameService.validatePunishmentConfig(localConfig.value)
    if (validation.isValid) {
      // 配置有效，发送更新事件
      emit('update', localConfig.value)
    } else {
      // 配置无效，回退到修改前的值
      localConfig.value = originalConfig

      // 显示错误提示
      errorMessage.value = validation.errorMessage || '配置验证失败'
      requiredSensitivity.value = validation.requiredSensitivity
      showErrorModal.value = true
      emit('validation-failed', validation.errorMessage!, validation.requiredSensitivity)
    }
  }

  const onPositionRatioInput = async (idx: number, value: number) => {
    // 记录修改前的配置
    const originalConfig = JSON.parse(JSON.stringify(localConfig.value))

    // 先更新UI显示新值
    autoDistributeRatio(localConfig.value.positions, idx, value)

    // 验证配置
    const validation = GameService.validatePunishmentConfig(localConfig.value)
    if (validation.isValid) {
      // 配置有效，发送更新事件
      emit('update', localConfig.value)
    } else {
      // 配置无效，回退到修改前的值
      localConfig.value = originalConfig

      // 显示错误提示
      errorMessage.value = validation.errorMessage || '配置验证失败'
      requiredSensitivity.value = validation.requiredSensitivity
      showErrorModal.value = true
      emit('validation-failed', validation.errorMessage!, validation.requiredSensitivity)
    }
  }

  const updateToolIntensity = async (toolId: string, newIntensity: number) => {
    const tool = localConfig.value.tools.find(t => t.id === toolId)
    if (tool && newIntensity >= 1 && newIntensity <= 10) {
      // 记录修改前的值
      const originalIntensity = tool.intensity

      // 先更新UI显示新值
      tool.intensity = newIntensity

      // 验证配置
      const validation = GameService.validatePunishmentConfig(localConfig.value)
      if (validation.isValid) {
        // 配置有效，发送更新事件
        emit('update', localConfig.value)
      } else {
        // 配置无效，回退到修改前的值
        tool.intensity = originalIntensity

        // 显示错误提示
        errorMessage.value = validation.errorMessage || '配置验证失败'
        requiredSensitivity.value = validation.requiredSensitivity
        showErrorModal.value = true
        emit('validation-failed', validation.errorMessage!, validation.requiredSensitivity)
      }
    }
  }

  const removeTool = async (toolId: string) => {
    // 记录修改前的配置
    const originalConfig = JSON.parse(JSON.stringify(localConfig.value))

    const index = localConfig.value.tools.findIndex(t => t.id === toolId)
    if (index > -1) {
      // 先更新UI显示新值
      localConfig.value.tools.splice(index, 1)
      // 重新分配比例
      if (localConfig.value.tools.length > 0) {
        autoDistributeRatio(localConfig.value.tools, 0, localConfig.value.tools[0].ratio)
      }

      // 验证配置
      const validation = GameService.validatePunishmentConfig(localConfig.value)
      if (validation.isValid) {
        // 配置有效，发送更新事件
        emit('update', localConfig.value)
      } else {
        // 配置无效，等待DOM更新后回退到修改前的值
        await nextTick()
        localConfig.value = originalConfig

        // 显示错误提示
        errorMessage.value = validation.errorMessage || '配置验证失败'
        requiredSensitivity.value = validation.requiredSensitivity
        showErrorModal.value = true
        emit('validation-failed', validation.errorMessage!, validation.requiredSensitivity)
      }
    }
  }

  const addTool = async () => {
    if (newToolName.value.trim()) {
      // 记录修改前的配置
      const originalConfig = JSON.parse(JSON.stringify(localConfig.value))

      // 先更新UI显示新值
      const n = localConfig.value.tools.length + 1
      const ratio = 100 / n
      localConfig.value.tools.forEach(t => (t.ratio = ratio))
      const newTool: PunishmentTool = {
        id: `tool_${Date.now()}`,
        name: newToolName.value.trim(),
        intensity: Math.max(1, Math.min(10, newToolIntensity.value)),
        ratio,
      }
      localConfig.value.tools.push(newTool)

      // 验证配置
      const validation = GameService.validatePunishmentConfig(localConfig.value)
      if (validation.isValid) {
        // 配置有效，发送更新事件
        emit('update', localConfig.value)
        newToolName.value = ''
        newToolIntensity.value = 5
      } else {
        // 配置无效，回退到修改前的值
        localConfig.value = originalConfig

        // 显示错误提示
        errorMessage.value = validation.errorMessage || '配置验证失败'
        requiredSensitivity.value = validation.requiredSensitivity
        showErrorModal.value = true
        emit('validation-failed', validation.errorMessage!, validation.requiredSensitivity)
      }
    }
  }

  const updateBodyPartSensitivity = async (bodyPartId: string, newSensitivity: number) => {
    const bodyPart = localConfig.value.bodyParts.find(b => b.id === bodyPartId)
    if (bodyPart && newSensitivity >= 1 && newSensitivity <= 10) {
      // 记录修改前的值
      const originalSensitivity = bodyPart.sensitivity

      // 先更新UI显示新值
      bodyPart.sensitivity = newSensitivity

      // 验证配置
      const validation = GameService.validatePunishmentConfig(localConfig.value)
      if (validation.isValid) {
        // 配置有效，发送更新事件
        emit('update', localConfig.value)
      } else {
        // 配置无效，回退到修改前的值
        bodyPart.sensitivity = originalSensitivity

        // 显示错误提示
        errorMessage.value = validation.errorMessage || '配置验证失败'
        requiredSensitivity.value = validation.requiredSensitivity
        showErrorModal.value = true
        emit('validation-failed', validation.errorMessage!, validation.requiredSensitivity)
      }
    }
  }

  const removeBodyPart = async (bodyPartId: string) => {
    // 记录修改前的配置
    const originalConfig = JSON.parse(JSON.stringify(localConfig.value))

    const index = localConfig.value.bodyParts.findIndex(b => b.id === bodyPartId)
    if (index > -1) {
      // 先更新UI显示新值
      localConfig.value.bodyParts.splice(index, 1)
      if (localConfig.value.bodyParts.length > 0) {
        autoDistributeRatio(localConfig.value.bodyParts, 0, localConfig.value.bodyParts[0].ratio)
      }

      // 验证配置
      const validation = GameService.validatePunishmentConfig(localConfig.value)
      if (validation.isValid) {
        // 配置有效，发送更新事件
        emit('update', localConfig.value)
      } else {
        // 配置无效，等待DOM更新后回退到修改前的值
        await nextTick()
        localConfig.value = originalConfig

        // 显示错误提示
        errorMessage.value = validation.errorMessage || '配置验证失败'
        requiredSensitivity.value = validation.requiredSensitivity
        showErrorModal.value = true
        emit('validation-failed', validation.errorMessage!, validation.requiredSensitivity)
      }
    }
  }

  const addBodyPart = async () => {
    if (newBodyPartName.value.trim()) {
      // 记录修改前的配置
      const originalConfig = JSON.parse(JSON.stringify(localConfig.value))

      // 先更新UI显示新值
      const n = localConfig.value.bodyParts.length + 1
      const ratio = 100 / n
      localConfig.value.bodyParts.forEach(b => (b.ratio = ratio))
      const newBodyPart: PunishmentBodyPart = {
        id: `bodypart_${Date.now()}`,
        name: newBodyPartName.value.trim(),
        sensitivity: Math.max(1, Math.min(10, newBodyPartSensitivity.value)),
        ratio,
      }
      localConfig.value.bodyParts.push(newBodyPart)

      // 验证配置
      const validation = GameService.validatePunishmentConfig(localConfig.value)
      if (validation.isValid) {
        // 配置有效，发送更新事件
        emit('update', localConfig.value)
        newBodyPartName.value = ''
        newBodyPartSensitivity.value = 5
      } else {
        // 配置无效，回退到修改前的值
        localConfig.value = originalConfig

        // 显示错误提示
        errorMessage.value = validation.errorMessage || '配置验证失败'
        requiredSensitivity.value = validation.requiredSensitivity
        showErrorModal.value = true
        emit('validation-failed', validation.errorMessage!, validation.requiredSensitivity)
      }
    }
  }

  const removePosition = async (positionId: string) => {
    // 记录修改前的配置
    const originalConfig = JSON.parse(JSON.stringify(localConfig.value))

    const index = localConfig.value.positions.findIndex(p => p.id === positionId)
    if (index > -1) {
      // 先更新UI显示新值
      localConfig.value.positions.splice(index, 1)
      if (localConfig.value.positions.length > 0) {
        autoDistributeRatio(localConfig.value.positions, 0, localConfig.value.positions[0].ratio)
      }

      // 验证配置
      const validation = GameService.validatePunishmentConfig(localConfig.value)
      if (validation.isValid) {
        // 配置有效，发送更新事件
        emit('update', localConfig.value)
      } else {
        // 配置无效，等待DOM更新后回退到修改前的值
        await nextTick()
        localConfig.value = originalConfig

        // 显示错误提示
        errorMessage.value = validation.errorMessage || '配置验证失败'
        requiredSensitivity.value = validation.requiredSensitivity
        showErrorModal.value = true
        emit('validation-failed', validation.errorMessage!, validation.requiredSensitivity)
      }
    }
  }

  const addPosition = async () => {
    if (newPositionName.value.trim()) {
      // 记录修改前的配置
      const originalConfig = JSON.parse(JSON.stringify(localConfig.value))

      // 先更新UI显示新值
      const n = localConfig.value.positions.length + 1
      const ratio = 100 / n
      localConfig.value.positions.forEach(p => (p.ratio = ratio))
      const newPosition: PunishmentPosition = {
        id: `position_${Date.now()}`,
        name: newPositionName.value.trim(),
        ratio,
      }
      localConfig.value.positions.push(newPosition)

      // 验证配置
      const validation = GameService.validatePunishmentConfig(localConfig.value)
      if (validation.isValid) {
        // 配置有效，发送更新事件
        emit('update', localConfig.value)
        newPositionName.value = ''
      } else {
        // 配置无效，回退到修改前的值
        localConfig.value = originalConfig

        // 显示错误提示
        errorMessage.value = validation.errorMessage || '配置验证失败'
        requiredSensitivity.value = validation.requiredSensitivity
        showErrorModal.value = true
        emit('validation-failed', validation.errorMessage!, validation.requiredSensitivity)
      }
    }
  }

  const resetToDefault = async () => {
    // 记录修改前的配置
    const originalConfig = JSON.parse(JSON.stringify(localConfig.value))

    // 先更新UI显示新值
    const defaultConfig = GameService.createPunishmentConfig()
    localConfig.value = defaultConfig

    // 验证配置
    const validation = GameService.validatePunishmentConfig(localConfig.value)
    if (validation.isValid) {
      // 配置有效，发送更新事件
      emit('update', localConfig.value)
    } else {
      // 配置无效，回退到修改前的值
      localConfig.value = originalConfig

      // 显示错误提示
      errorMessage.value = validation.errorMessage || '配置验证失败'
      requiredSensitivity.value = validation.requiredSensitivity
      showErrorModal.value = true
      emit('validation-failed', validation.errorMessage!, validation.requiredSensitivity)
    }
  }

  const updateMinStrikes = async (newValue: number) => {
    // 记录修改前的配置
    const originalConfig = JSON.parse(JSON.stringify(localConfig.value))

    // 先更新UI显示新值
    localConfig.value.minStrikes = Math.max(5, newValue)
    if (localConfig.value.minStrikes > localConfig.value.maxStrikes) {
      localConfig.value.maxStrikes = localConfig.value.minStrikes
    }

    // 验证配置
    const validation = GameService.validatePunishmentConfig(localConfig.value)
    if (validation.isValid) {
      // 配置有效，发送更新事件
      emit('update', localConfig.value)
    } else {
      // 配置无效，回退到修改前的值
      localConfig.value = originalConfig

      // 显示错误提示
      errorMessage.value = validation.errorMessage || '配置验证失败'
      requiredSensitivity.value = validation.requiredSensitivity
      showErrorModal.value = true
      emit('validation-failed', validation.errorMessage!, validation.requiredSensitivity)
    }
  }

  const updateMaxStrikes = async (newValue: number) => {
    // 记录修改前的配置
    const originalConfig = JSON.parse(JSON.stringify(localConfig.value))

    // 先更新UI显示新值
    localConfig.value.maxStrikes = Math.max(localConfig.value.minStrikes, newValue)

    // 验证配置
    const validation = GameService.validatePunishmentConfig(localConfig.value)
    if (validation.isValid) {
      // 配置有效，发送更新事件
      emit('update', localConfig.value)
    } else {
      // 配置无效，回退到修改前的值
      localConfig.value = originalConfig

      // 显示错误提示
      errorMessage.value = validation.errorMessage || '配置验证失败'
      requiredSensitivity.value = validation.requiredSensitivity
      showErrorModal.value = true
      emit('validation-failed', validation.errorMessage!, validation.requiredSensitivity)
    }
  }

  const updateMaxTakeoffFailures = async (newValue: number) => {
    const originalConfig = JSON.parse(JSON.stringify(localConfig.value))

    localConfig.value.maxTakeoffFailures = Math.max(1, newValue)

    const validation = GameService.validatePunishmentConfig(localConfig.value)
    if (validation.isValid) {
      emit('update', localConfig.value)
    } else {
      localConfig.value = originalConfig
      errorMessage.value = validation.errorMessage || '配置验证失败'
      requiredSensitivity.value = validation.requiredSensitivity
      showErrorModal.value = true
      emit('validation-failed', validation.errorMessage!, validation.requiredSensitivity)
    }
  }
</script>

<template>
  <div class="punishment-config">
    <div class="config-header">
      <h3>⚙️ 惩罚设置</h3>
    </div>

    <div class="config-sections">
      <!-- 工具设置 -->
      <div class="config-section">
        <div class="section-header">
          <h4>🛠️ 工具设置</h4>
          <div class="section-summary">{{ localConfig.tools.length }}个工具</div>
        </div>

        <div class="items-grid">
          <div v-for="(tool, idx) in localConfig.tools" :key="tool.id" class="item-card">
            <div class="item-header">
              <span class="item-name">{{ tool.name }}</span>
              <button class="btn-remove" @click="removeTool(tool.id)">×</button>
            </div>

            <div class="item-stats">
              <div class="stat-item">
                <span class="stat-label">强度</span>
                <div class="stat-controls">
                  <button
                    :disabled="tool.intensity <= 1"
                    class="btn-stat"
                    @click="updateToolIntensity(tool.id, tool.intensity - 1)"
                  >
                    -
                  </button>
                  <span class="stat-value">{{ tool.intensity }}/10</span>
                  <button
                    :disabled="tool.intensity >= 10"
                    class="btn-stat"
                    @click="updateToolIntensity(tool.id, tool.intensity + 1)"
                  >
                    +
                  </button>
                </div>
              </div>

              <div class="stat-item">
                <span class="stat-label">比例 {{ Math.round(tool.ratio * 10) / 10 }}%</span>
                <input
                  v-model.number="tool.ratio"
                  type="range"
                  :min="0"
                  :max="100"
                  step="5"
                  class="ratio-slider"
                  @input="onToolRatioInput(idx, Math.round(tool.ratio / 5) * 5)"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="add-item-form">
          <div class="form-row">
            <input v-model="newToolName" placeholder="新工具名称" class="input-field" />
            <input
              v-model.number="newToolIntensity"
              type="number"
              min="1"
              max="10"
              class="input-mini"
              placeholder="强度"
            />
          </div>
          <button :disabled="!newToolName.trim()" class="btn-add" @click="addTool">
            + 添加工具
          </button>
        </div>
      </div>

      <!-- 部位设置 -->
      <div class="config-section">
        <div class="section-header">
          <h4>🎯 部位设置</h4>
          <div class="section-summary">{{ localConfig.bodyParts.length }}个部位</div>
        </div>

        <div class="items-grid">
          <div
            v-for="(bodyPart, idx) in localConfig.bodyParts"
            :key="bodyPart.id"
            class="item-card"
          >
            <div class="item-header">
              <span class="item-name">{{ bodyPart.name }}</span>
              <button class="btn-remove" @click="removeBodyPart(bodyPart.id)">×</button>
            </div>

            <div class="item-stats">
              <div class="stat-item">
                <span class="stat-label">耐受度</span>
                <div class="stat-controls">
                  <button
                    :disabled="bodyPart.sensitivity <= 1"
                    class="btn-stat"
                    @click="updateBodyPartSensitivity(bodyPart.id, bodyPart.sensitivity - 1)"
                  >
                    -
                  </button>
                  <span class="stat-value">{{ bodyPart.sensitivity }}/10</span>
                  <button
                    :disabled="bodyPart.sensitivity >= 10"
                    class="btn-stat"
                    @click="updateBodyPartSensitivity(bodyPart.id, bodyPart.sensitivity + 1)"
                  >
                    +
                  </button>
                </div>
              </div>

              <div class="stat-item">
                <span class="stat-label">比例 {{ Math.round(bodyPart.ratio * 10) / 10 }}%</span>
                <input
                  v-model.number="bodyPart.ratio"
                  type="range"
                  :min="0"
                  :max="100"
                  step="5"
                  class="ratio-slider"
                  @input="onBodyPartRatioInput(idx, Math.round(bodyPart.ratio / 5) * 5)"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="add-item-form">
          <div class="form-row">
            <input v-model="newBodyPartName" placeholder="新部位名称" class="input-field" />
            <input
              v-model.number="newBodyPartSensitivity"
              type="number"
              min="1"
              max="10"
              class="input-mini"
              placeholder="耐受度"
            />
          </div>
          <button :disabled="!newBodyPartName.trim()" class="btn-add" @click="addBodyPart">
            + 添加部位
          </button>
        </div>
      </div>

      <!-- 姿势设置 -->
      <div class="config-section">
        <div class="section-header">
          <h4>🧘 姿势设置</h4>
          <div class="section-summary">{{ localConfig.positions.length }}个姿势</div>
        </div>

        <div class="items-grid">
          <div
            v-for="(position, idx) in localConfig.positions"
            :key="position.id"
            class="item-card"
          >
            <div class="item-header">
              <span class="item-name">{{ position.name }}</span>
              <button class="btn-remove" @click="removePosition(position.id)">×</button>
            </div>

            <div class="item-stats">
              <div class="stat-item">
                <span class="stat-label">比例 {{ Math.round(position.ratio * 10) / 10 }}%</span>
                <input
                  v-model.number="position.ratio"
                  type="range"
                  :min="0"
                  :max="100"
                  step="5"
                  class="ratio-slider"
                  @input="onPositionRatioInput(idx, Math.round(position.ratio / 5) * 5)"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="add-item-form">
          <div class="form-row">
            <input v-model="newPositionName" placeholder="新姿势名称" class="input-field" />
          </div>
          <button :disabled="!newPositionName.trim()" class="btn-add" @click="addPosition">
            + 添加姿势
          </button>
        </div>
      </div>

      <!-- 惩罚数量设置 -->
      <div class="config-section">
        <div class="section-header">
          <h4>🔢 惩罚数量设置</h4>
        </div>

        <div class="strikes-config">
          <div class="strikes-item">
            <span class="strikes-label">最小次数</span>
            <div class="strikes-controls">
              <button
                :disabled="localConfig.minStrikes <= 5"
                class="btn-stat"
                @click="updateMinStrikes(localConfig.minStrikes - 5)"
              >
                -
              </button>
              <span class="strikes-value">{{ localConfig.minStrikes }}</span>
              <button
                :disabled="localConfig.minStrikes >= localConfig.maxStrikes"
                class="btn-stat"
                @click="updateMinStrikes(localConfig.minStrikes + 5)"
              >
                +
              </button>
            </div>
          </div>

          <div class="strikes-item">
            <span class="strikes-label">最大次数</span>
            <div class="strikes-controls">
              <button
                :disabled="localConfig.maxStrikes <= localConfig.minStrikes"
                class="btn-stat"
                @click="updateMaxStrikes(localConfig.maxStrikes - 5)"
              >
                -
              </button>
              <span class="strikes-value">{{ localConfig.maxStrikes }}</span>
              <button
                :disabled="localConfig.maxStrikes >= 100"
                class="btn-stat"
                @click="updateMaxStrikes(localConfig.maxStrikes + 5)"
              >
                +
              </button>
            </div>
          </div>

          <div class="strikes-item">
            <span class="strikes-label">最大起飞失败</span>
            <div class="strikes-controls">
              <button
                :disabled="localConfig.maxTakeoffFailures <= 1"
                class="btn-stat"
                @click="updateMaxTakeoffFailures(localConfig.maxTakeoffFailures - 1)"
              >
                -
              </button>
              <span class="strikes-value">{{ localConfig.maxTakeoffFailures }}</span>
              <button
                :disabled="localConfig.maxTakeoffFailures >= 10"
                class="btn-stat"
                @click="updateMaxTakeoffFailures(localConfig.maxTakeoffFailures + 1)"
              >
                +
              </button>
            </div>
          </div>

          <div class="strikes-description">
            {{ localConfig.minStrikes }} - {{ localConfig.maxStrikes }} 次随机
          </div>
        </div>
      </div>
    </div>

    <div class="config-actions">
      <button class="btn-secondary" @click="resetToDefault">
        <span class="btn-icon">🔄</span>
        <span class="btn-text">重置默认</span>
      </button>
    </div>

    <!-- 错误提示弹窗 -->
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
    background: white;
    border-radius: 8px;
    padding: 1rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    margin-bottom: 1rem;
  }

  .config-header {
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .config-header h3 {
    margin: 0;
    color: #333;
    font-size: 1.3rem;
    font-weight: 600;
  }

  .config-sections {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    margin-bottom: 1.5rem;
  }

  .config-section {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 1rem;
    background: #fafafa;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #e0e0e0;
  }

  .section-header h4 {
    margin: 0;
    color: #333;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .section-summary {
    font-size: 0.8rem;
    color: #666;
    background: #e0e0e0;
    padding: 0.2rem 0.5rem;
    border-radius: 12px;
  }

  .items-grid {
    display: grid;
    gap: 0.8rem;
    margin-bottom: 1rem;
  }

  .item-card {
    background: white;
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 0.8rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.8rem;
  }

  .item-name {
    font-weight: 600;
    color: #333;
    font-size: 1rem;
  }

  .btn-remove {
    width: 24px;
    height: 24px;
    border: 1px solid #ff6b6b;
    background: #ff6b6b;
    color: white;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    font-weight: bold;
  }

  .btn-remove:hover {
    background: #ff4757;
  }

  .item-stats {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .stat-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
  }

  .stat-label {
    font-size: 0.85rem;
    color: #666;
    min-width: 60px;
  }

  .stat-controls {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  .btn-stat {
    width: 24px;
    height: 24px;
    border: 1px solid #ddd;
    background: white;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    font-weight: bold;
  }

  .btn-stat:hover:not(:disabled) {
    background: #f0f0f0;
  }

  .btn-stat:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .stat-value {
    min-width: 30px;
    text-align: center;
    font-weight: 600;
    font-size: 0.9rem;
    color: #333;
  }

  .ratio-slider {
    flex: 1;
    height: 4px;
    border-radius: 2px;
    background: #ddd;
    outline: none;
    -webkit-appearance: none;
  }

  .ratio-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #4ecdc4;
    cursor: pointer;
  }

  .ratio-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #4ecdc4;
    cursor: pointer;
    border: none;
  }

  .add-item-form {
    border-top: 1px solid #e0e0e0;
    padding-top: 0.8rem;
  }

  .form-row {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .input-field {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.9rem;
  }

  .input-mini {
    width: 60px;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.9rem;
    text-align: center;
  }

  .btn-add {
    width: 100%;
    padding: 0.6rem;
    border: 1px solid #4ecdc4;
    background: #4ecdc4;
    color: white;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .btn-add:hover:not(:disabled) {
    background: #44a08d;
  }

  .btn-add:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .strikes-config {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }

  .strikes-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.8rem;
    background: white;
    border: 1px solid #ddd;
    border-radius: 6px;
  }

  .strikes-label {
    font-weight: 600;
    color: #333;
    font-size: 0.95rem;
  }

  .strikes-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .strikes-value {
    min-width: 40px;
    text-align: center;
    font-weight: 600;
    font-size: 1rem;
    color: #ffa726;
  }

  .strikes-description {
    text-align: center;
    padding: 0.6rem;
    background: #fff3e0;
    border-radius: 6px;
    color: #e65100;
    font-size: 0.85rem;
    border: 1px solid #ffcc80;
    font-weight: 600;
  }

  .config-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }

  .btn-primary,
  .btn-secondary {
    padding: clamp(0.4rem, 1.5vw, 0.6rem) clamp(0.8rem, 2.5vw, 1.2rem);
    border: none;
    border-radius: clamp(4px, 1vw, 6px);
    font-size: clamp(0.8rem, 2.2vw, 0.9rem);
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: clamp(0.3rem, 1vw, 0.4rem);
    min-height: clamp(32px, 7vw, 36px);
    min-width: 120px;
  }

  .btn-primary {
    background: linear-gradient(135deg, #4ecdc4, #44a08d);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(78, 205, 196, 0.3);
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .btn-secondary {
    background: linear-gradient(135deg, #ff6b6b, #ee5a52);
    color: white;
  }

  .btn-secondary:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
  }

  .btn-icon {
    font-size: 1rem;
  }

  .btn-text {
    font-weight: 600;
  }

  /* 移动端优化 */
  @media (max-width: 768px) {
    .punishment-config {
      padding: 0.8rem;
      margin: 0.5rem;
    }

    .config-header h3 {
      font-size: 1.2rem;
    }

    .config-sections {
      gap: 1rem;
    }

    .config-section {
      padding: 0.8rem;
    }

    .section-header h4 {
      font-size: 1rem;
    }

    .section-summary {
      font-size: 0.75rem;
      padding: 0.15rem 0.4rem;
    }

    .items-grid {
      gap: 0.6rem;
    }

    .item-card {
      padding: 0.6rem;
    }

    .item-name {
      font-size: 0.95rem;
    }

    .btn-remove {
      width: 22px;
      height: 22px;
      font-size: 0.8rem;
    }

    .stat-item {
      gap: 0.4rem;
    }

    .stat-label {
      font-size: 0.8rem;
      min-width: 50px;
    }

    .btn-stat {
      width: 22px;
      height: 22px;
      font-size: 0.75rem;
    }

    .stat-value {
      min-width: 25px;
      font-size: 0.85rem;
    }

    .ratio-slider {
      height: 3px;
    }

    .ratio-slider::-webkit-slider-thumb,
    .ratio-slider::-moz-range-thumb {
      width: 14px;
      height: 14px;
    }

    .form-row {
      gap: 0.4rem;
    }

    .input-field,
    .input-mini {
      padding: 0.4rem;
      font-size: 0.85rem;
    }

    .input-mini {
      width: 50px;
    }

    .btn-add {
      padding: 0.5rem;
      font-size: 0.85rem;
    }

    .strikes-item {
      padding: 0.6rem;
    }

    .strikes-label {
      font-size: 0.9rem;
    }

    .strikes-value {
      min-width: 35px;
      font-size: 0.95rem;
    }

    .strikes-description {
      padding: 0.5rem;
      font-size: 0.8rem;
    }

    .config-actions {
      flex-direction: column;
      gap: 0.8rem;
    }

    .btn-primary,
    .btn-secondary {
      width: 100%;
      max-width: min(300px, 80vw);
      justify-content: center;
      padding: clamp(0.35rem, 1.5vw, 0.4rem) clamp(0.7rem, 2vw, 0.8rem);
      font-size: clamp(0.7rem, 1.8vw, 0.75rem);
      border-radius: 4px;
      min-height: clamp(28px, 6vw, 32px);
      gap: clamp(0.2rem, 0.6vw, 0.25rem);
      min-width: auto;
    }
  }

  /* 超小屏幕优化 */
  @media (max-width: 480px) {
    .punishment-config {
      padding: 0.6rem;
      margin: 0.3rem;
    }

    .config-header h3 {
      font-size: 1.1rem;
    }

    .config-sections {
      gap: 0.8rem;
    }

    .config-section {
      padding: 0.6rem;
    }

    .section-header {
      margin-bottom: 0.8rem;
    }

    .section-header h4 {
      font-size: 0.95rem;
    }

    .section-summary {
      font-size: 0.7rem;
      padding: 0.1rem 0.3rem;
    }

    .items-grid {
      gap: 0.5rem;
    }

    .item-card {
      padding: 0.5rem;
    }

    .item-header {
      margin-bottom: 0.6rem;
    }

    .item-name {
      font-size: 0.9rem;
    }

    .btn-remove {
      width: 20px;
      height: 20px;
      font-size: 0.75rem;
    }

    .item-stats {
      gap: 0.5rem;
    }

    .stat-item {
      gap: 0.3rem;
    }

    .stat-label {
      font-size: 0.75rem;
      min-width: 45px;
    }

    .btn-stat {
      width: 20px;
      height: 20px;
      font-size: 0.7rem;
    }

    .stat-value {
      min-width: 22px;
      font-size: 0.8rem;
    }

    .ratio-slider {
      height: 2px;
    }

    .ratio-slider::-webkit-slider-thumb,
    .ratio-slider::-moz-range-thumb {
      width: 12px;
      height: 12px;
    }

    .form-row {
      gap: 0.3rem;
    }

    .input-field,
    .input-mini {
      padding: 0.3rem;
      font-size: 0.8rem;
    }

    .input-mini {
      width: 45px;
    }

    .btn-add {
      padding: 0.4rem;
      font-size: 0.8rem;
    }

    .strikes-item {
      padding: 0.5rem;
    }

    .strikes-label {
      font-size: 0.85rem;
    }

    .strikes-controls {
      gap: 0.4rem;
    }

    .strikes-value {
      min-width: 30px;
      font-size: 0.9rem;
    }

    .strikes-description {
      padding: 0.4rem;
      font-size: 0.75rem;
    }

    .config-actions {
      gap: 0.6rem;
    }

    .btn-primary,
    .btn-secondary {
      width: 100%;
      max-width: min(300px, 80vw);
      justify-content: center;
      padding: clamp(0.3rem, 1.2vw, 0.35rem) clamp(0.6rem, 1.8vw, 0.7rem);
      font-size: clamp(0.65rem, 1.6vw, 0.7rem);
      border-radius: 4px;
      min-height: clamp(24px, 5vw, 28px);
      gap: clamp(0.15rem, 0.5vw, 0.2rem);
      min-width: auto;
    }
  }
</style>
