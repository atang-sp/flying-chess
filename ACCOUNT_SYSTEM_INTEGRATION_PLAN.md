# 飞行棋非强制账户体系与云端同步接入计划 (Account System Integration Plan)

> **版本**：v1.0.0  
> **更新时间**：2026-09-27  
> **状态**：第一阶段（客户端中间件与界面）已完成，待创建独立 Supabase 项目及配置 OAuth 渠道

---

## 一、 背景与目标 (Background & Objectives)

当前飞行棋项目（Vue 3 + Vite + TypeScript）的各项数据（游戏进度、成就、耻辱墙、自定义配置）全部存储在本地浏览器的 `LocalStorage` 中。

本计划的目标是：**引入 Supabase (PostgreSQL + Auth) 作为轻量后端，构建一套“非强制登录、本地优先 (Local-First)”的跨设备账户体系**。

### 核心设计原则

1. **非强制登录 (Guest-First)**：未登录用户体验零改变，依旧使用现有的 `LocalStorage` 游玩，不弹出强制登录阻拦。
2. **本地优先 (Local-First)**：读取与修改优先写入本地，确保游戏零网络延迟、支持离线体验；云同步采用异步静默推送 (Fire-and-Forget)，网络失败不阻塞游戏。
3. **多渠道登录**：支持邮箱/密码、X (Twitter) OAuth 2.0，以及 SP 专属社区论坛 (atang-sp.run.place) 账号登录。
4. **平滑合并 (Smart Merge)**：跨设备登录时拉取云端存档，采取最大值合并策略，确保游戏局数、成就与耻辱墙记录永不丢失。

---

## 二、 账户鉴权架构 (Authentication Architecture)

```
                            ┌──────────────────────────────────┐
                            │           飞行棋 Web 客户端        │
                            └─────────────────┬────────────────┘
                                              │
                      ┌───────────────────────┼────────────────────────┐
                      ▼                       ▼                        ▼
               【邮箱 / 密码】           【X (Twitter)】        【SP 专属社区论坛】
              (Email & Password)         (OAuth 2.0)         (atang-sp.run.place)
                      │                       │                        │
                      │                       │              DiscourseConnect / Bridge
                      │                       │                        │
                      └───────────────────────┼────────────────────────┘
                                              ▼
                                 ┌─────────────────────────┐
                                 │      Supabase Auth      │
                                 │   (GoTrue / PostgreSQL) │
                                 └────────────┬────────────┘
                                              ▼
                                 ┌─────────────────────────┐
                                 │  Row Level Security 保护 │
                                 │   profiles / configs    │
                                 └─────────────────────────┘
```

### 1. 登录渠道方案与技术细节

#### (1) 邮箱 / 密码认证 (Email / Password)

- 采用 Supabase Auth 基础邮箱认证。
- 登录逻辑支持无缝容错：登录凭证不存在时，引导自动注册并提示。

#### (2) X (Twitter) OAuth 2.0

- 使用 Supabase 官方原生的 Twitter/X OAuth Provider。
- 在 X Developer Portal 配置 OAuth 2.0 Client，设置 Redirect URI 为 `https://<supabase-project-id>.supabase.co/auth/v1/callback`。

#### (3) SP 专属社区论坛 (atang-sp.run.place) 账号登录

- **现状分析**：经在论坛服务器（Ubuntu + Docker Discourse）实地排查，Discourse 原生作为身份提供者 (IdP) 采用的是 **DiscourseConnect Provider (SSO HMAC-SHA256 协议)**，并不自带标准的 OAuth2 Authorization Server (`/oauth/token`) 端点。
- **对接实现方案**：
  - **方案 A（轻量桥接服务）**：在服务器上启动微型 OAuth2/OIDC 桥接器（或利用 Supabase Edge Function），一端接收 Supabase 的 OAuth2 请求，另一端与 Discourse 的 DiscourseConnect 端点完成签名校验，将论坛账号无缝映射进 Supabase。
  - **方案 B（论坛直接验证 + Supabase 自定义 Token）**：由客户端发起向论坛的会话确认或 SSO 跳转，验证成功后通过服务端生成 Supabase JWT / 交换 Session。

---

## 三、 数据库设计与安全性 (Supabase SQL Schema)

数据库完整脚本位于 [`supabase-schema.sql`](./supabase-schema.sql)，均开启严格的 **Row Level Security (RLS)**：

```sql
-- 1. profiles: 账号基本信息
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nickname    text,
  avatar_url  text,
  provider    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2. user_configs: 玩家个性化配置 (棋盘、惩罚、陷阱)
create table public.user_configs (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  settings     jsonb not null default '{}',
  updated_at   timestamptz not null default now()
);

-- 3. game_progress: 玩家进度、成就、耻辱墙
create table public.game_progress (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  totals        jsonb not null default '{}',
  shame_records jsonb not null default '{}',
  updated_at    timestamptz not null default now()
);
```

