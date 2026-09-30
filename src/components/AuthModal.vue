<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { useI18n } from 'vue-i18n'
  import {
    User,
    X as CloseIcon,
    Mail,
    LogOut,
    Loader,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    Info,
    Settings,
  } from '@lucide/vue'
  import type { Provider } from '@supabase/supabase-js'
  import {
    supabase,
    isSupabaseConfigured,
    isDevOverrideActive,
    saveDevSupabaseCredentials,
    clearDevSupabaseCredentials,
  } from '../services/supabaseClient'
  import { useAuth } from '../composables/useAuth'
  import { syncStatus, lastSyncedAt, syncError } from '../services/syncState'

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

  const { t } = useI18n()
  const { currentUser, signOut } = useAuth()

  // ============================================================
  // 本地 UI 状态
  // ============================================================
  const email = ref('')
  const password = ref('')
  const loading = ref(false)
  const isSyncingManual = ref(false)
  const syncFeedbackMsg = ref('')
  const errorMsg = ref('')
  const view = ref<'options' | 'email'>('options')

  // 本地临时凭据测试折叠面板
  const showDevConfig = ref(false)
  const devUrlInput = ref('')
  const devKeyInput = ref('')

  const providerLabel = computed(() => {
    if (!currentUser.value) return ''
    const prov = currentUser.value.app_metadata?.provider ?? 'email'
    return prov === 'twitter' || prov === 'x'
      ? 'X (Twitter)'
      : prov === 'discourse'
        ? t('auth_provider_forum')
        : t('auth_provider_email')
  })

  const userAvatar = computed(() => currentUser.value?.user_metadata?.avatar_url ?? '')
  const userNickname = computed(
    () =>
      currentUser.value?.user_metadata?.full_name ??
      currentUser.value?.user_metadata?.name ??
      currentUser.value?.email ??
      t('auth_unnamed_user')
  )

  const formattedLastSyncTime = computed(() => {
    if (!lastSyncedAt.value) return t('auth_last_synced_never')
    const diffMs = Date.now() - lastSyncedAt.value
    if (diffMs < 60_000) return t('auth_last_synced_just_now')
    const date = new Date(lastSyncedAt.value)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  })

  // ============================================================
  // 操作
  // ============================================================
  const closeModal = () => {
    emit('close')
    view.value = 'options'
    errorMsg.value = ''
    email.value = ''
    password.value = ''
    syncFeedbackMsg.value = ''
  }

  const handleSignOut = async () => {
    loading.value = true
    await signOut()
    loading.value = false
    closeModal()
  }

  const handleSyncNow = async () => {
    if (isSyncingManual.value) return
    isSyncingManual.value = true
    syncFeedbackMsg.value = ''
    try {
      const { syncEngine } = await import('../services/syncEngine')
      const res = await syncEngine.syncNow()
      if (res.success) {
        syncFeedbackMsg.value = t('auth_sync_success')
      } else {
        syncFeedbackMsg.value = res.message || t('auth_sync_failed')
      }
    } catch (err) {
      syncFeedbackMsg.value = err instanceof Error ? err.message : t('auth_sync_failed')
    } finally {
      isSyncingManual.value = false
      setTimeout(() => {
        syncFeedbackMsg.value = ''
      }, 4000)
    }
  }

  const handleSaveDevCredentials = () => {
    if (!devUrlInput.value.trim() || !devKeyInput.value.trim()) return
    saveDevSupabaseCredentials(devUrlInput.value, devKeyInput.value)
    window.location.reload()
  }

  const handleClearDevCredentials = () => {
    clearDevSupabaseCredentials()
    window.location.reload()
  }

  const loginWithEmail = async () => {
    if (!isSupabaseConfigured) {
      errorMsg.value = t('auth_error_service_unconfigured')
      return
    }
    if (!email.value || !password.value) {
      errorMsg.value = t('auth_error_enter_credentials')
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
        const { error: signUpErr, data } = await supabase.auth.signUp({
          email: email.value,
          password: password.value,
        })
        if (signUpErr) {
          // If signup fails with user already exists, it means they just typed the wrong password.
          if (signUpErr.message.includes('User already registered')) {
            errorMsg.value = t('auth_error_invalid_password') || 'Invalid password.'
          } else {
            errorMsg.value = signUpErr.message
          }
        } else {
          // Signup might succeed but require email confirmation, or auto-login
          if (data?.session) {
            closeModal()
          } else {
            errorMsg.value =
              t('auth_signup_success_check_email') || 'Sign up successful. Please check your email.'
          }
        }
      } else {
        errorMsg.value = error.message
      }
    } else {
      closeModal()
    }
    loading.value = false
  }

  const getRedirectUrl = () => {
    if (typeof window === 'undefined') return ''
    const { origin, pathname } = window.location
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return origin + pathname
    }
    return 'https://atang-sp.github.io/flying-chess/'
  }

  /** X (Twitter) OAuth 2.0 */
  const loginWithX = async () => {
    if (!isSupabaseConfigured) {
      errorMsg.value = t('auth_error_service_unconfigured')
      return
    }
    loading.value = true
    errorMsg.value = ''
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'x',
      options: { redirectTo: getRedirectUrl() },
    })
    if (error) {
      errorMsg.value = error.message
      loading.value = false
    }
  }

  /** Discourse OAuth (custom provider) */
  const loginWithForum = async () => {
    if (!isSupabaseConfigured) {
      errorMsg.value = t('auth_error_service_unconfigured')
      return
    }
    loading.value = true
    errorMsg.value = ''
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'custom:discourse' as Provider,
      options: {
        queryParams: { provider: 'discourse' },
        redirectTo: getRedirectUrl(),
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
            {{ currentUser ? t('auth_title_account') : t('auth_title_login') }}
          </h3>
          <button class="close-btn" :aria-label="t('auth_close_aria')" @click="closeModal">
            <CloseIcon :size="18" />
          </button>
        </div>

        <!-- ===== Body ===== -->
        <div class="modal-body">
          <!-- ——— 已登录视图 ——— -->
          <template v-if="currentUser">
            <div class="user-info">
              <img v-if="userAvatar" :src="userAvatar" :alt="t('auth_avatar_alt')" class="avatar" />
              <div v-else class="avatar-placeholder">{{ userNickname[0] }}</div>
              <div class="user-meta">
                <span class="nickname">{{ userNickname }}</span>
                <span class="provider-badge">
                  {{ t('auth_logged_in_with', { provider: providerLabel }) }}
                </span>
              </div>
            </div>

            <!-- 云同步状态卡片 -->
            <div class="sync-card">
              <div class="sync-card-header">
                <div class="sync-status-indicator">
                  <RefreshCw
                    v-if="syncStatus === 'syncing' || isSyncingManual"
                    :size="16"
                    class="spin text-blue"
                  />
                  <CheckCircle2
                    v-else-if="syncStatus === 'success'"
                    :size="16"
                    class="text-green"
                  />
                  <AlertCircle v-else-if="syncStatus === 'error'" :size="16" class="text-red" />
                  <Info v-else :size="16" class="text-muted" />
                  <span class="sync-status-text">
                    {{
                      syncStatus === 'syncing' || isSyncingManual
                        ? t('auth_syncing')
                        : syncStatus === 'error'
                          ? t('auth_sync_failed')
                          : t('auth_sync_success')
                    }}
                  </span>
                </div>
                <button
                  class="sync-btn"
                  :disabled="isSyncingManual || syncStatus === 'syncing'"
                  @click="handleSyncNow"
                >
                  <RefreshCw
                    :size="14"
                    :class="{ spin: isSyncingManual || syncStatus === 'syncing' }"
                  />
                  {{ t('auth_btn_sync_now') }}
                </button>
              </div>

              <div class="sync-time">
                {{ t('auth_last_synced', { time: formattedLastSyncTime }) }}
              </div>

              <div
                v-if="syncFeedbackMsg || (syncStatus === 'error' && syncError)"
                class="sync-feedback"
                :class="{ 'is-error': syncStatus === 'error' }"
              >
                {{ syncFeedbackMsg || syncError }}
              </div>

              <p class="sync-scope-detail">
                {{ t('auth_sync_scope_detail') }}
              </p>
            </div>

            <button class="btn btn-danger" :disabled="loading" @click="handleSignOut">
              <Loader v-if="loading" :size="16" class="spin" />
              <LogOut v-else :size="16" />
              {{ t('auth_btn_logout') }}
            </button>
          </template>

          <!-- ——— 未登录视图 ——— -->
          <template v-else>
            <!-- 服务未配置提示横幅 -->
            <div v-if="!isSupabaseConfigured" class="unconfigured-banner">
              <div class="banner-title">
                <Info :size="18" />
                <span>{{ t('auth_service_unconfigured_banner') }}</span>
              </div>
              <p class="banner-desc">{{ t('auth_service_unconfigured_detail') }}</p>

              <!-- 本地测试凭据展开入口 -->
              <button class="dev-toggle-btn" type="button" @click="showDevConfig = !showDevConfig">
                <Settings :size="14" />
                {{ t('auth_service_dev_override_title') }}
              </button>

              <div v-if="showDevConfig" class="dev-config-box">
                <input
                  v-model="devUrlInput"
                  type="text"
                  placeholder="https://your-project.supabase.co"
                  class="dev-input"
                />
                <input
                  v-model="devKeyInput"
                  type="password"
                  placeholder="your-anon-key"
                  class="dev-input"
                />
                <div class="dev-actions">
                  <button class="btn btn-primary btn-sm" @click="handleSaveDevCredentials">
                    {{ t('auth_service_dev_apply') }}
                  </button>
                </div>
              </div>
            </div>

            <!-- 使用临时凭证提示 -->
            <div v-else-if="isDevOverrideActive" class="dev-active-banner">
              <span>{{ t('auth_service_dev_active_badge') }}</span>
              <button class="btn-clear-dev" @click="handleClearDevCredentials">
                {{ t('auth_service_dev_clear') }}
              </button>
            </div>

            <p class="description">
              {{ t('auth_desc_line1') }}
              <br />
              {{ t('auth_desc_line2') }}
            </p>

            <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>

            <!-- 选择登录方式 -->
            <div v-if="view === 'options'" class="auth-options">
              <button
                class="btn btn-x"
                :disabled="loading || !isSupabaseConfigured"
                :title="!isSupabaseConfigured ? t('auth_service_unconfigured_short') : ''"
                @click="loginWithX"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.259 5.633 5.905-5.633Zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                  />
                </svg>
                {{ t('auth_btn_x') }}
                <span v-if="!isSupabaseConfigured" class="btn-badge-unconfigured">
                  ({{ t('auth_service_unconfigured_short') }})
                </span>
              </button>

              <button
                class="btn btn-forum"
                :disabled="loading || !isSupabaseConfigured"
                :title="!isSupabaseConfigured ? t('auth_service_unconfigured_short') : ''"
                @click="loginWithForum"
              >
                {{ t('auth_btn_forum') }}
                <span v-if="!isSupabaseConfigured" class="btn-badge-unconfigured">
                  ({{ t('auth_service_unconfigured_short') }})
                </span>
              </button>

              <div class="divider">
                <span>{{ t('auth_divider_or') }}</span>
              </div>

              <button
                class="btn btn-outline"
                :disabled="loading || !isSupabaseConfigured"
                @click="view = 'email'"
              >
                <Mail :size="16" />
                {{ t('auth_btn_use_email') }}
              </button>
            </div>

            <!-- 邮箱密码表单 -->
            <div v-else class="email-form">
              <input
                v-model="email"
                type="email"
                :placeholder="t('auth_input_email')"
                class="input-field"
                :disabled="loading"
                autocomplete="email"
                @keyup.enter="loginWithEmail"
              />
              <input
                v-model="password"
                type="password"
                :placeholder="t('auth_input_password')"
                class="input-field"
                :disabled="loading"
                autocomplete="current-password"
                @keyup.enter="loginWithEmail"
              />
              <button
                class="btn btn-primary"
                :disabled="loading || !isSupabaseConfigured"
                @click="loginWithEmail"
              >
                <Loader v-if="loading" :size="16" class="spin" />
                {{ loading ? t('auth_loading') : t('auth_btn_submit') }}
              </button>
              <button class="btn btn-text" :disabled="loading" @click="view = 'options'">
                {{ t('auth_btn_back') }}
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
    max-width: 440px;
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
    padding: 1.75rem 1.5rem;
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
    margin: 0;
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

  /* Banner when unconfigured */
  .unconfigured-banner {
    background: rgba(245, 158, 11, 0.12);
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-radius: 10px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .banner-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #f59e0b;
    font-weight: 600;
    font-size: 0.95rem;
  }

  .banner-desc {
    margin: 0;
    font-size: 0.825rem;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.5;
  }

  .dev-toggle-btn {
    align-self: flex-start;
    background: transparent;
    border: none;
    color: #38bdf8;
    font-size: 0.8rem;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.25rem 0;
    margin-top: 0.25rem;
    text-decoration: underline;
  }

  .dev-config-box {
    margin-top: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    background: rgba(0, 0, 0, 0.3);
    padding: 0.75rem;
    border-radius: 8px;
  }

  .dev-input {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 6px;
    padding: 0.45rem 0.75rem;
    color: #fff;
    font-size: 0.8rem;
  }

  .dev-input:focus {
    outline: none;
    border-color: #38bdf8;
  }

  .dev-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }

  .btn-sm {
    padding: 0.4rem 0.75rem !important;
    font-size: 0.8rem !important;
    min-height: 32px !important;
  }

  .dev-active-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(56, 189, 248, 0.12);
    border: 1px solid rgba(56, 189, 248, 0.3);
    padding: 0.5rem 0.85rem;
    border-radius: 8px;
    font-size: 0.8rem;
    color: #38bdf8;
  }

  .btn-clear-dev {
    background: transparent;
    border: 1px solid rgba(56, 189, 248, 0.4);
    color: #38bdf8;
    padding: 2px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.75rem;
  }

  /* Auth options */
  .auth-options {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  .btn-badge-unconfigured {
    font-size: 0.75rem;
    opacity: 0.75;
    font-weight: 400;
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

  /* Sync card in logged-in view */
  .sync-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .sync-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .sync-status-indicator {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .sync-status-text {
    color: var(--text-primary, #fff);
  }

  .sync-btn {
    background: rgba(59, 130, 246, 0.15);
    border: 1px solid rgba(59, 130, 246, 0.3);
    color: #60a5fa;
    padding: 0.35rem 0.75rem;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    transition: all 0.15s;
  }

  .sync-btn:not(:disabled):hover {
    background: rgba(59, 130, 246, 0.25);
  }

  .sync-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .sync-time {
    font-size: 0.78rem;
    color: var(--text-secondary, rgba(255, 255, 255, 0.5));
  }

  .sync-feedback {
    font-size: 0.8rem;
    color: #4ade80;
    padding: 0.3rem 0.5rem;
    background: rgba(74, 222, 128, 0.1);
    border-radius: 4px;
  }

  .sync-feedback.is-error {
    color: #f87171;
    background: rgba(239, 68, 68, 0.1);
  }

  .sync-scope-detail {
    margin: 0;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.4);
    line-height: 1.4;
  }

  .text-blue {
    color: #60a5fa;
  }
  .text-green {
    color: #4ade80;
  }
  .text-red {
    color: #f87171;
  }
  .text-muted {
    color: rgba(255, 255, 255, 0.4);
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
