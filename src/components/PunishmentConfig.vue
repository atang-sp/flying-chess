<template>
  <div class="punishment-config">
    <div class="config-header">
      <h3>⚙️ 惩罚设置</h3>
      <p>设置游戏中的工具、部位、姿势和比例</p>
    </div>
    
    <div class="config-sections">
      <!-- 工具设置 -->
      <div class="config-section">
        <h4>🛠️ 工具设置</h4>
        <div class="tools-list">
          <div 
            v-for="(tool, idx) in config.tools" 
            :key="tool.id"
            class="tool-item"
          >
            <div class="tool-info">
              <span class="tool-name">{{ tool.name }}</span>
              <span class="tool-intensity">强度: {{ tool.intensity }}/5</span>
            </div>
            <div class="tool-controls">
              <div class="intensity-controls">
                <button 
                  @click="updateToolIntensity(tool.id, tool.intensity - 1)"
                  :disabled="tool.intensity <= 1"
                  class="btn-small"
                >-</button>
                <span class="intensity-value">{{ tool.intensity }}</span>
                <button 
                  @click="updateToolIntensity(tool.id, tool.intensity + 1)"
                  :disabled="tool.intensity >= 5"
                  class="btn-small"
                >+</button>
              </div>
              <div class="ratio-control">
                <label>比例: {{ Math.round(tool.ratio * 10) / 10 }}%</label>
                <input 
                  type="range" 
                  :min="0" 
                  :max="100" 
                  step="5"
                  v-model.number="tool.ratio"
                  @input="onToolRatioInput(idx, Math.round(tool.ratio / 5) * 5)"
                  class="ratio-slider"
                />
              </div>
              <button 
                @click="removeTool(tool.id)"
                class="btn-remove"
              >×</button>
            </div>
          </div>
        </div>
        <div class="add-item">
          <input 
            v-model="newToolName" 
            placeholder="新工具名称"
            class="input-field"
          />
          <input type="number" min="1" max="5" v-model.number="newToolIntensity" class="input-mini" placeholder="强度(1-5)" />
          <button 
            @click="addTool"
            :disabled="!newToolName.trim()"
            class="btn-add"
          >添加工具</button>
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
                  @click="updateBodyPartSensitivity(bodyPart.id, bodyPart.sensitivity - 1)"
                  :disabled="bodyPart.sensitivity <= 1"
                  class="btn-small"
                >-</button>
                <span class="sensitivity-value">{{ bodyPart.sensitivity }}</span>
                <button 
                  @click="updateBodyPartSensitivity(bodyPart.id, bodyPart.sensitivity + 1)"
                  :disabled="bodyPart.sensitivity >= 5"
                  class="btn-small"
                >+</button>
              </div>
              <div class="ratio-control">
                <label>比例: {{ Math.round(bodyPart.ratio * 10) / 10 }}%</label>
                <input 
                  type="range" 
                  :min="0" 
                  :max="100" 
                  step="5"
                  v-model.number="bodyPart.ratio"
                  @input="onBodyPartRatioInput(idx, Math.round(bodyPart.ratio / 5) * 5)"
                  class="ratio-slider"
                />
              </div>
              <button 
                @click="removeBodyPart(bodyPart.id)"
                class="btn-remove"
              >×</button>
            </div>
          </div>
        </div>
        <div class="add-item">
          <input 
            v-model="newBodyPartName" 
            placeholder="新部位名称"
            class="input-field"
          />
          <input type="number" min="1" max="5" v-model.number="newBodyPartSensitivity" class="input-mini" placeholder="耐受度(1-5)" />
          <button 
            @click="addBodyPart"
            :disabled="!newBodyPartName.trim()"
            class="btn-add"
          >添加部位</button>
        </div>
      </div>
      
      <!-- 姿势设置 -->
      <div class="config-section">
        <h4>🧘 姿势设置</h4>
        <div class="positions-list">
          <div 
            v-for="(position, idx) in config.positions" 
            :key="position.id"
            class="position-item"
          >
            <div class="position-info">
              <span class="position-name">{{ position.name }}</span>
              <span class="position-difficulty">难度: {{ position.difficulty }}/5</span>
            </div>
            <div class="position-controls">
              <div class="difficulty-controls">
                <button 
                  @click="updatePositionDifficulty(position.id, position.difficulty - 1)"
                  :disabled="position.difficulty <= 1"
                  class="btn-small"
                >-</button>
                <span class="difficulty-value">{{ position.difficulty }}</span>
                <button 
                  @click="updatePositionDifficulty(position.id, position.difficulty + 1)"
                  :disabled="position.difficulty >= 5"
                  class="btn-small"
                >+</button>
              </div>
              <div class="ratio-control">
                <label>比例: {{ Math.round(position.ratio * 10) / 10 }}%</label>
                <input 
                  type="range" 
                  :min="0" 
                  :max="100" 
                  step="5"
                  v-model.number="position.ratio"
                  @input="onPositionRatioInput(idx, Math.round(position.ratio / 5) * 5)"
                  class="ratio-slider"
                />
              </div>
              <button 
                @click="removePosition(position.id)"
                class="btn-remove"
              >×</button>
            </div>
          </div>
        </div>
        <div class="add-item">
          <input 
            v-model="newPositionName" 
            placeholder="新姿势名称"
            class="input-field"
          />
          <input type="number" min="1" max="5" v-model.number="newPositionDifficulty" class="input-mini" placeholder="难度(1-5)" />
          <button 
            @click="addPosition"
            :disabled="!newPositionName.trim()"
            class="btn-add"
          >添加姿势</button>
        </div>
      </div>
      
      <!-- 惩罚次数范围设置 -->
      <div class="config-section">
        <h4>🔢 惩罚次数范围设置</h4>
        <div class="strikes-range-control">
          <div class="strikes-control-group">
            <label>最小惩罚次数:</label>
            <div class="strikes-controls">
              <button 
                @click="updateMinStrikes(config.minStrikes - 1)"
                :disabled="config.minStrikes <= 1"
                class="btn-small"
              >-</button>
              <span class="strikes-value">{{ config.minStrikes }}</span>
              <button 
                @click="updateMinStrikes(config.minStrikes + 1)"
                :disabled="config.minStrikes >= config.maxStrikes - 1"
                class="btn-small"
              >+</button>
            </div>
          </div>
          <div class="strikes-control-group">
            <label>最大惩罚次数:</label>
            <div class="strikes-controls">
              <button 
                @click="updateMaxStrikes(config.maxStrikes - 1)"
                :disabled="config.maxStrikes <= config.minStrikes + 1"
                class="btn-small"
              >-</button>
              <span class="strikes-value">{{ config.maxStrikes }}</span>
              <button 
                @click="updateMaxStrikes(config.maxStrikes + 1)"
                :disabled="config.maxStrikes >= 100"
                class="btn-small"
              >+</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="config-actions">
      <button @click="resetToDefault" class="btn-secondary">重置默认</button>
      <button @click="saveConfig" class="btn-primary" :disabled="!isConfigValid">保存设置</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { PunishmentConfig, PunishmentTool, PunishmentBodyPart, PunishmentPosition } from '../types/game';
