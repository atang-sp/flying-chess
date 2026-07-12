<script setup lang="ts">
  import { ref, watch, nextTick } from 'vue'
  import { Settings, Target, ChevronRight, X, Minus, Plus, RotateCcw } from '@lucide/vue'
  import type {
    PunishmentConfig,
    PunishmentTool,
    PunishmentBodyPart,
    PunishmentPosition,
  } from '../types/game'
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

  const closeErrorModal = () => {
    showErrorModal.value = false
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
    const toolsArray = Object.values(localConfig.value.tools)
    autoDistributeRatio(toolsArray, idx, value)

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
    const bodyPartsArray = Object.values(localConfig.value.bodyParts)
    autoDistributeRatio(bodyPartsArray, idx, value)

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
    const positionsArray = Object.values(localConfig.value.positions)
    autoDistributeRatio(positionsArray, idx, value)

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

  const updateToolIntensity = async (toolName: string, newIntensity: number) => {
    const tool = localConfig.value.tools[toolName]
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

  const removeTool = async (toolName: string) => {
    // 记录修改前的配置
    const originalConfig = JSON.parse(JSON.stringify(localConfig.value))

    if (toolName in localConfig.value.tools) {
      // 先更新UI显示新值
      delete localConfig.value.tools[toolName]

      // 重新分配比例
      const toolsArray = Object.values(localConfig.value.tools)
      if (toolsArray.length > 0) {
        autoDistributeRatio(toolsArray, 0, toolsArray[0].ratio)
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
      const toolName = newToolName.value.trim()

      // 检查是否已存在同名工具
      if (toolName in localConfig.value.tools) {
        return // 已存在，不添加
      }

      // 记录修改前的配置
      const originalConfig = JSON.parse(JSON.stringify(localConfig.value))

      // 先更新UI显示新值
      const toolsArray = Object.values(localConfig.value.tools)
      const n = toolsArray.length + 1
      const ratio = 100 / n

      // 更新现有工具的比例
      toolsArray.forEach(t => (t.ratio = ratio))

      // 创建新工具
      const newTool: PunishmentTool = {
        name: toolName,
        intensity: Math.max(1, Math.min(10, newToolIntensity.value)),
        ratio,
      }

      // 添加新工具
      localConfig.value.tools[toolName] = newTool

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

  const updateBodyPartSensitivity = async (bodyPartName: string, newSensitivity: number) => {
    const bodyPart = localConfig.value.bodyParts[bodyPartName]
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

  const removeBodyPart = async (bodyPartName: string) => {
    // 记录修改前的配置
    const originalConfig = JSON.parse(JSON.stringify(localConfig.value))

    if (bodyPartName in localConfig.value.bodyParts) {
      // 先更新UI显示新值
      delete localConfig.value.bodyParts[bodyPartName]

      // 重新分配比例
      const bodyPartsArray = Object.values(localConfig.value.bodyParts)
      if (bodyPartsArray.length > 0) {
        autoDistributeRatio(bodyPartsArray, 0, bodyPartsArray[0].ratio)
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
      const bodyPartName = newBodyPartName.value.trim()

      // 检查是否已存在同名部位
      if (bodyPartName in localConfig.value.bodyParts) {
        return // 已存在，不添加
      }

      // 记录修改前的配置
      const originalConfig = JSON.parse(JSON.stringify(localConfig.value))

      // 先更新UI显示新值
      const bodyPartsArray = Object.values(localConfig.value.bodyParts)
      const n = bodyPartsArray.length + 1
      const ratio = 100 / n

      // 更新现有部位的比例
      bodyPartsArray.forEach(b => (b.ratio = ratio))

      // 创建新部位
      const newBodyPart: PunishmentBodyPart = {
        name: bodyPartName,
        sensitivity: Math.max(1, Math.min(10, newBodyPartSensitivity.value)),
        ratio,
      }

      // 添加新部位
      localConfig.value.bodyParts[bodyPartName] = newBodyPart

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

  const removePosition = async (positionName: string) => {
    // 记录修改前的配置
    const originalConfig = JSON.parse(JSON.stringify(localConfig.value))

    if (positionName in localConfig.value.positions) {
      // 先更新UI显示新值
      delete localConfig.value.positions[positionName]

      // 重新分配比例
      const positionsArray = Object.values(localConfig.value.positions)
      if (positionsArray.length > 0) {
        autoDistributeRatio(positionsArray, 0, positionsArray[0].ratio)
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
      const positionName = newPositionName.value.trim()

      // 检查是否已存在同名姿势
      if (positionName in localConfig.value.positions) {
        return // 已存在，不添加
      }

      // 记录修改前的配置
      const originalConfig = JSON.parse(JSON.stringify(localConfig.value))

      // 先更新UI显示新值
      const positionsArray = Object.values(localConfig.value.positions)
      const n = positionsArray.length + 1
      const ratio = 100 / n

      // 更新现有姿势的比例
      positionsArray.forEach(p => (p.ratio = ratio))

      // 创建新姿势（默认兼容所有当前部位）
      const newPosition: PunishmentPosition = {
        name: positionName,
        ratio,
        compatibleBodyParts: Object.keys(localConfig.value.bodyParts),
      }

      // 添加新姿势
      localConfig.value.positions[positionName] = newPosition

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
      errorMessage.value = validation.errorMessage || '配置验证失败'
      requiredSensitivity.value = validation.requiredSensitivity
      showErrorModal.value = true
      emit('validation-failed', validation.errorMessage!, validation.requiredSensitivity)
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

  const updateDoublePunishmentChance = (newValue: number) => {
    localConfig.value.doublePunishmentChance = Math.max(0, Math.min(50, newValue))
    emit('update', localConfig.value)
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
      <div class="config-section">
        <div class="section-header">
          <h4>
            <Settings :size="18" />
            工具设置
          </h4>
          <div class="section-summary">{{ Object.keys(localConfig.tools).length }}个工具</div>
        </div>

        <div class="items-grid">
          <div
            v-for="(tool, idx) in Object.values(localConfig.tools)"
            :key="tool.name"
            class="item-card"
          >
            <div class="item-header">
              <span class="item-name">{{ tool.name }}</span>
              <button class="btn-remove" @click="removeTool(tool.name)">
                <X :size="14" />
              </button>
            </div>

            <div class="item-stats">
              <div class="stat-item">
                <span class="stat-label">强度</span>
                <div class="stat-controls">
                  <button
                    :disabled="tool.intensity <= 1"
                    class="btn-stat"
                    @click="updateToolIntensity(tool.name, tool.intensity - 1)"
                  >
                    <Minus :size="14" />
                  </button>
                  <span class="stat-value">{{ tool.intensity }}/10</span>
                  <button
                    :disabled="tool.intensity >= 10"
                    class="btn-stat"
                    @click="updateToolIntensity(tool.name, tool.intensity + 1)"
                  >
                    <Plus :size="14" />
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
            <Plus :size="16" />
            添加工具
          </button>
        </div>
      </div>

      <!-- 部位设置 -->
      <div class="config-section">
        <div class="section-header">
          <h4>
            <Target :size="18" />
            部位设置
          </h4>
          <div class="section-summary">{{ Object.keys(localConfig.bodyParts).length }}个部位</div>
        </div>

        <div class="items-grid">
          <div
            v-for="(bodyPart, idx) in Object.values(localConfig.bodyParts)"
            :key="bodyPart.name"
            class="item-card"
          >
            <div class="item-header">
              <span class="item-name">{{ bodyPart.name }}</span>
              <button class="btn-remove" @click="removeBodyPart(bodyPart.name)">
                <X :size="14" />
              </button>
            </div>

            <div class="item-stats">
              <div class="stat-item">
                <span class="stat-label">耐受度</span>
                <div class="stat-controls">
                  <button
                    :disabled="bodyPart.sensitivity <= 1"
                    class="btn-stat"
                    @click="updateBodyPartSensitivity(bodyPart.name, bodyPart.sensitivity - 1)"
                  >
                    <Minus :size="14" />
                  </button>
                  <span class="stat-value">{{ bodyPart.sensitivity }}/10</span>
                  <button
                    :disabled="bodyPart.sensitivity >= 10"
                    class="btn-stat"
                    @click="updateBodyPartSensitivity(bodyPart.name, bodyPart.sensitivity + 1)"
                  >
                    <Plus :size="14" />
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
            <Plus :size="16" />
            添加部位
          </button>
        </div>
      </div>

      <!-- 姿势设置 -->
      <div class="config-section">
        <div class="section-header">
          <h4>
            <ChevronRight :size="18" />
            姿势设置
          </h4>
          <div class="section-summary">{{ Object.keys(localConfig.positions).length }}个姿势</div>
        </div>

        <div class="items-grid">
          <div
            v-for="(position, idx) in Object.values(localConfig.positions)"
            :key="position.name"
            class="item-card"
          >
            <div class="item-header">
              <span class="item-name">{{ position.name }}</span>
              <button class="btn-remove" @click="removePosition(position.name)">
                <X :size="14" />
              </button>
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

              <div class="stat-item compatible-body-parts">
                <span class="stat-label">兼容部位</span>
                <div class="body-part-chips">
                  <label
                    v-for="bp in Object.values(localConfig.bodyParts)"
                    :key="bp.name"
                    class="chip-label"
                    :class="{ active: isBodyPartCompatible(position, bp.name) }"
                  >
                    <input
                      type="checkbox"
                      :checked="isBodyPartCompatible(position, bp.name)"
                      @change="toggleCompatibleBodyPart(position.name, bp.name)"
                    />
                    {{ bp.name }}
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="add-item-form">
          <div class="form-row">
            <input v-model="newPositionName" placeholder="新姿势名称" class="input-field" />
          </div>
          <button :disabled="!newPositionName.trim()" class="btn-add" @click="addPosition">
            <Plus :size="16" />
            添加姿势
          </button>
        </div>
      </div>

      <!-- 惩罚数量设置 -->
      <div class="config-section">
        <div class="section-header">
          <h4>
            <Settings :size="18" />
            惩罚数量设置
          </h4>
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
                <Minus :size="14" />
              </button>
              <span class="strikes-value">{{ localConfig.minStrikes }}</span>
              <button
                :disabled="localConfig.minStrikes >= localConfig.maxStrikes"
                class="btn-stat"
                @click="updateMinStrikes(localConfig.minStrikes + 5)"
              >
                <Plus :size="14" />
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
                <Minus :size="14" />
              </button>
              <span class="strikes-value">{{ localConfig.maxStrikes }}</span>
              <button
                :disabled="localConfig.maxStrikes >= 100"
                class="btn-stat"
                @click="updateMaxStrikes(localConfig.maxStrikes + 5)"
              >
                <Plus :size="14" />
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
                <Minus :size="14" />
              </button>
              <span class="strikes-value">{{ localConfig.maxTakeoffFailures }}</span>
              <button
                :disabled="localConfig.maxTakeoffFailures >= 10"
                class="btn-stat"
                @click="updateMaxTakeoffFailures(localConfig.maxTakeoffFailures + 1)"
              >
                <Plus :size="14" />
              </button>
            </div>
          </div>

          <div class="strikes-item">
            <span class="strikes-label">翻倍概率</span>
            <div class="strikes-controls">
              <button
                :disabled="(localConfig.doublePunishmentChance ?? 0) <= 0"
                class="btn-stat"
                @click="updateDoublePunishmentChance((localConfig.doublePunishmentChance ?? 0) - 5)"
              >
                <Minus :size="14" />
              </button>
              <span class="strikes-value">{{ localConfig.doublePunishmentChance ?? 0 }}%</span>
              <button
                :disabled="(localConfig.doublePunishmentChance ?? 0) >= 50"
                class="btn-stat"
                @click="updateDoublePunishmentChance((localConfig.doublePunishmentChance ?? 0) + 5)"
              >
                <Plus :size="14" />
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
      <button class="btn btn-secondary" @click="resetToDefault">
        <RotateCcw :size="16" />
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
    margin-bottom: 1rem;
  }

  .punishment-config:hover {
    border-color: rgba(255, 255, 255, 0.1);
  }

  .config-header {
    text-align: center;
    margin-bottom: 1.5rem;
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
    gap: 1.2rem;
    margin-bottom: 1.5rem;
  }

  .config-section {
    border: var(--glass-border);
    border-radius: var(--radius-md);
    padding: 1rem;
    background: var(--bg-surface);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .section-header h4 {
    margin: 0;
    color: var(--text-primary);
    font-size: 1.1rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .section-summary {
    font-size: 0.8rem;
    color: var(--text-secondary);
    background: var(--bg-glass);
    padding: 0.2rem 0.5rem;
    border-radius: var(--radius-full);
    border: var(--glass-border);
  }

  .items-grid {
    display: grid;
    gap: 0.8rem;
    margin-bottom: 1rem;
  }

  .item-card {
    background: var(--bg-glass);
    backdrop-filter: blur(var(--glass-blur));
    border: var(--glass-border);
    border-radius: var(--radius-sm);
    padding: 0.8rem;
  }

  .item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.8rem;
  }

  .item-name {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 1rem;
  }

  .btn-remove {
    width: 24px;
    height: 24px;
    border: 1px solid rgba(239, 68, 68, 0.3);
    background: rgba(239, 68, 68, 0.15);
    color: var(--color-danger);
    border-radius: var(--radius-sm);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-fast);
  }

  .btn-remove:hover {
    background: rgba(239, 68, 68, 0.25);
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
    color: var(--text-secondary);
    min-width: 60px;
  }

  .compatible-body-parts {
    flex-direction: column;
    align-items: flex-start;
  }

  .body-part-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-top: 0.3rem;
  }

  .chip-label {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.2rem 0.5rem;
    border: var(--glass-border);
    border-radius: var(--radius-full);
    font-size: 0.8rem;
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

  .stat-controls {
    display: flex;
    align-items: center;
    gap: 0.3rem;
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

  .stat-value {
    min-width: 30px;
    text-align: center;
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--text-primary);
  }

  .ratio-slider {
    flex: 1;
    height: 4px;
    border-radius: 2px;
    background: var(--bg-secondary);
    outline: none;
    -webkit-appearance: none;
  }

  .ratio-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--color-accent);
    cursor: pointer;
    box-shadow: 0 0 8px rgba(102, 126, 234, 0.4);
  }

  .ratio-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--color-accent);
    cursor: pointer;
    border: none;
    box-shadow: 0 0 8px rgba(102, 126, 234, 0.4);
  }

  .add-item-form {
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding-top: 0.8rem;
  }

  .form-row {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .input-field,
  .input-mini {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: var(--text-primary);
    outline: none;
    transition: border-color var(--transition-normal);
    font-family: inherit;
  }

  .input-field::placeholder,
  .input-mini::placeholder {
    color: var(--text-muted);
  }

  .input-field:focus,
  .input-mini:focus {
    border-color: var(--color-accent);
  }

  .input-field {
    flex: 1;
    padding: 0.5rem;
    border-radius: var(--radius-sm);
    font-size: 0.9rem;
  }

  .input-mini {
    width: 60px;
    padding: 0.5rem;
    border-radius: var(--radius-sm);
    font-size: 0.9rem;
    text-align: center;
  }

  .btn-add {
    width: 100%;
    padding: 0.6rem;
    border: 1px solid rgba(102, 126, 234, 0.4);
    background: rgba(102, 126, 234, 0.2);
    color: var(--color-accent-light);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    transition: all var(--transition-normal);
  }

  .btn-add:hover:not(:disabled) {
    background: rgba(102, 126, 234, 0.3);
    border-color: rgba(102, 126, 234, 0.5);
  }

  .btn-add:disabled {
    opacity: 0.4;
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
    background: var(--bg-glass);
    border: var(--glass-border);
    border-radius: var(--radius-sm);
  }

  .strikes-label {
    font-weight: 600;
    color: var(--text-primary);
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
    color: var(--color-warning);
  }

  .strikes-description {
    text-align: center;
    padding: 0.6rem;
    background: rgba(245, 158, 11, 0.1);
    border-radius: var(--radius-sm);
    color: var(--color-warning);
    font-size: 0.85rem;
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
  }
</style>
