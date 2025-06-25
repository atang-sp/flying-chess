<template>
  <div class="game-instructions">
    <h2>游戏目标与流程</h2>
    <ul class="instructions-list">
      <li>先配置惩罚选项，再检查确认惩罚设置。</li>
      <li>开始游戏后，玩家轮流投掷骰子前进。</li>
      <li>先到达终点的玩家获胜。</li>
      <li>工具强度不能超过部位的耐受度。</li>
      <li>获胜者可对其他所有人执行 <b>5下</b> 任意部位、任意工具的惩罚。</li>
    </ul>
    
    <div class="custom-config">
      <h3>自定义配置</h3>
      <div class="config-items">
        <div class="config-item">
          <strong>工具设置：</strong>添加/删除工具，调整强度（1-5）
        </div>
        <div class="config-item">
          <strong>部位设置：</strong>添加/删除部位，调整耐受度（1-5）
        </div>
        <div class="config-item">
          <strong>次数设置：</strong>调整最大惩罚次数（5-100）
        </div>
        <div class="config-item">
          <strong>姿势设置：</strong>添加/删除姿势，调整难度（1-5）
        </div>
        <div class="config-item">
          <strong>重置默认：</strong>恢复默认配置
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 无需逻辑
</script>

<style scoped>
.game-instructions {
  padding: 2rem 1rem;
  color: #333;
  background: rgba(255,255,255,0.85);
  border-radius: 12px;
  max-width: 500px;
  margin: 0 auto;
  box-shadow: 0 4px 24px rgba(0,0,0,0.08);
}
.instructions-list {
  list-style: decimal inside;
  padding: 0;
  margin: 1rem 0 0 0;
  font-size: 1.1rem;
}
.instructions-list li {
  margin-bottom: 1rem;
  line-height: 1.7;
}
.custom-config {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 2px solid #667eea;
}
.custom-config h3 {
  margin: 0 0 1rem 0;
  color: #667eea;
  font-size: 1.2rem;
}
.config-items {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.config-item {
  padding: 0.75rem;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 8px;
  border-left: 4px solid #667eea;
  font-size: 1rem;
  line-height: 1.5;
}
.config-item strong {
  color: #667eea;
}
</style> 