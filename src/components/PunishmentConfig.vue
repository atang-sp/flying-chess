<script setup lang="ts">
  import { ref, computed } from 'vue'
  import type {
    PunishmentConfig,
    PunishmentTool,
    PunishmentBodyPart,
    PunishmentPosition,
  } from '../types/game'
  import { GAME_CONFIG } from '../config/gameConfig'
  import { GameService } from '../services/gameService'

  interface Props {
    config: PunishmentConfig
  }

  interface Emits {
    (e: 'update', config: PunishmentConfig): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  const newToolName = ref('')
  const newToolIntensity = ref(3)
  const newBodyPartName = ref('')
  const newBodyPartSensitivity = ref(3)
  const newPositionName = ref('')
  const newPositionDifficulty = ref(3)

  // 检查配置是否有效
  const isConfigValid = computed(() => {
    return (
      props.config.tools.length > 0 &&
      props.config.bodyParts.length > 0 &&
      props.config.positions.length > 0
    )
  })

  const updateConfig = () => {
    emit('update', props.config)
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

  const onToolRatioInput = (idx: number, value: number) => {
    const newConfig = { ...props.config }
    autoDistributeRatio(newConfig.tools, idx, value)
    emit('update', newConfig)
  }
  const onBodyPartRatioInput = (idx: number, value: number) => {
    const newConfig = { ...props.config }
    autoDistributeRatio(newConfig.bodyParts, idx, value)
    emit('update', newConfig)
  }
  const onPositionRatioInput = (idx: number, value: number) => {
    const newConfig = { ...props.config }
    autoDistributeRatio(newConfig.positions, idx, value)
    emit('update', newConfig)
  }

  const updateToolIntensity = (toolId: string, newIntensity: number) => {
    const newConfig = { ...props.config }
    const tool = newConfig.tools.find(t => t.id === toolId)
    if (tool && newIntensity >= 1 && newIntensity <= 5) {
      tool.intensity = newIntensity
      emit('update', newConfig)
    }
  }

  const removeTool = (toolId: string) => {
    const newConfig = { ...props.config }
    const index = newConfig.tools.findIndex(t => t.id === toolId)
    if (index > -1) {
      newConfig.tools.splice(index, 1)
      // 重新分配比例
      if (newConfig.tools.length > 0) {
        autoDistributeRatio(newConfig.tools, 0, newConfig.tools[0].ratio)
      }
      emit('update', newConfig)
    }
  }

  const addTool = () => {
    if (newToolName.value.trim()) {
      const newConfig = { ...props.config }
      const n = newConfig.tools.length + 1
      const ratio = 100 / n
      newConfig.tools.forEach(t => (t.ratio = ratio))
      const newTool: PunishmentTool = {
        id: `tool_${Date.now()}`,
        name: newToolName.value.trim(),
        intensity: Math.max(1, Math.min(5, newToolIntensity.value)),
        ratio,
      }
      newConfig.tools.push(newTool)
      newToolName.value = ''
      newToolIntensity.value = 3
      emit('update', newConfig)
    }
  }

  const updateBodyPartSensitivity = (bodyPartId: string, newSensitivity: number) => {
    const newConfig = { ...props.config }
    const bodyPart = newConfig.bodyParts.find(b => b.id === bodyPartId)
    if (bodyPart && newSensitivity >= 1 && newSensitivity <= 5) {
      bodyPart.sensitivity = newSensitivity
      emit('update', newConfig)
    }
  }

  const removeBodyPart = (bodyPartId: string) => {
    const newConfig = { ...props.config }
    const index = newConfig.bodyParts.findIndex(b => b.id === bodyPartId)
    if (index > -1) {
      newConfig.bodyParts.splice(index, 1)
      if (newConfig.bodyParts.length > 0) {
        autoDistributeRatio(newConfig.bodyParts, 0, newConfig.bodyParts[0].ratio)
      }
      emit('update', newConfig)
    }
  }

  const addBodyPart = () => {
    if (newBodyPartName.value.trim()) {
      const newConfig = { ...props.config }
      const n = newConfig.bodyParts.length + 1
      const ratio = 100 / n
      newConfig.bodyParts.forEach(b => (b.ratio = ratio))
      const newBodyPart: PunishmentBodyPart = {
        id: `bodypart_${Date.now()}`,
        name: newBodyPartName.value.trim(),
        sensitivity: Math.max(1, Math.min(5, newBodyPartSensitivity.value)),
        ratio,
      }
      newConfig.bodyParts.push(newBodyPart)
      newBodyPartName.value = ''
      newBodyPartSensitivity.value = 3
      emit('update', newConfig)
    }
  }

  const updatePositionDifficulty = (positionId: string, newDifficulty: number) => {
    const newConfig = { ...props.config }
    const position = newConfig.positions.find(p => p.id === positionId)
    if (position && newDifficulty >= 1 && newDifficulty <= 5) {
      position.difficulty = newDifficulty
      emit('update', newConfig)
    }
  }

  const removePosition = (positionId: string) => {
    const newConfig = { ...props.config }
    const index = newConfig.positions.findIndex(p => p.id === positionId)
    if (index > -1) {
      newConfig.positions.splice(index, 1)
      if (newConfig.positions.length > 0) {
        autoDistributeRatio(newConfig.positions, 0, newConfig.positions[0].ratio)
      }
      emit('update', newConfig)
    }
  }

  const addPosition = () => {
    if (newPositionName.value.trim()) {
      const newConfig = { ...props.config }
      const n = newConfig.positions.length + 1
      const ratio = 100 / n
      newConfig.positions.forEach(p => (p.ratio = ratio))
      const newPosition: PunishmentPosition = {
        id: `position_${Date.now()}`,
        name: newPositionName.value.trim(),
        difficulty: Math.max(1, Math.min(5, newPositionDifficulty.value)),
        ratio,
      }
      newConfig.positions.push(newPosition)
      newPositionName.value = ''
      newPositionDifficulty.value = 3
      emit('update', newConfig)
    }
  }

  const resetToDefault = () => {
    const defaultConfig = GameService.createPunishmentConfig()
    emit('update', defaultConfig)
  }

  const saveConfig = () => {
    emit('update', props.config)
  }

  const updateMinStrikes = (newValue: number) => {
    const newConfig = { ...props.config }
    newConfig.minStrikes = Math.max(5, newValue)
    if (newConfig.minStrikes > newConfig.maxStrikes) {
      newConfig.maxStrikes = newConfig.minStrikes
    }
    emit('update', newConfig)
  }

  const updateMaxStrikes = (newValue: number) => {
    const newConfig = { ...props.config }
    newConfig.maxStrikes = Math.max(newConfig.minStrikes, newValue)
    emit('update', newConfig)
  }
</script>

<template>
  <div class="punishment-config">
    <div class="config-header">
      <h3>⚙️ 惩罚设置</h3>
    </div>

    <div class="config-sections compact">
      <!-- 工具设置 -->
      <div class="config-section">
        <h4>🛠️ 工具设置</h4>
        <div class="tools-list">
          <div v-for="(tool, idx) in config.tools" :key="tool.id" class="tool-item">
            <div class="tool-info">
              <span class="tool-name">{{ tool.name }}</span>
              <span class="tool-intensity">强度: {{ tool.intensity }}/5</span>
            </div>
            <div class="tool-controls">
              <div class="intensity-controls">
                <button
                  :disabled="tool.intensity <= 1"
                  class="btn-small"
                  @click="updateToolIntensity(tool.id, tool.intensity - 1)"
                >
                  -
                </button>
                <span class="intensity-value">{{ tool.intensity }}</span>
                <button
                  :disabled="tool.intensity >= 5"
                  class="btn-small"
                  @click="updateToolIntensity(tool.id, tool.intensity + 1)"
                >
                  +
                </button>
              </div>
              <div class="ratio-control">
                <label>比例: {{ Math.round(tool.ratio * 10) / 10 }}%</label>
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
              <button class="btn-remove" @click="removeTool(tool.id)">×</button>
            </div>
          </div>
        </div>
        <div class="add-item">
          <input v-model="newToolName" placeholder="新工具名称" class="input-field" />
          <input
            v-model.number="newToolIntensity"
            type="number"
            min="1"
            max="5"
            class="input-mini"
            placeholder="强度(1-5)"
          />
          <button :disabled="!newToolName.trim()" class="btn-add" @click="addTool">添加工具</button>
        </div>
      </div>

      <!-- 部位设置 -->
      <div class="config-section">
        <h4>🎯 部位设置</h4>
        <div class="body-parts-list">
          <div
            v-for="(bodyPart, idx) in config.bodyParts"
            :key="bodyPart.id"
            class="body-part-item"
          >
            <div class="body-part-info">
              <span class="body-part-name">{{ bodyPart.name }}</span>
              <span class="body-part-sensitivity">耐受度: {{ bodyPart.sensitivity }}/5</span>
            </div>
            <div class="body-part-controls">
              <div class="sensitivity-controls">
                <button
                  :disabled="bodyPart.sensitivity <= 1"
                  class="btn-small"
                  @click="updateBodyPartSensitivity(bodyPart.id, bodyPart.sensitivity - 1)"
                >
                  -
                </button>
                <span class="sensitivity-value">{{ bodyPart.sensitivity }}</span>
                <button
                  :disabled="bodyPart.sensitivity >= 5"
                  class="btn-small"
                  @click="updateBodyPartSensitivity(bodyPart.id, bodyPart.sensitivity + 1)"
                >
                  +
                </button>
              </div>
              <div class="ratio-control">
                <label>比例: {{ Math.round(bodyPart.ratio * 10) / 10 }}%</label>
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
              <button class="btn-remove" @click="removeBodyPart(bodyPart.id)">×</button>
            </div>
          </div>
        </div>
        <div class="add-item">
          <input v-model="newBodyPartName" placeholder="新部位名称" class="input-field" />
          <input
            v-model.number="newBodyPartSensitivity"
            type="number"
            min="1"
            max="5"
            class="input-mini"
            placeholder="耐受度(1-5)"
          />
          <button :disabled="!newBodyPartName.trim()" class="btn-add" @click="addBodyPart">
            添加部位
          </button>
        </div>
      </div>

      <!-- 姿势设置 -->
      <div class="config-section">
        <h4>🧘 姿势设置</h4>
        <div class="positions-list">
          <div v-for="(position, idx) in config.positions" :key="position.id" class="position-item">
            <div class="position-info">
              <span class="position-name">{{ position.name }}</span>
              <span class="position-difficulty">难度: {{ position.difficulty }}/5</span>
            </div>
            <div class="position-controls">
              <div class="difficulty-controls">
                <button
                  :disabled="position.difficulty <= 1"
                  class="btn-small"
                  @click="updatePositionDifficulty(position.id, position.difficulty - 1)"
                >
                  -
                </button>
                <span class="difficulty-value">{{ position.difficulty }}</span>
                <button
                  :disabled="position.difficulty >= 5"
                  class="btn-small"
                  @click="updatePositionDifficulty(position.id, position.difficulty + 1)"
                >
                  +
                </button>
              </div>
              <div class="ratio-control">
                <label>比例: {{ Math.round(position.ratio * 10) / 10 }}%</label>
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
              <button class="btn-remove" @click="removePosition(position.id)">×</button>
            </div>
          </div>
        </div>
        <div class="add-item">
          <input v-model="newPositionName" placeholder="新姿势名称" class="input-field" />
          <input
            v-model.number="newPositionDifficulty"
            type="number"
            min="1"
            max="5"
            class="input-mini"
            placeholder="难度(1-5)"
          />
          <button :disabled="!newPositionName.trim()" class="btn-add" @click="addPosition">
            添加姿势
          </button>
        </div>
      </div>

      <!-- 惩罚数量设置 -->
      <div class="config-section">
        <h4>🔢 惩罚数量设置</h4>
        <div class="strikes-config">
          <div class="strikes-item">
            <label class="strikes-label">最小惩罚次数</label>
            <div class="strikes-controls">
              <button
                :disabled="config.minStrikes <= 5"
                class="btn-small"
                @click="updateMinStrikes(config.minStrikes - 5)"
              >
                -
              </button>
              <span class="strikes-value">{{ config.minStrikes }}</span>
              <button
                :disabled="config.minStrikes >= config.maxStrikes"
                class="btn-small"
                @click="updateMinStrikes(config.minStrikes + 5)"
              >
                +
              </button>
            </div>
          </div>
          <div class="strikes-item">
            <label class="strikes-label">最大惩罚次数</label>
            <div class="strikes-controls">
              <button
                :disabled="config.maxStrikes <= config.minStrikes"
                class="btn-small"
                @click="updateMaxStrikes(config.maxStrikes - 5)"
              >
                -
              </button>
              <span class="strikes-value">{{ config.maxStrikes }}</span>
              <button
                :disabled="config.maxStrikes >= 100"
                class="btn-small"
                @click="updateMaxStrikes(config.maxStrikes + 5)"
              >
                +
              </button>
            </div>
          </div>
          <div class="strikes-description">
            惩罚次数将在 {{ config.minStrikes }} - {{ config.maxStrikes }} 之间随机生成
          </div>
        </div>
      </div>
    </div>

    <div class="config-actions">
      <button class="btn-secondary" @click="resetToDefault">重置默认</button>
      <button class="btn-primary" :disabled="!isConfigValid" @click="saveConfig">保存设置</button>
    </div>
  </div>
</template>

<style scoped>
  .punishment-config {
    background: white;
    border-radius: clamp(6px, 1.5vw, 8px);
    padding: clamp(1rem, 3vw, 1.5rem);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    margin-bottom: clamp(0.5rem, 2vw, 1rem);
  }

  .config-header {
    text-align: center;
    margin-bottom: clamp(1.5rem, 4vw, 2rem);
  }

  .config-header h3 {
    margin: 0 0 clamp(0.25rem, 1vw, 0.5rem) 0;
    color: #333;
    font-size: clamp(1.2rem, 4vw, 1.5rem);
  }

  .config-header p {
    margin: 0;
    color: #666;
    font-size: clamp(0.8rem, 2.5vw, 1rem);
  }

  .config-sections {
    display: grid;
    gap: clamp(1.5rem, 4vw, 2rem);
    margin-bottom: clamp(1.5rem, 4vw, 2rem);
  }

  .config-sections.compact {
    gap: clamp(0.8rem, 2vw, 1.2rem);
    margin-bottom: clamp(0.8rem, 2vw, 1.2rem);
  }

  .config-sections.compact .config-section {
    padding: clamp(0.6rem, 1.5vw, 0.8rem);
  }

  .config-sections.compact .config-section h4 {
    margin-bottom: clamp(0.6rem, 1.5vw, 0.8rem);
    font-size: clamp(0.9rem, 2.5vw, 1rem);
  }

  .config-sections.compact .tool-item,
  .config-sections.compact .body-part-item,
  .config-sections.compact .position-item {
    padding: clamp(0.5rem, 1.2vw, 0.7rem);
    gap: clamp(0.5rem, 1.2vw, 0.7rem);
  }

  .config-sections.compact .strikes-item {
    padding: clamp(0.5rem, 1.2vw, 0.7rem);
  }

  .config-sections.compact .strikes-config {
    gap: clamp(0.5rem, 1.2vw, 0.7rem);
  }

  .config-sections.compact .tools-list,
  .config-sections.compact .body-parts-list,
  .config-sections.compact .positions-list {
    gap: clamp(0.5rem, 1.2vw, 0.7rem);
    margin-bottom: clamp(0.5rem, 1.2vw, 0.7rem);
  }

  .config-section {
    border: 1px solid #e0e0e0;
    border-radius: clamp(4px, 1vw, 6px);
    padding: clamp(0.8rem, 2.5vw, 1rem);
  }

  .config-section h4 {
    margin: 0 0 clamp(0.8rem, 2.5vw, 1rem) 0;
    color: #333;
    font-size: clamp(1rem, 3vw, 1.2rem);
  }

  .tools-list,
  .body-parts-list,
  .positions-list {
    display: flex;
    flex-direction: column;
    gap: clamp(0.8rem, 2.5vw, 1rem);
    margin-bottom: clamp(0.8rem, 2.5vw, 1rem);
  }

  .tool-item,
  .body-part-item,
  .position-item {
    display: flex;
    flex-direction: column;
    gap: clamp(0.8rem, 2.5vw, 1rem);
    padding: clamp(0.8rem, 2.5vw, 1rem);
    background: #f8f9fa;
    border-radius: clamp(6px, 1.5vw, 8px);
    border-left: 4px solid #4ecdc4;
  }

  .tool-info,
  .body-part-info,
  .position-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .tool-name,
  .body-part-name,
  .position-name {
    font-weight: bold;
    color: #333;
    font-size: clamp(1rem, 3vw, 1.1rem);
  }

  .tool-intensity,
  .body-part-sensitivity,
  .position-difficulty {
    font-size: clamp(0.8rem, 2.5vw, 0.9rem);
    color: #666;
    background: #e0e0e0;
    padding: clamp(0.2rem, 0.5vw, 0.25rem) clamp(0.4rem, 1vw, 0.5rem);
    border-radius: clamp(3px, 0.8vw, 4px);
  }

  .tool-controls,
  .body-part-controls,
  .position-controls {
    display: flex;
    align-items: center;
    gap: clamp(0.8rem, 2.5vw, 1rem);
    flex-wrap: wrap;
  }

  .intensity-controls,
  .sensitivity-controls,
  .difficulty-controls {
    display: flex;
    align-items: center;
    gap: clamp(0.2rem, 0.5vw, 0.25rem);
  }

  .btn-small {
    width: clamp(24px, 6vw, 28px);
    height: clamp(24px, 6vw, 28px);
    border: 1px solid #ddd;
    background: white;
    border-radius: clamp(3px, 0.8vw, 4px);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: clamp(0.8rem, 2.5vw, 0.9rem);
    font-weight: bold;
  }

  .btn-small:hover:not(:disabled) {
    background: #f0f0f0;
  }

  .btn-small:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .intensity-value,
  .sensitivity-value,
  .difficulty-value {
    min-width: clamp(20px, 5vw, 24px);
    text-align: center;
    font-weight: bold;
    font-size: clamp(0.9rem, 2.5vw, 1rem);
  }

  .ratio-control {
    display: flex;
    flex-direction: column;
    gap: clamp(0.2rem, 0.5vw, 0.25rem);
    min-width: clamp(120px, 30vw, 150px);
  }

  .ratio-control label {
    font-size: clamp(0.7rem, 2vw, 0.8rem);
    color: #666;
  }

  .ratio-slider {
    width: 100%;
    height: clamp(4px, 1vw, 6px);
    border-radius: clamp(2px, 0.5vw, 3px);
    background: #ddd;
    outline: none;
    -webkit-appearance: none;
  }

  .ratio-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: clamp(16px, 4vw, 18px);
    height: clamp(16px, 4vw, 18px);
    border-radius: 50%;
    background: #4ecdc4;
    cursor: pointer;
  }

  .ratio-slider::-moz-range-thumb {
    width: clamp(16px, 4vw, 18px);
    height: clamp(16px, 4vw, 18px);
    border-radius: 50%;
    background: #4ecdc4;
    cursor: pointer;
    border: none;
  }

  .btn-remove {
    width: clamp(24px, 6vw, 28px);
    height: clamp(24px, 6vw, 28px);
    border: 1px solid #ff6b6b;
    background: #ff6b6b;
    color: white;
    border-radius: clamp(3px, 0.8vw, 4px);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .strikes-config {
    display: flex;
    flex-direction: column;
    gap: clamp(1rem, 2.5vw, 1.5rem);
  }

  .strikes-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: clamp(0.8rem, 2vw, 1rem);
    background: #f8f9fa;
    border-radius: clamp(6px, 1.5vw, 8px);
    border-left: 4px solid #ffa726;
  }

  .strikes-label {
    font-weight: bold;
    color: #333;
    font-size: clamp(1rem, 3vw, 1.1rem);
  }

  .strikes-controls {
    display: flex;
    align-items: center;
    gap: clamp(0.5rem, 1.5vw, 0.8rem);
  }

  .strikes-value {
    min-width: clamp(40px, 10vw, 50px);
    text-align: center;
    font-weight: bold;
    font-size: clamp(1rem, 3vw, 1.2rem);
    color: #ffa726;
  }

  .strikes-description {
    text-align: center;
    padding: clamp(0.8rem, 2vw, 1rem);
    background: #fff3e0;
    border-radius: clamp(6px, 1.5vw, 8px);
    color: #e65100;
    font-size: clamp(0.85rem, 2.5vw, 0.95rem);
    border: 1px solid #ffcc80;
    font-size: clamp(0.9rem, 2.5vw, 1rem);
    font-weight: bold;
  }

  .btn-remove:hover {
    background: #ff4757;
  }

  .add-item {
    display: flex;
    gap: clamp(0.4rem, 1vw, 0.5rem);
  }

  .input-field {
    flex: 1;
    padding: clamp(0.4rem, 1vw, 0.5rem);
    border: 1px solid #ddd;
    border-radius: clamp(3px, 0.8vw, 4px);
    font-size: clamp(0.8rem, 2.5vw, 0.9rem);
  }

  .input-mini {
    width: clamp(50px, 12vw, 60px);
    margin-left: clamp(0.4rem, 1vw, 0.5rem);
    margin-right: clamp(0.4rem, 1vw, 0.5rem);
    padding: clamp(0.3rem, 0.8vw, 0.4rem) clamp(0.15rem, 0.4vw, 0.2rem);
    border: 1px solid #ddd;
    border-radius: clamp(3px, 0.8vw, 4px);
    font-size: clamp(0.8rem, 2.5vw, 0.9rem);
    text-align: center;
  }

  .btn-add {
    padding: clamp(0.4rem, 1vw, 0.5rem) clamp(0.8rem, 2vw, 1rem);
    border: 1px solid #4ecdc4;
    background: #4ecdc4;
    color: white;
    border-radius: clamp(3px, 0.8vw, 4px);
    cursor: pointer;
    font-size: clamp(0.8rem, 2.5vw, 0.9rem);
  }

  .btn-add:hover:not(:disabled) {
    background: #44a08d;
  }

  .btn-add:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .config-actions {
    display: flex;
    gap: clamp(0.8rem, 2.5vw, 1rem);
    justify-content: center;
  }

  .btn-primary,
  .btn-secondary {
    padding: clamp(0.6rem, 2vw, 0.75rem) clamp(1.2rem, 3vw, 1.5rem);
    border: none;
    border-radius: clamp(4px, 1vw, 6px);
    font-size: clamp(0.9rem, 2.5vw, 1rem);
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
    min-height: clamp(36px, 8vw, 44px);
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

  /* 自适应布局 - 移除固定断点，使用相对单位 */
  @media (max-width: 1023px) {
    .config-sections {
      grid-template-columns: 1fr;
      gap: clamp(0.8rem, 2.5vw, 1rem);
    }

    .tool-controls,
    .body-part-controls,
    .position-controls {
      flex-direction: column;
      align-items: stretch;
    }

    .ratio-control {
      min-width: auto;
    }

    .add-item {
      flex-direction: column;
      gap: clamp(0.4rem, 1vw, 0.5rem);
    }

    .input-mini {
      width: 100%;
      margin: clamp(0.4rem, 1vw, 0.5rem) 0;
    }

    .strikes-control-group {
      flex-direction: column;
      align-items: stretch;
      gap: clamp(0.4rem, 1vw, 0.5rem);
    }

    .strikes-control-group label {
      min-width: auto;
      text-align: center;
    }

    .config-actions {
      flex-direction: column;
      gap: clamp(0.4rem, 1vw, 0.5rem);
    }

    .btn-primary,
    .btn-secondary {
      width: 100%;
      max-width: min(300px, 80vw);
      justify-content: center;
    }
  }
</style>
