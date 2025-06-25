<template>
  <div v-if="visible" class="takeoff-punishment-overlay">
    <div class="takeoff-punishment-modal">
      <div class="punishment-header">
        <div class="punishment-icon">✈️</div>
        <div class="punishment-title">未起飞惩罚</div>
      </div>
      
      <div class="punishment-content">
        <div class="punishment-description">
          掷到{{ diceValue }}点，未能起飞！需要接受惩罚。
        </div>
        
        <div class="punishment-details">
          <div class="detail-item">
            <span class="detail-label">执行者：</span>
            <span class="detail-value">{{ executorName }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">工具：</span>
            <span class="detail-value">{{ punishment.tool.name }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">部位：</span>
            <span class="detail-value">{{ punishment.bodyPart.name }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">姿势：</span>
            <span class="detail-value">{{ punishment.position.name }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">数量：</span>
            <span class="detail-value">{{ punishment.strikes }}下</span>
          </div>
        </div>
        
        <div class="punishment-note">
          <div class="note-icon">💡</div>
          <div class="note-text">
            只有掷到6点才能起飞。下次掷到6点前，每次掷骰子都会受到惩罚。
          </div>
        </div>
      </div>
      
      <div class="punishment-footer">
        <button @click="handleConfirm" class="confirm-btn">
          确认惩罚
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface PunishmentAction {
  tool: { name: string };
  bodyPart: { name: string };
  position: { name: string };
  strikes: number;
}

interface Props {
  visible: boolean;
  punishment: PunishmentAction;
  diceValue: number;
  executorName: string;
}

interface Emits {
  (e: 'confirm'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const handleConfirm = () => {
  emit('confirm');
};
</script>

<style scoped>
.takeoff-punishment-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

.takeoff-punishment-modal {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  animation: slideIn 0.3s ease;
}

.punishment-header {
  margin-bottom: 1.5rem;
}

.punishment-icon {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.punishment-title {
  font-size: 1.5rem;
  font-weight: bold;
  color: #ff6b6b;
}

.punishment-content {
  margin-bottom: 2rem;
}

.punishment-description {
  font-size: 1.1rem;
  color: #666;
  margin-bottom: 1.5rem;
  line-height: 1.5;
}

.punishment-details {
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  border: 1px solid #dee2e6;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #dee2e6;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-label {
  font-weight: bold;
  color: #666;
}

.detail-value {
  color: #333;
  font-weight: bold;
}

.punishment-note {
  background: linear-gradient(135deg, #fff3cd, #ffeaa7);
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid #ffc107;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.note-icon {
  font-size: 1.2rem;
  margin-top: 0.1rem;
}

.note-text {
  font-size: 0.9rem;
  color: #856404;
  line-height: 1.4;
  text-align: left;
}

.punishment-footer {
  display: flex;
  justify-content: center;
}

.confirm-btn {
  background: linear-gradient(135deg, #ff6b6b, #ee5a52);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 2rem;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.confirm-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    transform: translateY(-50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* 移动端适配 */
@media (max-width: 768px) {
  .takeoff-punishment-modal {
    padding: 1.5rem;
    margin: 1rem;
  }
  
  .punishment-icon {
    font-size: 2.5rem;
  }
  
  .punishment-title {
    font-size: 1.3rem;
  }
  
  .punishment-description {
    font-size: 1rem;
  }
  
  .detail-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
  
  .confirm-btn {
    padding: 0.6rem 1.5rem;
    font-size: 1rem;
  }
}
</style> 