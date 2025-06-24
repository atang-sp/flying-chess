<template>
  <div class="punishment-config">
    <div class="config-header">
      <h3>⚙️ 惩罚设置</h3>
      <p>设置游戏中的工具、部位和最大次数</p>
    </div>
    
    <div class="config-sections">
      <!-- 工具设置 -->
      <div class="config-section">
        <h4>🛠️ 工具设置</h4>
        <div class="tools-list">
          <div 
            v-for="tool in config.tools" 
            :key="tool.id"
            class="tool-item"
          >
            <div class="tool-info">
              <span class="tool-name">{{ tool.name }}</span>
              <span class="tool-intensity">强度: {{ tool.intensity }}/5</span>
            </div>
            <div class="tool-controls">
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
            v-for="bodyPart in config.bodyParts" 
            :key="bodyPart.id"
            class="body-part-item"
          >
            <div class="body-part-info">
              <span class="body-part-name">{{ bodyPart.name }}</span>
              <span class="body-part-sensitivity">敏感度: {{ bodyPart.sensitivity }}/5</span>
            </div>
            <div class="body-part-controls">
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
          <button 
            @click="addBodyPart"
            :disabled="!newBodyPartName.trim()"
            class="btn-add"
          >添加部位</button>
        </div>
      </div>
      
      <!-- 最大次数设置 -->
      <div class="config-section">
        <h4>🔢 最大次数设置</h4>
        <div class="max-strikes-control">
          <label>最大惩罚次数:</label>
          <div class="strikes-controls">
            <button 
              @click="updateMaxStrikes(config.maxStrikes - 5)"
              :disabled="config.maxStrikes <= 5"
              class="btn-small"
            >-5</button>
            <span class="strikes-value">{{ config.maxStrikes }}</span>
            <button 
              @click="updateMaxStrikes(config.maxStrikes + 5)"
              :disabled="config.maxStrikes >= 100"
              class="btn-small"
            >+5</button>
          </div>
        </div>
      </div>
    </div>
    
    <div class="config-actions">
      <button @click="resetToDefault" class="btn-secondary">重置默认</button>
      <button @click="saveConfig" class="btn-primary">保存设置</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import type { PunishmentConfig, PunishmentTool, PunishmentBodyPart } from '../types/game';
import { GAME_CONFIG } from '../config/gameConfig';

interface Props {
  config: PunishmentConfig;
}

interface Emits {
  (e: 'update', config: PunishmentConfig): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const newToolName = ref('');
const newBodyPartName = ref('');

const updateToolIntensity = (toolId: string, newIntensity: number) => {
  const tool = props.config.tools.find(t => t.id === toolId);
  if (tool && newIntensity >= 1 && newIntensity <= 5) {
    tool.intensity = newIntensity;
    emit('update', props.config);
  }
};

const removeTool = (toolId: string) => {
  const index = props.config.tools.findIndex(t => t.id === toolId);
  if (index > -1) {
    props.config.tools.splice(index, 1);
    emit('update', props.config);
  }
};

const addTool = () => {
  if (newToolName.value.trim()) {
    const newTool: PunishmentTool = {
      id: `tool_${Date.now()}`,
      name: newToolName.value.trim(),
      intensity: 3
    };
    props.config.tools.push(newTool);
    newToolName.value = '';
    emit('update', props.config);
  }
};

const updateBodyPartSensitivity = (bodyPartId: string, newSensitivity: number) => {
  const bodyPart = props.config.bodyParts.find(b => b.id === bodyPartId);
  if (bodyPart && newSensitivity >= 1 && newSensitivity <= 5) {
    bodyPart.sensitivity = newSensitivity;
    emit('update', props.config);
  }
};

const removeBodyPart = (bodyPartId: string) => {
  const index = props.config.bodyParts.findIndex(b => b.id === bodyPartId);
  if (index > -1) {
    props.config.bodyParts.splice(index, 1);
    emit('update', props.config);
  }
};

const addBodyPart = () => {
  if (newBodyPartName.value.trim()) {
    const newBodyPart: PunishmentBodyPart = {
      id: `bodypart_${Date.now()}`,
      name: newBodyPartName.value.trim(),
      sensitivity: 3
    };
    props.config.bodyParts.push(newBodyPart);
    newBodyPartName.value = '';
    emit('update', props.config);
  }
};

const updateMaxStrikes = (newMaxStrikes: number) => {
  if (newMaxStrikes >= 5 && newMaxStrikes <= 100) {
    props.config.maxStrikes = newMaxStrikes;
    emit('update', props.config);
  }
};

const resetToDefault = () => {
  props.config.tools = [...GAME_CONFIG.DEFAULT_TOOLS];
  props.config.bodyParts = [...GAME_CONFIG.DEFAULT_BODY_PARTS];
  props.config.maxStrikes = 30;
  emit('update', props.config);
};

const saveConfig = () => {
  emit('update', props.config);
};
</script>

<style scoped>
.punishment-config {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 1rem;
}

.config-header {
  text-align: center;
  margin-bottom: 2rem;
}

.config-header h3 {
  margin: 0 0 0.5rem 0;
  color: #333;
}

.config-header p {
  margin: 0;
  color: #666;
}

.config-sections {
  display: grid;
  gap: 2rem;
  margin-bottom: 2rem;
}

.config-section {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 1rem;
}

.config-section h4 {
  margin: 0 0 1rem 0;
  color: #333;
}

.tools-list,
.body-parts-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.tool-item,
.body-part-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: #f8f9fa;
  border-radius: 4px;
}

.tool-info,
.body-part-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.tool-name,
.body-part-name {
  font-weight: bold;
  color: #333;
}

.tool-intensity,
.body-part-sensitivity {
  font-size: 0.8rem;
  color: #666;
}

.tool-controls,
.body-part-controls {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.btn-small {
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
}

.btn-small:hover:not(:disabled) {
  background: #f0f0f0;
}

.btn-small:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.intensity-value,
.sensitivity-value {
  min-width: 20px;
  text-align: center;
  font-weight: bold;
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
  font-size: 0.8rem;
}

.btn-remove:hover {
  background: #ff4757;
}

.add-item {
  display: flex;
  gap: 0.5rem;
}

.input-field {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
}

.btn-add {
  padding: 0.5rem 1rem;
  border: 1px solid #4ecdc4;
  background: #4ecdc4;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-add:hover:not(:disabled) {
  background: #44a08d;
}

.btn-add:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.max-strikes-control {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.strikes-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.strikes-value {
  min-width: 40px;
  text-align: center;
  font-weight: bold;
  font-size: 1.1rem;
}

.config-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn-primary,
.btn-secondary {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #4ecdc4, #44a08d);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(78, 205, 196, 0.3);
}

.btn-secondary {
  background: linear-gradient(135deg, #ff6b6b, #ee5a52);
  color: white;
}

.btn-secondary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
}

@media (max-width: 768px) {
  .config-sections {
    grid-template-columns: 1fr;
  }
  
  .tool-item,
  .body-part-item {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .add-item {
    flex-direction: column;
  }
}
</style> 