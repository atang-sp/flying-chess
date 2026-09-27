<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { User, X as CloseIcon, Mail, LogOut, Loader } from '@lucide/vue'
  import type { Provider } from '@supabase/supabase-js'
  import { supabase } from '../services/supabaseClient'
  import { useAuth } from '../composables/useAuth'

  // ============================================================
  // Props & Emits
  // ============================================================
  interface Props {
    show: boolean
  }
  interface Emits {
    (e: 'close'): void
  }
  defineProps<Props>()
  const emit = defineEmits<Emits>()

  const { currentUser, signOut } = useAuth()

  // ============================================================
  // 本地 UI 状态
  // ============================================================
  const email = ref('')
  const password = ref('')
  const loading = ref(false)
  const errorMsg = ref('')
  const view = ref<'options' | 'email'>('options')

  const providerLabel = computed(() => {
    if (!currentUser.value) return ''
    const prov = currentUser.value.app_metadata?.provider ?? 'email'
    return prov === 'twitter' || prov === 'x'
      ? 'X (Twitter)'
      : prov === 'discourse'
        ? 'SP 社区论坛'
        : '邮箱'
  })

  const userAvatar = computed(() => currentUser.value?.user_metadata?.avatar_url ?? '')
  const userNickname = computed(
    () =>
      currentUser.value?.user_metadata?.full_name ??
      currentUser.value?.user_metadata?.name ??
      currentUser.value?.email ??
      '未命名用户'
  )

  // ============================================================
  // 操作
  // ============================================================
  const closeModal = () => {
    emit('close')
    view.value = 'options'
    errorMsg.value = ''
    email.value = ''
    password.value = ''
  }

  const handleSignOut = async () => {
    loading.value = true
    await signOut()
    loading.value = false
    closeModal()
  }

  const loginWithEmail = async () => {
    if (!email.value || !password.value) {
      errorMsg.value = '请输入邮箱和密码'
      return
    }
    loading.value = true
    errorMsg.value = ''

    // 先尝试登录，失败时自动注册
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    })

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        const { error: signUpErr } = await supabase.auth.signUp({
          email: email.value,
          password: password.value,
        })
        if (signUpErr) {
          errorMsg.value = signUpErr.message
        } else {
          errorMsg.value = '注册成功！请检查邮箱完成验证。'
        }
      } else {
        errorMsg.value = error.message
      }
    } else {
      closeModal()
    }
    loading.value = false
  }

  /** X (Twitter) OAuth 2.0 */
  const loginWithX = async () => {
    loading.value = true
    errorMsg.value = ''
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'x',
      options: { redirectTo: window.location.origin },
    })
    if (error) {
      errorMsg.value = error.message
      loading.value = false
    }
  }

  /** Discourse OAuth (custom provider) */
  const loginWithForum = async () => {
    loading.value = true
    errorMsg.value = ''
    const { error } = await supabase.auth.signInWithOAuth({
      // 需要在 Supabase Dashboard 配置名为 "discourse" 的 Custom OAuth2 provider
      provider: 'custom:discourse' as Provider,
      options: {
        queryParams: { provider: 'discourse' },
        redirectTo: window.location.origin,
      },
    })
    if (error) {
      errorMsg.value = error.message
      loading.value = false
    }
  }
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="auth-modal" @click.self="closeModal">
      <div class="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <!-- ===== Header ===== -->
        <div class="modal-header">
          <h3 id="auth-title">
            <User :size="20" />
            {{ currentUser ? '账户信息' : '云端账户登录' }}
          </h3>
          <button class="close-btn" aria-label="关闭" @click="closeModal">
            <CloseIcon :size="18" />
          </button>
        </div>

        <!-- ===== Body ===== -->
        <div class="modal-body">
          <!-- ——— 已登录视图 ——— -->
          <template v-if="currentUser">
            <div class="user-info">
              <img v-if="userAvatar" :src="userAvatar" alt="头像" class="avatar" />
              <div v-else class="avatar-placeholder">{{ userNickname[0] }}</div>
              <div class="user-meta">
                <span class="nickname">{{ userNickname }}</span>
                <span class="provider-badge">{{ providerLabel }} 登录</span>
              </div>
            </div>
            <p class="sync-tip">✅ 游戏配置和成就进度将在设备间自动同步。</p>
            <button class="btn btn-danger" :disabled="loading" @click="handleSignOut">
              <Loader v-if="loading" :size="16" class="spin" />
              <LogOut v-else :size="16" />
              退出登录
            </button>
          </template>

          <!-- ——— 未登录视图 ——— -->
          <template v-else>
            <p class="description">
              登录后可跨设备同步「游戏配置」与「成就进度」。
              <br />
              未登录时完全不受影响，所有数据仅保存在本地。
            </p>

            <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>

            <!-- 选择登录方式 -->
            <div v-if="view === 'options'" class="auth-options">
              <button class="btn btn-x" :disabled="loading" @click="loginWithX">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.259 5.633 5.905-5.633Zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                  />
                </svg>
                X (Twitter) 登录
              </button>

              <button class="btn btn-forum" :disabled="loading" @click="loginWithForum">
                🏠 SP 专属社区登录
              </button>

              <div class="divider"><span>或</span></div>

              <button class="btn btn-outline" :disabled="loading" @click="view = 'email'">
                <Mail :size="16" />
                使用邮箱密码
              </button>
            </div>

            <!-- 邮箱密码表单 -->
            <div v-else class="email-form">
              <input
                v-model="email"
                type="email"
                placeholder="邮箱"
                class="input-field"
                :disabled="loading"
                autocomplete="email"
                @keyup.enter="loginWithEmail"
              />
              <input
                v-model="password"
                type="password"
                placeholder="密码（新用户将自动注册）"
                class="input-field"
                :disabled="loading"
                autocomplete="current-password"
                @keyup.enter="loginWithEmail"
              />
              <button class="btn btn-primary" :disabled="loading" @click="loginWithEmail">
                <Loader v-if="loading" :size="16" class="spin" />
                {{ loading ? '处理中…' : '登录 / 注册' }}
              </button>
              <button class="btn btn-text" :disabled="loading" @click="view = 'options'">
                ← 返回
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
  .auth-modal {
    position: fixed;
    inset: 0;
    z-index: 9000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(6px);
    padding: 1rem;
  }

  .auth-dialog {
    background: rgba(14, 14, 30, 0.97);
    backdrop-filter: blur(var(--glass-blur, 12px));
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: var(--radius-xl, 16px);
    max-width: 420px;
    width: 100%;
    max-height: calc(100dvh - 2rem);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
    animation: authSlideIn 0.25s ease-out;
  }

  @keyframes authSlideIn {
    from {
      opacity: 0;
      transform: translateY(-24px) scale(0.96);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* Header */
  .modal-header {
    background: rgba(255, 255, 255, 0.04);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding: 1.25rem 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
  }

  .modal-header h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-primary, #fff);
  }

  .close-btn {
    background: transparent;
    border: none;
    color: var(--text-secondary, rgba(255, 255, 255, 0.5));
    cursor: pointer;
    padding: 4px;
    display: flex;
    border-radius: 6px;
    transition: color 0.15s;
  }
  .close-btn:hover {
    color: var(--text-primary, #fff);
  }

  /* Body */
  .modal-body {
    padding: 2rem 1.75rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow-y: auto;
  }

  .description {
    color: var(--text-secondary, rgba(255, 255, 255, 0.55));
    font-size: 0.875rem;
    line-height: 1.6;
    text-align: center;
    margin-bottom: 0.5rem;
  }

  .error-msg {
    color: #f87171;
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.25);
    padding: 0.65rem 0.85rem;
    border-radius: 8px;
    font-size: 0.85rem;
    text-align: center;
  }

  /* Auth options */
  .auth-options {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  /* Buttons */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.7rem 1.25rem;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    font-size: 0.95rem;
    font-weight: 600;
    transition: all 0.15s;
    min-height: 44px;
  }
  .btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .btn-x {
    background: #0f0f0f;
    color: #fff;
    border: 1px solid #333;
  }
  .btn-x:not(:disabled):hover {
    background: #1a1a1a;
  }

  .btn-forum {
    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
    color: #fff;
  }
  .btn-forum:not(:disabled):hover {
    filter: brightness(1.1);
  }

  .btn-primary {
    background: var(--color-primary, #3b82f6);
    color: #fff;
    width: 100%;
  }
  .btn-primary:not(:disabled):hover {
    filter: brightness(1.1);
  }

  .btn-outline {
    background: rgba(255, 255, 255, 0.06);
    color: var(--text-primary, #fff);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
  .btn-outline:not(:disabled):hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .btn-danger {
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
    border: 1px solid rgba(239, 68, 68, 0.3);
    width: 100%;
  }
  .btn-danger:not(:disabled):hover {
    background: rgba(239, 68, 68, 0.25);
  }

  .btn-text {
    background: transparent;
    border: none;
    color: var(--text-secondary, rgba(255, 255, 255, 0.5));
    font-size: 0.875rem;
  }
  .btn-text:not(:disabled):hover {
    color: var(--text-primary, #fff);
  }

  /* Divider */
  .divider {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: var(--text-secondary, rgba(255, 255, 255, 0.3));
    font-size: 0.8rem;
  }
  .divider::before,
  .divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(255, 255, 255, 0.1);
  }

  /* Email form */
  .email-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .input-field {
    background: rgba(0, 0, 0, 0.35);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    padding: 0.7rem 1rem;
    color: var(--text-primary, #fff);
    font-size: 0.95rem;
    outline: none;
    transition: border-color 0.15s;
  }
  .input-field::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
  .input-field:focus {
    border-color: var(--color-primary, #3b82f6);
  }
  .input-field:disabled {
    opacity: 0.5;
  }

  /* Logged-in view */
  .user-info {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
  }

  .avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
  }

  .avatar-placeholder {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: linear-gradient(135deg, #4f46e5, #7c3aed);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    font-weight: 700;
    color: #fff;
    flex-shrink: 0;
  }

  .user-meta {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
  }

  .nickname {
    font-weight: 600;
    color: var(--text-primary, #fff);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .provider-badge {
    font-size: 0.75rem;
    color: var(--text-secondary, rgba(255, 255, 255, 0.5));
  }

  .sync-tip {
    color: #86efac;
    font-size: 0.875rem;
    text-align: center;
    margin: 0;
  }

  /* Spinner */
  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Mobile */
  @media (max-width: 480px) {
    .modal-body {
      padding: 1.5rem 1.25rem;
    }
  }
</style>