- **自动化触发器**：
  - `on_auth_user_created`：在用户注册成功瞬间自动从 `auth.users` 生成 profile 记录。
  - `set_updated_at`：表更新时自动刷新 `updated_at` 字段。
- **RLS 策略**：所有表严格限制 `auth.uid() = user_id`，杜绝越权访问。

---

## 四、 本地优先 (Local-First) 同步引擎设计

```
                      【玩家操作】
               (改设置 / 胜利 / 触发耻辱记录)
                           │
                           ▼
                 写入 LocalStorage (立即响应)
                           │
                           ▼
                  检查当前登录状态
                   /              \
            [已登录]              [未登录]
               │                     │
               ▼                     ▼
     syncEngine.push*()          静默结束
     (异步 fire-and-forget)
               │
               ▼
     Supabase upsert
     (网络失败静默容错)

                      【用户登录时刻】
               (onAuthStateChange -> SIGNED_IN)
                           │
                           ▼
                 syncEngine.pullAndMerge()
                           │
                           ▼
                 从云端拉取配置与进度
                           │
                           ▼
                 智能合并 (数值取 MAX，防覆盖丢失)
                           │
                           ▼
                写回本地 LocalStorage (避免递归触发 Push)
```

### 关键防死循环设计

- 云端拉取合并写回本地时，直接操作底层 Key，而不调用带 Push 钩子的 `saveLocalProgress`，避免产生 `Pull -> Write -> Push -> ...` 的连锁反应。

---

## 五、 代码实施与架构模块一览

| 模块 / 文件                                                          | 类型       | 职责说明                                                            |
| -------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------- |
| [`src/services/supabaseClient.ts`](./src/services/supabaseClient.ts) | 基础服务   | 初始化并导出 Supabase Client 单例                                   |
| [`src/composables/useAuth.ts`](./src/composables/useAuth.ts)         | 状态钩子   | 全局响应式 User/Session 状态管理，单例生命周期，监听登录登出        |
| [`src/services/syncEngine.ts`](./src/services/syncEngine.ts)         | 同步中间件 | 核心同步层：`pullAndMerge`、`pushConfig`、`pushProgress`            |
| [`src/components/AuthModal.vue`](./src/components/AuthModal.vue)     | 视图组件   | 登录弹窗：支持 X、论坛、邮箱登录，以及登录后的账号展示与登出        |
| [`src/utils/cache.ts`](./src/utils/cache.ts)                         | 缓存代理   | 在现有 `saveConfig` 和 `saveLocalProgress` 后插入异步非阻塞同步钩子 |
| [`src/App.vue`](./src/App.vue)                                       | 入口挂载   | 挂载 `initAuth`、集成账户快捷入口按钮（支持头像/首字母预览）与弹窗  |
| [`supabase-schema.sql`](./supabase-schema.sql)                       | 数据库脚本 | 数据库表建表、RLS 策略与触发器定义                                  |
| [`.env.local.example`](./.env.local.example)                         | 配置文件   | 环境变量配置模板 (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)    |

---

## 六、 后续实施路线与执行步骤 (Roadmap)

### 阶段一：客户端核心与同步层构建【已完成】

- [x] 安装 `@supabase/supabase-js` 客户端依赖
- [x] 封装 `supabaseClient.ts` 与 `useAuth.ts`
- [x] 实现 Local-First `syncEngine.ts`（数值合并、静默上报、防循环）
- [x] 开发 `AuthModal.vue` 界面并与 `App.vue` 融合
- [x] 通过 `vue-tsc` 类型安全检查与生产环境无破坏性回归验证

### 阶段二：创建独立 Supabase 项目与部署 Schema【已完成】

- [x] 用户在 Supabase 创建独立项目（如 `flying-chess`），提供 `Project URL` 与 `anon key`
- [x] 写入本地 `.env.local`
- [x] 执行 `supabase-schema.sql` 完成数据库初始化及 RLS 配置

### 阶段三：配置 X (Twitter) OAuth 渠道【计划中】

- [ ] 在 Twitter Developer Portal 创建 App，获取 Client ID / Secret
- [ ] 在 Supabase Dashboard 启用 Twitter Provider 并填入回调地址
- [ ] 客户端真实登录调通验证

### 阶段四：打通 SP 专属社区论坛 (atang-sp.run.place) 登录【已完成】

- [x] 基于论坛的 DiscourseConnect 协议配置对接适配桥接
- [x] 在论坛后台开启 SSO Provider 授权
- [x] 客户端“SP 专属社区登录”联调验证

### 阶段五：跨设备多端联调与发布上线【计划中】

- [ ] 跨浏览器（PC / 移动端）多端数据同步验证
- [ ] 弱网与离线断网情况下的鲁棒性测试
- [ ] 合并并发布版本上线
