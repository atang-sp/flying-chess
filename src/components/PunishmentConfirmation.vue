<template>
  <div v-if="show" class="punishment-confirmation">
    <div class="confirmation-overlay" @click="handleOverlayClick">
      <div class="confirmation-modal" @click.stop>
        <div class="modal-header">
          <h3>🎯 惩罚组合确认</h3>
          <p>请检查以下惩罚组合，可以删除不合适的组合</p>
        </div>
        
        <div class="combinations-list">
          <div 
            v-for="(combination, index) in combinations" 
            :key="index"
            class="combination-item"
            :class="{ 'removed': removedCombinations.has(index) }"
          >
            <div class="combination-content">
              <div class="combination-number">#{{ index + 1 }}</div>
              <div class="combination-details">
                <div class="combination-tool">
                  <span class="label">工具:</span>
                  <span class="value">{{ combination.tool.name }}</span>
                  <span class="intensity">强度: {{ combination.tool.intensity }}/5</span>
                </div>
                <div class="combination-body-part">
                  <span class="label">部位:</span>
                  <span class="value">{{ combination.bodyPart.name }}</span>
                  <span class="sensitivity">耐受度: {{ combination.bodyPart.sensitivity }}/5</span>
                </div>
                <div class="combination-position">
                  <span class="label">姿势:</span>
                  <span class="value">{{ combination.position.name }}</span>
                  <span class="difficulty">难度: {{ combination.position.difficulty }}/5</span>
                </div>
                <div class="combination-strikes">
                  <span class="label">次数:</span>
                  <span class="value">{{ combination.strikes }} 下</span>
                </div>
              </div>
              <div class="combination-summary">
                <span class="summary-text">{{ combination.description }}</span>
              </div>
            </div>
            
            <div class="combination-actions">
              <button 
                v-if="!removedCombinations.has(index)"
                @click="removeCombination(index)"
                class="btn-remove"
                title="删除此组合"
              >
                🗑️
              </button>
              <button 
                v-else
                @click="restoreCombination(index)"
                class="btn-restore"
                title="恢复此组合"
              >
                🔄
              </button>
            </div>
          </div>
        </div>
        
        <div class="combination-stats">
          <div class="stat-item">
            <span class="stat-label">总组合数:</span>
            <span class="stat-value">{{ combinations.length }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">已删除:</span>
            <span class="stat-value">{{ removedCombinations.size }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">保留组合:</span>
            <span class="stat-value">{{ combinations.length - removedCombinations.size }}</span>
          </div>
        </div>
        
        <div class="modal-actions">
          <button @click="regenerateCombinations" class="btn-secondary">
            🔄 重新生成
          </button>
          <button @click="confirmCombinations" class="btn-primary" :disabled="removedCombinations.size >= combinations.length">
            ✅ 确认组合 ({{ combinations.length - removedCombinations.size }}个)
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { PunishmentAction } from '../types/game';

interface Props {
  show: boolean;
  combinations: PunishmentAction[];
}

interface Emits {
  (e: 'confirm', combinations: PunishmentAction[]): void;
  (e: 'regenerate'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const removedCombinations = ref<Set<number>>(new Set());

const handleOverlayClick = () => {
  // 不允许点击遮罩关闭，必须确认或重新生成
};

const removeCombination = (index: number) => {
  removedCombinations.value.add(index);
};

const restoreCombination = (index: number) => {
  removedCombinations.value.delete(index);
};

const confirmCombinations = () => {
  const validCombinations = props.combinations.filter((_, index) => !removedCombinations.value.has(index));
  emit('confirm', validCombinations);
};

const regenerateCombinations = () => {
  removedCombinations.value.clear();
  emit('regenerate');
};
</script>

<style scoped>
.punishment-confirmation {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
}

.confirmation-overlay {
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.confirmation-modal {
  background: white;
  border-radius: 16px;
  max-width: 800px;
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

.combinations-list {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  max-height: 60vh;
}

.combination-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 2px solid #e9ecef;
  border-radius: 12px;
  margin-bottom: 1rem;
  transition: all 0.3s ease;
  background: white;
}

.combination-item:hover {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

.combination-item.removed {
  opacity: 0.5;
  background: #f8f9fa;
  border-color: #dee2e6;
}

.combination-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.combination-number {
  font-weight: bold;
  color: #667eea;
  font-size: 0.9rem;
}

.combination-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.5rem;
}

.combination-tool,
.combination-body-part,
.combination-position,
.combination-strikes {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.label {
  font-weight: bold;
  color: #666;
  min-width: 40px;
}

.value {
  color: #333;
  font-weight: 500;
}

.intensity,
.sensitivity,
.difficulty {
  background: #667eea;
  color: white;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: bold;
}

.combination-summary {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 3px solid #667eea;
}

.summary-text {
  font-size: 0.9rem;
  color: #333;
  font-weight: 500;
}

.combination-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.btn-remove,
.btn-restore {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-remove {
  background: #ff6b6b;
  color: white;
}

.btn-remove:hover {
  background: #ff5252;
  transform: scale(1.05);
}

.btn-restore {
  background: #2ed573;
  color: white;
}

.btn-restore:hover {
  background: #26d0ce;
  transform: scale(1.05);
}

.combination-stats {
  display: flex;
  justify-content: space-around;
  padding: 1rem;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.8rem;
  color: #666;
}

.stat-value {
  font-size: 1.2rem;
  font-weight: bold;
  color: #667eea;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
}

.btn-primary,
.btn-secondary {
  flex: 1;
  padding: 1rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
  transform: translateY(-2px);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .confirmation-modal {
    max-width: 95%;
    max-height: 95vh;
  }
  
  .modal-header {
    padding: 1rem;
  }
  
  .modal-header h3 {
    font-size: 1.3rem;
  }
  
  .modal-header p {
    font-size: 0.9rem;
  }
  
  .combinations-list {
    padding: 0.75rem;
    max-height: 50vh;
  }
  
  .combination-item {
    padding: 0.75rem;
    margin-bottom: 0.75rem;
  }
  
  .combination-details {
    grid-template-columns: 1fr;
    gap: 0.25rem;
  }
  
  .combination-tool,
  .combination-body-part,
  .combination-position,
  .combination-strikes {
    font-size: 0.8rem;
  }
  
  .summary-text {
    font-size: 0.8rem;
  }
  
  .btn-remove,
  .btn-restore {
    width: 35px;
    height: 35px;
    font-size: 1rem;
  }
  
  .combination-stats {
    padding: 0.75rem;
  }
  
  .stat-label {
    font-size: 0.7rem;
  }
  
  .stat-value {
    font-size: 1rem;
  }
  
  .modal-actions {
    padding: 1rem;
    gap: 0.75rem;
  }
  
  .btn-primary,
  .btn-secondary {
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
  }
}

@media (max-width: 480px) {
  .confirmation-modal {
    max-width: 98%;
    max-height: 98vh;
  }
  
  .modal-header {
    padding: 0.75rem;
  }
  
  .modal-header h3 {
    font-size: 1.2rem;
  }
  
  .modal-header p {
    font-size: 0.85rem;
  }
  
  .combinations-list {
    padding: 0.5rem;
    max-height: 45vh;
  }
  
  .combination-item {
    padding: 0.5rem;
    margin-bottom: 0.5rem;
    gap: 0.5rem;
  }
  
  .combination-details {
    gap: 0.2rem;
  }
  
  .combination-tool,
  .combination-body-part,
  .combination-position,
  .combination-strikes {
    font-size: 0.75rem;
  }
  
  .label {
    min-width: 35px;
  }
  
  .intensity,
  .sensitivity,
  .difficulty {
    font-size: 0.6rem;
    padding: 0.15rem 0.3rem;
  }
  
  .summary-text {
    font-size: 0.75rem;
  }
  
  .btn-remove,
  .btn-restore {
    width: 30px;
    height: 30px;
    font-size: 0.9rem;
  }
  
  .combination-stats {
    padding: 0.5rem;
  }
  
  .stat-label {
    font-size: 0.65rem;
  }
  
  .stat-value {
    font-size: 0.9rem;
  }
  
  .modal-actions {
    padding: 0.75rem;
    gap: 0.5rem;
  }
  
  .btn-primary,
  .btn-secondary {
    padding: 0.6rem 0.8rem;
    font-size: 0.85rem;
  }
}
</style> 