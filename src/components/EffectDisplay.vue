<template>
  <div v-if="visible" class="effect-display-overlay">
    <div class="effect-display-modal">
      <div class="effect-header">
        <div class="effect-icon">{{ getEffectIcon() }}</div>
        <div class="effect-title">{{ getEffectTitle() }}</div>
      </div>
      
      <div class="effect-content">
        <div class="effect-description">{{ effect?.description || '' }}</div>
        
        <!-- 移动路径信息 -->
        <div v-if="showMovePath" class="move-path-info">
          <div class="path-label">移动路径：</div>
          <div class="path-details">
            <span class="from-position">{{ getFromPositionText() }}</span>
            <span class="path-arrow">→</span>
            <span class="to-position">{{ getToPositionText() }}</span>
            <span v-if="hasThirdStep" class="path-arrow">→</span>
            <span v-if="hasThirdStep" class="final-position">{{ getFinalPositionText() }}</span>
          </div>
        </div>
        
        <div v-if="effect?.type === 'move'" class="move-effect">
          <div class="effect-value">
            <span class="value-number">{{ effect.value > 0 ? '+' : '' }}{{ effect.value }}</span>
            <span class="value-unit">步</span>
          </div>
          <div class="effect-direction">
            {{ effect.value > 0 ? '前进' : '后退' }}
          </div>
        </div>
        
        <div v-else-if="effect?.type === 'restart'" class="restart-effect">
          <div class="effect-value">
            <span class="value-icon">🔄</span>
            <span class="value-text">回到起点</span>
          </div>
        </div>
        
        <div v-else-if="effect?.type === 'rest'" class="rest-effect">
          <div class="effect-value">
            <span class="value-icon">😴</span>
            <span class="value-text">休息一回合</span>
          </div>
        </div>
      </div>
      
      <div class="effect-footer">
        <button @click="handleConfirm" class="confirm-btn">
          确认
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Effect {
  type: 'move' | 'skip' | 'reverse' | 'restart' | 'rest';
  value: number;
  description: string;
}

interface Props {
  visible: boolean;
  effect: Effect | null;
  fromPosition?: number;
  toPosition?: number;
}

interface Emits {
  (e: 'confirm'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const showMovePath = computed(() => {
  return props.effect && (props.effect.type === 'move' || props.effect.type === 'reverse' || props.effect.type === 'restart' || props.effect.type === 'rest');
});

const hasThirdStep = computed(() => {
  return props.effect && (props.effect.type === 'move' || props.effect.type === 'reverse' || props.effect.type === 'restart');
});

const getFromPositionText = (): string => {
  if (props.fromPosition === undefined || props.fromPosition === null) return '当前位置';
  return props.fromPosition === 0 ? '起点' : `第${props.fromPosition}格`;
};

const getToPositionText = (): string => {
  if (props.toPosition === undefined || props.toPosition === null) return '目标位置';
  return props.toPosition === 0 ? '起点' : `第${props.toPosition}格`;
};

const getFinalPositionText = (): string => {
  if (!props.effect?.description) return '';
  
  const description = props.effect.description;
  const parts = description.split(' → ');
  if (parts.length >= 3) {
    return parts[2];
  }
  return '';
};

const getEffectIcon = (): string => {
  if (!props.effect) return '✨';
  
  switch (props.effect.type) {
    case 'move':
      return props.effect.value > 0 ? '🎁' : '⬅️';
    case 'restart':
      return '🔄';
    case 'rest':
      return '😴';
    case 'reverse':
      return '⬅️';
    default:
      return '✨';
  }
};

const getEffectTitle = (): string => {
  if (!props.effect) return '效果';
  
  switch (props.effect.type) {
    case 'move':
      return props.effect.value > 0 ? '前进效果' : '后退效果';
    case 'restart':
      return '回到起点';
    case 'rest':
      return '休息一回合';
    case 'reverse':
      return '后退效果';
    default:
      return '特殊效果';
  }
};

const handleConfirm = () => {
  emit('confirm');
};
</script>

<style scoped>
.effect-display-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

.effect-display-modal {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  max-width: 400px;
  width: 90%;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  animation: slideIn 0.3s ease;
}

.effect-header {
  margin-bottom: 1.5rem;
}

.effect-icon {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.effect-title {
  font-size: 1.5rem;
  font-weight: bold;
  color: #333;
}

.effect-content {
  margin-bottom: 2rem;
}

.effect-description {
  font-size: 1.1rem;
  color: #666;
  margin-bottom: 1.5rem;
  line-height: 1.5;
}

/* 移动路径信息样式 */
.move-path-info {
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  border: 1px solid #dee2e6;
}

.path-label {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

.path-details {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  font-weight: bold;
}

.from-position {
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.path-arrow {
  color: #4ecdc4;
  font-size: 1.2rem;
  font-weight: bold;
}

.to-position {
  color: #2ed573;
  background: rgba(46, 213, 115, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.final-position {
  color: #2ed573;
  background: rgba(46, 213, 115, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.move-effect,
.restart-effect,
.rest-effect {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.effect-value {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 2rem;
  font-weight: bold;
}

.value-number {
  color: #4ecdc4;
}

.value-unit {
  color: #666;
  font-size: 1.2rem;
}

.value-icon {
  font-size: 2.5rem;
}

.value-text {
  color: #ab47bc;
  font-size: 1.5rem;
}

.effect-direction {
  font-size: 1.2rem;
  color: #666;
  font-weight: bold;
}

.effect-footer {
  display: flex;
  justify-content: center;
}

.confirm-btn {
  background: linear-gradient(135deg, #4ecdc4, #44a08d);
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
  box-shadow: 0 4px 12px rgba(78, 205, 196, 0.3);
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
  .effect-display-modal {
    padding: 1.5rem;
    margin: 1rem;
  }
  
  .effect-icon {
    font-size: 2.5rem;
  }
  
  .effect-title {
    font-size: 1.3rem;
  }
  
  .effect-description {
    font-size: 1rem;
  }
  
  .path-details {
    font-size: 1rem;
  }
  
  .effect-value {
    font-size: 1.8rem;
  }
  
  .confirm-btn {
    padding: 0.6rem 1.5rem;
    font-size: 1rem;
  }
}
</style> 