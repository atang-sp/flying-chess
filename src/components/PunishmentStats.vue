<template>
  <div v-if="show" class="punishment-stats">
    <div class="stats-overlay" @click="handleOverlayClick">
      <div class="stats-modal" @click.stop>
        <div class="modal-header">
          <h3>📊 惩罚组合统计</h3>
          <p>以下是确认的惩罚组合的分布情况</p>
        </div>
        
        <div class="stats-content">
          <div class="stats-grid">
            <div class="stats-item">
              <div class="stats-label">工具分布</div>
              <div class="stats-bars">
                <div v-for="tool in toolStats" :key="tool.name" class="stat-bar">
                  <span class="stat-name">{{ tool.name }}</span>
                  <div class="stat-bar-container">
                    <div class="stat-bar-fill" :style="{ width: tool.percentage + '%' }"></div>
                  </div>
                  <span class="stat-value">{{ tool.count }}个 ({{ tool.percentage }}%)</span>
                </div>
              </div>
            </div>
            
            <div class="stats-item">
              <div class="stats-label">部位分布</div>
              <div class="stats-bars">
                <div v-for="bodyPart in bodyPartStats" :key="bodyPart.name" class="stat-bar">
                  <span class="stat-name">{{ bodyPart.name }}</span>
                  <div class="stat-bar-container">
                    <div class="stat-bar-fill" :style="{ width: bodyPart.percentage + '%' }"></div>
                  </div>
                  <span class="stat-value">{{ bodyPart.count }}个 ({{ bodyPart.percentage }}%)</span>
                </div>
              </div>
            </div>
            
            <div class="stats-item">
              <div class="stats-label">姿势分布</div>
              <div class="stats-bars">
                <div v-for="position in positionStats" :key="position.name" class="stat-bar">
                  <span class="stat-name">{{ position.name }}</span>
                  <div class="stat-bar-container">
                    <div class="stat-bar-fill" :style="{ width: position.percentage + '%' }"></div>
                  </div>
                  <span class="stat-value">{{ position.count }}个 ({{ position.percentage }}%)</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="stats-summary">
            <div class="summary-item">
              <span class="summary-label">总组合数:</span>
              <span class="summary-value">{{ combinations.length }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">平均打击次数:</span>
              <span class="summary-value">{{ averageStrikes }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">最高强度工具:</span>
              <span class="summary-value">{{ maxIntensityTool }}</span>
            </div>
          </div>
        </div>
        
        <div class="modal-actions">
          <button @click="handleConfirm" class="btn-primary">
            ✅ 开始游戏
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PunishmentAction } from '../types/game';

interface Props {
  show: boolean;
  combinations: PunishmentAction[];
}

interface Emits {
  (e: 'confirm'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 计算工具统计
const toolStats = computed(() => {
  const toolCounts = new Map<string, number>();
  
  props.combinations.forEach(combination => {
    const toolName = combination.tool.name;
    toolCounts.set(toolName, (toolCounts.get(toolName) || 0) + 1);
  });
  
  return Array.from(toolCounts.entries()).map(([name, count]) => ({
    name,
    count,
    percentage: Math.round((count / props.combinations.length) * 100)
  }));
});

// 计算部位统计
const bodyPartStats = computed(() => {
  const bodyPartCounts = new Map<string, number>();
  
  props.combinations.forEach(combination => {
    const bodyPartName = combination.bodyPart.name;
    bodyPartCounts.set(bodyPartName, (bodyPartCounts.get(bodyPartName) || 0) + 1);
  });
  
  return Array.from(bodyPartCounts.entries()).map(([name, count]) => ({
    name,
    count,
    percentage: Math.round((count / props.combinations.length) * 100)
  }));
});

// 计算姿势统计
const positionStats = computed(() => {
  const positionCounts = new Map<string, number>();
  
  props.combinations.forEach(combination => {
    const positionName = combination.position.name;
    positionCounts.set(positionName, (positionCounts.get(positionName) || 0) + 1);
  });
  
  return Array.from(positionCounts.entries()).map(([name, count]) => ({
    name,
    count,
    percentage: Math.round((count / props.combinations.length) * 100)
  }));
});

// 计算平均打击次数
const averageStrikes = computed(() => {
  if (props.combinations.length === 0) return 0;
  const totalStrikes = props.combinations.reduce((sum, combo) => sum + combo.strikes, 0);
  return Math.round(totalStrikes / props.combinations.length);
});

// 计算最高强度工具
const maxIntensityTool = computed(() => {
  if (props.combinations.length === 0) return '无';
  const maxIntensity = Math.max(...props.combinations.map(combo => combo.tool.intensity));
  const maxTool = props.combinations.find(combo => combo.tool.intensity === maxIntensity);
  return maxTool ? maxTool.tool.name : '无';
});

const handleOverlayClick = () => {
  // 不允许点击遮罩关闭
};

const handleConfirm = () => {
  emit('confirm');
};
</script>

<style scoped>
.punishment-stats {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
}

.stats-overlay {
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.stats-modal {
  background: white;
  border-radius: 16px;
  max-width: 900px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  padding: 1.5rem;
  text-align: center;
}

.modal-header h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  font-weight: bold;
}

.modal-header p {
  margin: 0;
  font-size: 1rem;
  opacity: 0.9;
}

.stats-content {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stats-item {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid #e9ecef;
}

.stats-label {
  font-weight: bold;
  color: #495057;
  margin-bottom: 1rem;
  font-size: 1.1rem;
  text-align: center;
}

.stats-bars {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.stat-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.9rem;
}

.stat-name {
  min-width: 80px;
  color: #495057;
  font-weight: 500;
}

.stat-bar-container {
  flex: 1;
  height: 10px;
  background: #e9ecef;
  border-radius: 5px;
  overflow: hidden;
}

.stat-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 5px;
  transition: width 0.3s ease;
}

.stat-value {
  min-width: 80px;
  text-align: right;
  color: #6c757d;
  font-weight: bold;
  font-size: 0.85rem;
}

.stats-summary {
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid #dee2e6;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e9ecef;
}

.summary-item:last-child {
  border-bottom: none;
}

.summary-label {
  font-weight: bold;
  color: #495057;
  font-size: 1rem;
}

.summary-value {
  color: #667eea;
  font-weight: bold;
  font-size: 1.1rem;
}

.modal-actions {
  display: flex;
  justify-content: center;
  padding: 1.5rem;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 1rem 2rem;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .stat-bar {
    font-size: 0.8rem;
  }
  
  .stat-name {
    min-width: 60px;
  }
  
  .stat-value {
    min-width: 60px;
  }
  
  .stats-modal {
    margin: 0.5rem;
  }
}
</style> 