import { GAME_CONFIG } from '../config/gameConfig';
import { GameService } from '../services/gameService';

interface Props {
  config: PunishmentConfig;
}

interface Emits {
  (e: 'update', config: PunishmentConfig): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const newToolName = ref('');
const newToolIntensity = ref(3);
const newBodyPartName = ref('');
const newBodyPartSensitivity = ref(3);
const newPositionName = ref('');
const newPositionDifficulty = ref(3);

// 检查配置是否有效
const isConfigValid = computed(() => {
  return props.config.tools.length > 0 && 
         props.config.bodyParts.length > 0 && 
         props.config.positions.length > 0;
});

const updateConfig = () => {
  emit('update', props.config);
};

// 比例自动分配算法
function autoDistributeRatio(list: { ratio: number }[], changedIdx: number, newValue: number) {
  const n = list.length;
  if (n === 1) {
    list[0].ratio = 100;
    return;
  }
  
  // 限制新值在0~100之间
  newValue = Math.max(0, Math.min(100, newValue));
  
  // 计算当前选项之前的所有选项总和（这些保持不变）
  let sumBefore = 0;
  for (let i = 0; i < changedIdx; i++) {
    sumBefore += list[i].ratio;
  }
  
  // 计算当前选项和后续选项可用的总比例
  const availableRatio = 100 - sumBefore;
  
  // 如果新值超过可用比例，限制新值
  if (newValue > availableRatio) {
    newValue = availableRatio;
  }
  
  // 设置当前选项的比例
  list[changedIdx].ratio = newValue;
  
  // 计算剩余比例
  const remainingRatio = availableRatio - newValue;
  
  // 计算后续选项的数量
  const afterCount = n - changedIdx - 1;
  
  if (afterCount > 0) {
    // 将剩余比例分配给后续选项
    const baseRatio = Math.floor(remainingRatio / afterCount);
    const remainder = remainingRatio % afterCount;
    
    for (let i = changedIdx + 1; i < n; i++) {
      // 前面的选项获得基础比例，最后一个选项获得基础比例加余数
      if (i === n - 1) {
        list[i].ratio = baseRatio + remainder;
      } else {
        list[i].ratio = baseRatio;
      }
    }
  } else if (afterCount === 0) {
    // 如果没有后续选项，当前选项就是最后一个
    // 确保总和为100
    list[changedIdx].ratio = 100 - sumBefore;
  }
}

const onToolRatioInput = (idx: number, value: number) => {
  autoDistributeRatio(props.config.tools, idx, value);
  updateConfig();
};
const onBodyPartRatioInput = (idx: number, value: number) => {
  autoDistributeRatio(props.config.bodyParts, idx, value);
  updateConfig();
};
const onPositionRatioInput = (idx: number, value: number) => {
  autoDistributeRatio(props.config.positions, idx, value);
  updateConfig();
};

const updateToolIntensity = (toolId: string, newIntensity: number) => {
  const tool = props.config.tools.find(t => t.id === toolId);
  if (tool && newIntensity >= 1 && newIntensity <= 5) {
    tool.intensity = newIntensity;
    updateConfig();
  }
};

const removeTool = (toolId: string) => {
  const index = props.config.tools.findIndex(t => t.id === toolId);
  if (index > -1) {
    props.config.tools.splice(index, 1);
    // 重新分配比例
    if (props.config.tools.length > 0) {
      autoDistributeRatio(props.config.tools, 0, props.config.tools[0].ratio);
    }
    updateConfig();
  }
};

const addTool = () => {
  if (newToolName.value.trim()) {
    const n = props.config.tools.length + 1;
    const ratio = 100 / n;
    props.config.tools.forEach(t => t.ratio = ratio);
    const newTool: PunishmentTool = {
      id: `tool_${Date.now()}`,
      name: newToolName.value.trim(),
      intensity: Math.max(1, Math.min(5, newToolIntensity.value)),
      ratio
    };
    props.config.tools.push(newTool);
    newToolName.value = '';
    newToolIntensity.value = 3;
    updateConfig();
  }
};

const updateBodyPartSensitivity = (bodyPartId: string, newSensitivity: number) => {
  const bodyPart = props.config.bodyParts.find(b => b.id === bodyPartId);
  if (bodyPart && newSensitivity >= 1 && newSensitivity <= 5) {
    bodyPart.sensitivity = newSensitivity;
    updateConfig();
  }
};

const removeBodyPart = (bodyPartId: string) => {
  const index = props.config.bodyParts.findIndex(b => b.id === bodyPartId);
  if (index > -1) {
    props.config.bodyParts.splice(index, 1);
    if (props.config.bodyParts.length > 0) {
      autoDistributeRatio(props.config.bodyParts, 0, props.config.bodyParts[0].ratio);
    }
    updateConfig();
  }
};

const addBodyPart = () => {
  if (newBodyPartName.value.trim()) {
    const n = props.config.bodyParts.length + 1;
    const ratio = 100 / n;
    props.config.bodyParts.forEach(b => b.ratio = ratio);
    const newBodyPart: PunishmentBodyPart = {
      id: `bodypart_${Date.now()}`,
      name: newBodyPartName.value.trim(),
      sensitivity: Math.max(1, Math.min(5, newBodyPartSensitivity.value)),
      ratio
    };
    props.config.bodyParts.push(newBodyPart);
    newBodyPartName.value = '';
    newBodyPartSensitivity.value = 3;
    updateConfig();
  }
};

const updatePositionDifficulty = (positionId: string, newDifficulty: number) => {
  const position = props.config.positions.find(p => p.id === positionId);
  if (position && newDifficulty >= 1 && newDifficulty <= 5) {
    position.difficulty = newDifficulty;
    updateConfig();
  }
};

const removePosition = (positionId: string) => {
  const index = props.config.positions.findIndex(p => p.id === positionId);
  if (index > -1) {
    props.config.positions.splice(index, 1);
    if (props.config.positions.length > 0) {
      autoDistributeRatio(props.config.positions, 0, props.config.positions[0].ratio);
    }
    updateConfig();
  }
};

const addPosition = () => {
  if (newPositionName.value.trim()) {
    const n = props.config.positions.length + 1;
    const ratio = 100 / n;
    props.config.positions.forEach(p => p.ratio = ratio);
    const newPosition: PunishmentPosition = {
      id: `position_${Date.now()}`,
      name: newPositionName.value.trim(),
      difficulty: Math.max(1, Math.min(5, newPositionDifficulty.value)),
      ratio
    };
    props.config.positions.push(newPosition);
    newPositionName.value = '';
    newPositionDifficulty.value = 3;
    updateConfig();
  }
};

const updateMinStrikes = (newMinStrikes: number) => {
  if (newMinStrikes >= 1 && newMinStrikes < props.config.maxStrikes) {
    props.config.minStrikes = newMinStrikes;
    updateConfig();
  }
};

const updateMaxStrikes = (newMaxStrikes: number) => {
  if (newMaxStrikes >= props.config.minStrikes && newMaxStrikes <= 100) {
    props.config.maxStrikes = newMaxStrikes;
    updateConfig();
  }
};

const resetToDefault = () => {
  const defaultConfig = GameService.createPunishmentConfig();
  Object.assign(props.config, defaultConfig);
  updateConfig();
};

const saveConfig = () => {
  updateConfig();
};
</script>

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

.strikes-range-control {
  display: flex;
  flex-direction: column;
  gap: clamp(1rem, 3vw, 1.5rem);
}

.strikes-control-group {
  display: flex;
  align-items: center;
  gap: clamp(0.8rem, 2.5vw, 1rem);
}

.strikes-control-group label {
  min-width: clamp(100px, 25vw, 120px);
  font-size: clamp(0.9rem, 2.5vw, 1rem);
  color: #333;
  font-weight: 500;
}

.strikes-controls {
  display: flex;
  align-items: center;
  gap: clamp(0.4rem, 1vw, 0.5rem);
}

.strikes-value {
  min-width: clamp(35px, 8vw, 40px);
  text-align: center;
  font-weight: bold;
  font-size: clamp(1rem, 3vw, 1.1rem);
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