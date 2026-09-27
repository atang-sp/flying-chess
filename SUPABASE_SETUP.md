# 飞行棋云同步接入指南

## 概览

本文档说明如何完成 Supabase 后端的配置，使游戏的「本地优先·云端同步」功能完整运转。

## 第一步：创建 Supabase 项目

1. 访问 [supabase.com](https://supabase.com) 并创建新项目
2. 记录以下两个值（Dashboard → Settings → API）：
   - **Project URL** (`VITE_SUPABASE_URL`)
   - **Anon Public Key** (`VITE_SUPABASE_ANON_KEY`)

## 第二步：配置环境变量

复制 `.env.local.example` 为 `.env.local` 并填入真实值：

```bash
cp .env.local.example .env.local
```

编辑 `.env.local`：

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## 第三步：执行数据库 Schema

在 Supabase Dashboard → **SQL Editor** 中，粘贴并执行 [`supabase-schema.sql`](./supabase-schema.sql) 的全部内容。

该 Schema 会创建：
| 表 | 说明 |
|---|---|
| `profiles` | 账号基础信息（昵称、头像、登录方式） |
| `user_configs` | 游戏配置（棋盘、惩罚、陷阱） |
| `game_progress` | 成就进度 + 耻辱墙 |

所有表均已启用 **Row Level Security**，用户只能读写自己的数据。

## 第四步：配置登录方式

### Email / Password
默认已开启，无需额外配置。

### X (Twitter) OAuth
1. Supabase Dashboard → Authentication → Providers → **Twitter**
2. 填入 X Developer Portal 的 **API Key** 和 **API Secret**
3. 在 X 开发者控制台将回调 URL 设为 `https://your-project-id.supabase.co/auth/v1/callback`

### SP 社区论坛 (Discourse) OAuth

> 论坛运行在 `atang-sp.run.place`，使用 Discourse 软件。

**论坛侧配置（需 SSH 进入服务器）：**

```bash
ssh root@atang-sp.run.place
```

在 Discourse 管理后台 (`/admin/settings`) 中启用 OAuth2 Basic 插件并配置：

```
# Discourse 管理后台 → Settings → Login
enable oauth2 basic providers: true
```

或通过 Rails 控制台配置 OAuth2 Application（如论坛已安装 `discourse-oauth2-basic` 插件）。

**Supabase 侧配置：**

1. Dashboard → Authentication → Providers → **Custom OAuth2**
2. 填入以下信息：
   ```
   Provider name:    discourse
   Client ID:        (Discourse OAuth App 的 client_id)
   Client Secret:    (Discourse OAuth App 的 client_secret)
   Authorization URL: https://atang-sp.run.place/oauth/authorize
   Token URL:        https://atang-sp.run.place/oauth/token
   User Info URL:    https://atang-sp.run.place/oauth/userinfo  (或 /session/current.json)
   Scopes:           read
   ```

## 架构说明

```
用户操作 (修改配置/完成成就)
       ↓
  LocalStorage 写入 (立即)
       ↓
  syncEngine.push*() 异步调用
       ↓ (失败静默忽略，不阻塞游戏)
  Supabase UPSERT

用户登录
       ↓
  onAuthStateChange('SIGNED_IN')
       ↓
  syncEngine.pullAndMerge()
       ↓ 合并策略：数值取最大值（进度不会丢失）
  写回 LocalStorage
```

### 关键文件

| 文件 | 作用 |
|---|---|
| `src/services/supabaseClient.ts` | Supabase 客户端单例 |
| `src/composables/useAuth.ts` | 全局 Auth 状态 + 监听器 |
| `src/services/syncEngine.ts` | pull/push 同步逻辑 |
| `src/components/AuthModal.vue` | 登录/注册/退出 UI |
| `src/utils/cache.ts` | 已拦截 `saveConfig` / `saveLocalProgress` |
| `supabase-schema.sql` | 数据库建表 + RLS 脚本 |
