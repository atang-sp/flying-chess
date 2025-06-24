<template>
  <div class="game-instructions" :class="{ 'collapsed': isCollapsed }">
    <div class="instructions-header" @click="toggleCollapse">
      <h3>📖 游戏说明</h3>
      <span class="toggle-icon">{{ isCollapsed ? '▼' : '▲' }}</span>
    </div>
    
    <div v-if="!isCollapsed" class="instructions-content">
      <div class="instruction-section">
        <h4>🎯 游戏目标</h4>
        <p>第一个到达第100格的玩家获胜！</p>
      </div>
      
      <div class="instruction-section">
        <h4>🎲 游戏流程</h4>
        <ol>
          <li>点击"开始游戏"按钮开始</li>
          <li>玩家轮流点击骰子投掷</li>
          <li>根据骰子点数移动棋子</li>
          <li>遇到特殊格子会触发相应效果</li>
        </ol>
      </div>
      
      <div class="instruction-section">
        <h4>🎪 特殊格子</h4>
        <div class="special-cells">
          <div class="cell-example ladder">
            <span class="cell-icon">🪜</span>
            <span class="cell-desc">梯子：向上移动</span>
          </div>
          <div class="cell-example snake">
            <span class="cell-icon">🐍</span>
            <span class="cell-desc">蛇：向下移动</span>
          </div>
          <div class="cell-example special">
            <span class="cell-icon">⭐</span>
            <span class="cell-desc">特殊：触发效果</span>
          </div>
        </div>
      </div>
      
      <div class="instruction-section">
        <h4>🎮 操作说明</h4>
        <ul>
          <li><strong>开始游戏</strong>：开始新游戏</li>
          <li><strong>暂停游戏</strong>：暂停当前游戏</li>
          <li><strong>重新开始</strong>：重置游戏状态</li>
          <li><strong>点击骰子</strong>：投掷骰子</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const isCollapsed = ref(false);

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
};
</script>

<style scoped>
.game-instructions {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 1rem;
  overflow: hidden;
}

.instructions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  cursor: pointer;
  transition: background 0.3s ease;
}

.instructions-header:hover {
  background: linear-gradient(135deg, #5a6fd8, #6a4190);
}

.instructions-header h3 {
  margin: 0;
  font-size: 1.1rem;
}

.toggle-icon {
  font-size: 1.2rem;
  transition: transform 0.3s ease;
}

.instructions-content {
  padding: 1rem;
}

.instruction-section {
  margin-bottom: 1.5rem;
}

.instruction-section:last-child {
  margin-bottom: 0;
}

.instruction-section h4 {
  margin: 0 0 0.5rem 0;
  color: #333;
  font-size: 1rem;
}

.instruction-section p,
.instruction-section ol,
.instruction-section ul {
  margin: 0;
  color: #666;
  line-height: 1.5;
}

.instruction-section ol,
.instruction-section ul {
  padding-left: 1.5rem;
}

.instruction-section li {
  margin-bottom: 0.25rem;
}

.special-cells {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.cell-example {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 4px;
  border-left: 4px solid;
}

.cell-example.ladder {
  background: linear-gradient(135deg, #a8e6cf, #88d8c0);
  border-left-color: #4ecdc4;
}

.cell-example.snake {
  background: linear-gradient(135deg, #ffb3ba, #ff8a95);
  border-left-color: #ff6b6b;
}

.cell-example.special {
  background: linear-gradient(135deg, #ffd93d, #ffb347);
  border-left-color: #ffa726;
}

.cell-icon {
  font-size: 1.2rem;
}

.cell-desc {
  font-weight: 500;
  color: #333;
}

.collapsed .instructions-content {
  display: none;
}

@media (max-width: 768px) {
  .instructions-header {
    padding: 0.75rem;
  }
  
  .instructions-content {
    padding: 0.75rem;
  }
  
  .special-cells {
    gap: 0.25rem;
  }
  
  .cell-example {
    padding: 0.25rem;
  }
}
</style> 