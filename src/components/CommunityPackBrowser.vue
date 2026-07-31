<script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import { CloudDownload, Link, Star } from '@lucide/vue'
  import {
    loadCommunityCatalog,
    loadRemoteCommunityPack,
    type CommunityCatalogEntry,
    type CommunityPack,
  } from '../services/communityPacks'

  const emit = defineEmits<{ (event: 'apply', pack: CommunityPack): void }>()
  const catalog = ref<readonly CommunityCatalogEntry[]>([])
  const remoteUrl = ref('')
  const status = ref('')
  const loadingUrl = ref('')

  const applyFromUrl = async (url: string) => {
    if (!url.trim() || loadingUrl.value) return
    loadingUrl.value = url
    status.value = '正在校验远程配置…'
    try {
      const pack = await loadRemoteCommunityPack(url)
      emit('apply', pack)
      status.value = `已加载“${pack.title}”，开局前仍可继续调整`
    } catch (error) {
      status.value = error instanceof Error ? error.message : '远程配置加载失败'
    } finally {
      loadingUrl.value = ''
    }
  }

  onMounted(async () => {
    try {
      catalog.value = await loadCommunityCatalog(`${import.meta.env.BASE_URL}community/index.json`)
    } catch (error) {
      status.value = error instanceof Error ? error.message : '社区目录暂时不可用'
    }
  })
</script>

<template>
  <details class="community-browser">
    <summary>
      <span>
        <CloudDownload :size="19" />
        社区配置市场
      </span>
      <small>静态索引 · 无需账号或后端</small>
    </summary>

    <div class="browser-body">
      <div v-if="catalog.length" class="pack-grid">
        <article v-for="entry in catalog" :key="entry.id">
          <div class="pack-heading">
            <strong>{{ entry.title }}</strong>
            <span>
              <Star :size="14" />
              {{ entry.rating.toFixed(1) }}
            </span>
          </div>
          <p>{{ entry.description }}</p>
          <div class="tags">
            <span v-for="tag in entry.tags" :key="tag">{{ tag }}</span>
          </div>
          <button
            type="button"
            :disabled="Boolean(loadingUrl)"
            @click="applyFromUrl(entry.packUrl)"
          >
            {{ loadingUrl === entry.packUrl ? '加载中…' : '一键加载' }}
          </button>
        </article>
      </div>
      <p v-else class="empty-catalog">目录未加载时仍可使用远程 JSON 地址。</p>

      <div class="remote-loader">
        <label>
          <span>
            <Link :size="15" />
            远程配置 URL（GitHub Gist / JSON 文件）
          </span>
          <input v-model.trim="remoteUrl" type="url" placeholder="https://…/pack.json" />
        </label>
        <button
          type="button"
          :disabled="!remoteUrl || Boolean(loadingUrl)"
          @click="applyFromUrl(remoteUrl)"
        >
          校验并加载
        </button>
      </div>
      <p v-if="status" class="status">{{ status }}</p>
    </div>
  </details>
</template>

<style scoped>
  .community-browser {
    margin-top: 1rem;
    color: var(--text-primary);
    text-align: left;
    background: rgb(15 23 42 / 0.58);
    border: 1px solid rgb(14 165 233 / 0.28);
    border-radius: var(--radius-xl);
  }

  summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    min-height: 58px;
    padding: 0.85rem 1rem;
    cursor: pointer;
  }

  summary span,
  .pack-heading,
  .pack-heading span,
  .remote-loader label > span {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  summary small,
  article p,
  .empty-catalog {
    color: var(--text-muted);
  }

  .browser-body {
    display: grid;
    gap: 1rem;
    padding: 0 1rem 1rem;
  }

  .pack-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 0.7rem;
  }

  article {
    display: grid;
    gap: 0.55rem;
    padding: 0.8rem;
    background: rgb(30 41 59 / 0.72);
    border-radius: 13px;
  }

  .pack-heading {
    justify-content: space-between;
  }

  .pack-heading span {
    color: #fde68a;
    font-size: 0.78rem;
  }

  article p,
  .empty-catalog,
  .status {
    margin: 0;
    font-size: 0.8rem;
    line-height: 1.45;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .tags span {
    padding: 0.15rem 0.4rem;
    color: #bae6fd;
    background: rgb(3 105 161 / 0.32);
    border-radius: 999px;
    font-size: 0.68rem;
  }

  button,
  input {
    min-height: 42px;
    padding: 0.55rem 0.7rem;
    color: #f8fafc;
    background: rgb(3 105 161 / 0.7);
    border: 1px solid rgb(56 189 248 / 0.32);
    border-radius: 10px;
    font: inherit;
  }

  button {
    cursor: pointer;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .remote-loader {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
    gap: 0.6rem;
  }

  .remote-loader label {
    display: grid;
    gap: 0.4rem;
  }

  .remote-loader input {
    width: 100%;
    background: #0f172a;
  }

  .status {
    color: #bae6fd;
  }

  @media (max-width: 580px) {
    .remote-loader {
      grid-template-columns: 1fr;
    }
  }
</style>
