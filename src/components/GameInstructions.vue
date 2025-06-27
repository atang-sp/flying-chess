<script setup lang="ts">
  // 无需逻辑
</script>

<template>
  <div class="game-instructions">
    <h2>游戏目标与流程</h2>
    <ul class="instructions-list">
      <li>先配置惩罚选项，再检查确认惩罚设置。</li>
      <li>
        <strong>机场起飞规则：</strong>
        玩家在起点时，只有掷到6点才能起飞，移动到第1格开始游戏。
      </li>
      <li>
        <strong>未起飞惩罚：</strong>
        掷到1-5点时，会被其他玩家惩罚，惩罚数量等于骰子点数。
      </li>
      <li>
        <strong>惩罚执行者：</strong>
        假设有x个玩家，除了当前玩家外还剩x-1个玩家，编号为0到x-2，用骰子点数n%(x-1)确定执行者。
      </li>
      <li>起飞后，玩家轮流投掷骰子前进。</li>
      <li>先到达终点的玩家获胜。</li>
      <li>工具强度不能超过部位的耐受度。</li>
      <li>
        获胜者可对其他所有人执行
        <b>5下</b>
        任意部位、任意工具的惩罚。
      </li>
    </ul>

    <h3>棋盘格子类型</h3>
    <ul class="instructions-list">
      <li>
        <strong>惩罚格子（红色⚡）：</strong>
        大部分格子都是惩罚格子，踩到后需要接受惩罚。
      </li>
      <li>
        <strong>前进格子（绿色🎁）：</strong>
        踩到后可以前进2-3步，共2个。
      </li>
      <li>
        <strong>后退格子（橙色⬅️）：</strong>
        踩到后需要后退2-3步，共2个。
      </li>
      <li>
        <strong>休息格子（橙色😴）：</strong>
        踩到后需要休息一回合，共2个。
      </li>
      <li>
        <strong>回到起点格子（紫色🔄）：</strong>
        踩到后需要回到起点重新开始，共3个。
      </li>
    </ul>

    <div class="custom-config">
      <h3>自定义配置</h3>
      <div class="config-items">
        <div class="config-item">
          <strong>工具设置：</strong>
          添加/删除工具，调整强度（1-5）
        </div>
        <div class="config-item">
          <strong>部位设置：</strong>
          添加/删除部位，调整耐受度（1-5）
        </div>
        <div class="config-item">
          <strong>次数设置：</strong>
          调整最大惩罚次数（5-100）
        </div>
        <div class="config-item">
          <strong>姿势设置：</strong>
          添加/删除姿势，调整难度（1-5）
        </div>
        <div class="config-item">
          <strong>重置默认：</strong>
          恢复默认配置
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .game-instructions {
    padding: clamp(1rem, 4vw, 2rem) clamp(0.5rem, 2vw, 1rem);
    color: #333;
    background: rgba(255, 255, 255, 0.85);
    border-radius: clamp(8px, 2vw, 12px);
    max-width: min(500px, 90vw);
    margin: 0 auto;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  }
  .instructions-list {
    list-style: decimal inside;
    padding: 0;
    margin: clamp(0.5rem, 2vw, 1rem) 0 0 0;
    font-size: clamp(0.9rem, 2.5vw, 1.1rem);
  }
  .instructions-list li {
    margin-bottom: clamp(0.6rem, 2vw, 1rem);
    line-height: 1.7;
  }
  .custom-config {
    margin-top: clamp(1.5rem, 4vw, 2rem);
    padding-top: clamp(1rem, 3vw, 1.5rem);
    border-top: 2px solid #667eea;
  }
  .custom-config h3 {
    margin: 0 0 clamp(0.5rem, 2vw, 1rem) 0;
    color: #667eea;
    font-size: clamp(1rem, 3vw, 1.2rem);
  }
  .config-items {
    display: flex;
    flex-direction: column;
    gap: clamp(0.5rem, 1.5vw, 0.75rem);
  }
  .config-item {
    padding: clamp(0.5rem, 2vw, 0.75rem);
    background: rgba(102, 126, 234, 0.1);
    border-radius: clamp(4px, 1vw, 8px);
    border-left: 4px solid #667eea;
    font-size: clamp(0.85rem, 2.5vw, 1rem);
    line-height: 1.5;
  }
  .config-item strong {
    color: #667eea;
  }

  /* 自适应布局 - 移除固定断点，使用相对单位 */
  @media (max-width: 1023px) {
    .game-instructions {
      margin: 0 clamp(0.25rem, 1vw, 0.5rem);
    }
  }
</style>
