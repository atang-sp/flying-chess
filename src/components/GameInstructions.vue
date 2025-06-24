<template>
  <div class="game-instructions" :class="{ 'collapsed': isCollapsed }">
    <div class="instructions-header" @click="toggleCollapse">
      <h3>📖 游戏说明</h3>
      <span class="toggle-icon">{{ isCollapsed ? '▼' : '▲' }}</span>
    </div>
    
    <div v-if="!isCollapsed" class="instructions-content">
      <div class="instruction-section">
        <h4>🎯 游戏目标</h4>
        <p>在环形棋盘上掷骰子前进，第一个到达第30格的玩家获胜！</p>
      </div>
      
      <div class="instruction-section">
        <h4>🎲 游戏流程</h4>
        <ol>
          <li>配置惩罚设置（工具、部位、次数）</li>
          <li>点击"开始游戏"按钮开始</li>
          <li>玩家轮流点击骰子投掷</li>
          <li>根据骰子点数移动棋子</li>
          <li>遇到特殊格子会触发相应效果</li>
        </ol>
      </div>
      
      <div class="instruction-section">
        <h4>⚡ 惩罚格子</h4>
        <div class="special-cells">
          <div class="cell-example punishment">
            <span class="cell-icon">⚡</span>
            <span class="cell-desc">惩罚：触发惩罚小游戏</span>
          </div>
        </div>
        <ul>
          <li>踩到红色惩罚格子时触发</li>
          <li>显示工具、部位和次数</li>
          <li>可以选择确认执行或跳过</li>
          <li>不影响游戏进程</li>
        </ul>
      </div>
      
      <div class="instruction-section">
        <h4>🎁 奖励格子</h4>
        <div class="special-cells">
          <div class="cell-example bonus">
            <span class="cell-icon">🎁</span>
            <span class="cell-desc">奖励：获得额外前进步数</span>
          </div>
        </div>
        <ul>
          <li>踩到绿色奖励格子时触发</li>
          <li>获得2-6步额外前进</li>
          <li>帮助更快到达终点</li>
        </ul>
      </div>
      
      <div class="instruction-section">
        <h4>⭐ 特殊格子</h4>
        <div class="special-cells">
          <div class="cell-example special">
            <span class="cell-icon">⭐</span>
            <span class="cell-desc">特殊：跳过回合或后退</span>
          </div>
        </div>
        <ul>
          <li>踩到黄色特殊格子时触发</li>
          <li>可能跳过下一回合</li>
          <li>可能后退2-3步</li>
        </ul>
      </div>
      
      <div class="instruction-section">
        <h4>⚙️ 自定义设置</h4>
        <ul>
          <li><strong>工具设置</strong>：添加/删除工具，调整强度（1-5）</li>
          <li><strong>部位设置</strong>：添加/删除部位，调整敏感度（1-5）</li>
          <li><strong>次数设置</strong>：调整最大惩罚次数（5-100）</li>
          <li><strong>重置默认</strong>：恢复默认配置</li>
        </ul>
      </div>
      
      <div class="instruction-section">
        <h4>🎨 环形棋盘</h4>
        <ul>
          <li><strong>外圈</strong>：20个格子（5x4布局）</li>
          <li><strong>内圈</strong>：8个格子（4x2布局）</li>
          <li><strong>中心</strong>：2个格子（终点区域）</li>
          <li>美观的环形设计，视觉效果更佳</li>
        </ul>
      </div>
      
      <div class="instruction-section">
        <h4>🎮 操作说明</h4>
        <ul>
          <li><strong>开始游戏</strong>：开始新游戏</li>
          <li><strong>暂停游戏</strong>：暂停当前游戏</li>
          <li><strong>重新开始</strong>：重置游戏状态</li>
          <li><strong>点击骰子</strong>：投掷骰子</li>
          <li><strong>确认惩罚</strong>：执行当前惩罚</li>
          <li><strong>跳过惩罚</strong>：跳过当前惩罚</li>
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
  margin-bottom: 0.5rem;
}

.cell-example {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 4px;
  border-left: 4px solid;
}

.cell-example.punishment {
  background: linear-gradient(135deg, #ff6b6b, #ee5a52);
  border-left-color: #ff4757;
  color: white;
}

.cell-example.bonus {
  background: linear-gradient(135deg, #2ed573, #1e90ff);
  border-left-color: #2ed573;
  color: white;
}

.cell-example.special {
  background: linear-gradient(135deg, #ffd93d, #ffb347);
  border-left-color: #ffa726;
  color: white;
}

.cell-icon {
  font-size: 1.2rem;
}

.cell-desc {
  font-weight: 500;
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