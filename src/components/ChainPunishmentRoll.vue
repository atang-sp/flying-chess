<script setup lang="ts">
  import { ref, watch } from 'vue'
  import { Link, Dices } from '@lucide/vue'
  import { SecureRandom } from '../utils/secureRandom'

  interface Props {
    visible: boolean
  }

  interface Emits {
    (e: 'result', continueChain: boolean): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  const phase = ref<'prompt' | 'rolling' | 'result'>('prompt')
  const diceValue = ref(0)
  const continueChain = ref(false)

  watch(
    () => props.visible,
    newVal => {
      if (newVal) {
        phase.value = 'prompt'
        diceValue.value = 0
        continueChain.value = false
      }
    }
  )

  const rollDice = () => {
    phase.value = 'rolling'

    setTimeout(() => {
      diceValue.value = SecureRandom.randomInt(1, 6)
      continueChain.value = diceValue.value % 2 === 1
      phase.value = 'result'
    }, 1500)
  }

  const confirm = () => {
    emit('result', continueChain.value)
  }
</script>

<template>
  <div v-if="visible" class="modal-overlay">
    <div class="modal-content chain-roll">
      <div class="chain-header">
        <Link :size="28" />
        <h3>连锁惩罚！</h3>
      </div>

      <!-- 提示阶段 -->
      <div v-if="phase === 'prompt'" class="chain-prompt">
        <p class="chain-description">掷骰决定命运：奇数继续受罚，偶数逃过一劫</p>
        <button class="btn btn-roll" @click="rollDice">
          <Dices :size="20" />
          掷骰子
        </button>
      </div>

      <!-- 掷骰动画 -->
      <div v-if="phase === 'rolling'" class="chain-rolling">
        <div class="dice-animation">
          <Dices :size="48" class="spinning-dice" />
        </div>
        <p class="rolling-text">命运之骰旋转中...</p>
      </div>

      <!-- 结果阶段 -->
      <div v-if="phase === 'result'" class="chain-result">
        <div class="dice-result" :class="{ odd: continueChain, even: !continueChain }">
          {{ diceValue }}
        </div>
        <p class="result-text" :class="{ punishment: continueChain, escape: !continueChain }">
          {{ continueChain ? '继续受罚！' : '逃过一劫！' }}
        </p>
        <button class="btn" :class="continueChain ? 'btn-danger' : 'btn-success'" @click="confirm">
          {{ continueChain ? '接受命运' : '松一口气' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .chain-roll {
    border: 2px solid rgba(255, 99, 72, 0.5);
    max-width: 400px;
    text-align: center;
  }

  .chain-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    color: var(--color-chain-punishment);
  }

  .chain-header h3 {
    margin: 0;
    font-size: 1.5rem;
  }

  .chain-description {
    color: var(--text-secondary);
    font-size: 1.1rem;
    margin: 0 0 1.5rem 0;
  }

  .btn-roll {
    background: linear-gradient(135deg, #ff6348, #c0392b);
    color: white;
    border: none;
    border-radius: var(--radius-sm);
    padding: 1rem 2rem;
    font-size: 1.1rem;
    font-weight: bold;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.2s ease;
  }

  .btn-roll:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 99, 72, 0.4);
  }

  .chain-rolling {
    padding: 2rem 0;
  }

  .dice-animation {
    margin-bottom: 1rem;
    color: var(--color-chain-punishment);
  }

  .spinning-dice {
    animation: spin-dice 0.3s linear infinite;
  }

  @keyframes spin-dice {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .rolling-text {
    color: var(--text-secondary);
    font-size: 1rem;
    margin: 0;
  }

  .chain-result {
    padding: 1rem 0;
  }

  .dice-result {
    width: 80px;
    height: 80px;
    margin: 0 auto 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
    font-weight: 900;
    border-radius: 12px;
    animation: pop-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }

  .dice-result.odd {
    background: linear-gradient(135deg, #c0392b, #922b21);
    color: white;
    box-shadow: 0 4px 20px rgba(255, 71, 87, 0.5);
  }

  .dice-result.even {
    background: linear-gradient(135deg, #27ae60, #1e8449);
    color: white;
    box-shadow: 0 4px 20px rgba(46, 213, 115, 0.5);
  }

  @keyframes pop-in {
    from {
      transform: scale(0.5);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  .result-text {
    font-size: 1.4rem;
    font-weight: bold;
    margin: 0 0 1.5rem 0;
  }

  .result-text.punishment {
    color: var(--color-punishment);
  }

  .result-text.escape {
    color: var(--color-bonus);
  }

  .btn-danger {
    background: linear-gradient(135deg, #c0392b, #922b21);
    color: white;
    border: none;
    border-radius: var(--radius-sm);
    padding: 1rem 2rem;
    font-size: 1.1rem;
    font-weight: bold;
    cursor: pointer;
    width: 100%;
    min-height: 50px;
    transition: all 0.2s ease;
  }

  .btn-danger:hover {
    background: linear-gradient(135deg, #e74c3c, #c0392b);
    transform: translateY(-1px);
  }

  .btn-success {
    background: linear-gradient(135deg, #27ae60, #1e8449);
    color: white;
    border: none;
    border-radius: var(--radius-sm);
    padding: 1rem 2rem;
    font-size: 1.1rem;
    font-weight: bold;
    cursor: pointer;
    width: 100%;
    min-height: 50px;
    transition: all 0.2s ease;
  }

  .btn-success:hover {
    background: linear-gradient(135deg, #2ed573, #27ae60);
    transform: translateY(-1px);
  }

  @media (max-width: 768px) {
    .chain-roll {
      width: 90%;
      padding: 1.5rem;
    }
  }
</style>
