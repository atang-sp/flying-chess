<template>
  <div v-if="show" class="trap-display-overlay" @click="handleOverlayClick">
    <div class="trap-display-modal" @click.stop>
      <div class="trap-header">
        <div class="trap-icon">💀</div>
        <h2 class="trap-title">机关陷阱触发！</h2>
      </div>
      
      <div class="trap-content">
        <div class="trap-message">
          <p class="trap-description">{{ trapDescription }}</p>
        </div>
        
        <div class="trap-warning">
          <p>⚠️ 机关陷阱已触发，请按照描述执行！</p>
        </div>
      </div>
      
      <div class="trap-actions">
        <button class="btn-primary" @click="handleConfirm">
          <span class="btn-icon">😰</span>
          <span class="btn-text">确认执行</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'

interface Props {
  show: boolean
  trapDescription?: string
}

interface Emits {
  (e: 'confirm'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const handleConfirm = () => {
  emit('confirm')
}

const handleOverlayClick = () => {
  // 点击遮罩层不关闭弹窗，必须点击确认按钮
}
</script>

<style scoped>
.trap-display-overlay {
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
  animation: fadeIn 0.3s ease-out;
}

.trap-display-modal {
  background: linear-gradient(135deg, #2c1810, #4a1c1c);
  border: 3px solid #8b0000;
  border-radius: 20px;
  padding: 30px;
  max-width: 500px;
  width: 90%;
  text-align: center;
  box-shadow: 0 10px 30px rgba(139, 0, 0, 0.5);
  animation: slideIn 0.3s ease-out;
}

.trap-header {
  margin-bottom: 20px;
}

.trap-icon {
  font-size: 4em;
  margin-bottom: 10px;
  animation: pulse 2s infinite;
}

.trap-title {
  color: #ff6b6b;
  font-size: 1.8em;
  margin: 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  font-weight: bold;
}

.trap-content {
  margin-bottom: 25px;
}

.trap-message {
  margin-bottom: 20px;
}

.trap-description {
  color: #ffd700;
  font-size: 1.2em;
  font-weight: bold;
  margin: 0;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
}

.trap-warning {
  background: rgba(255, 107, 107, 0.2);
  border: 2px solid #ff6b6b;
  border-radius: 10px;
  padding: 15px;
}

.trap-warning p {
  color: #ff6b6b;
  font-weight: bold;
  margin: 0;
  font-size: 0.9em;
}

.trap-actions {
  display: flex;
  justify-content: center;
}

.btn-primary {
  background: linear-gradient(135deg, #8b0000, #dc143c);
  color: white;
  border: none;
  border-radius: 25px;
  padding: 12px 30px;
  font-size: 1.1em;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 15px rgba(139, 0, 0, 0.4);
}

.btn-primary:hover {
  background: linear-gradient(135deg, #dc143c, #ff0000);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(139, 0, 0, 0.6);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-icon {
  font-size: 1.2em;
}

.btn-text {
  font-weight: bold;
}

/* 动画效果 */
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
    transform: translateY(-50px) scale(0.9);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .trap-display-modal {
    padding: 20px;
    margin: 20px;
  }
  
  .trap-icon {
    font-size: 3em;
  }
  
  .trap-title {
    font-size: 1.5em;
  }
  
  .trap-description {
    font-size: 1.1em;
  }
  
  .btn-primary {
    padding: 10px 25px;
    font-size: 1em;
  }
}
</style> 