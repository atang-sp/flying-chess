# 飞行棋云同步接入指南

## 概览

本文档说明如何完成 Supabase 后端的配置，使游戏的「本地优先·云端同步」功能完整运转。

## 第一步：创建 Supabase 项目

1. 访问 [supabase.com](https://supabase.com) 并创建新项目
2. 记录以下两个值（Dashboard → Settings → API）：
   - **Project URL** (`VITE_SUPABASE_URL`)
   - **Anon Public Key** (`VITE_SUPABASE_ANON_KEY`)

## 第二步：配置环境变量

### 本地开发测试（两种方式任选其一）

**方式 A：使用 `.env.local` 文件（推荐本地开发）**
复制 `.env.local.example` 为 `.env.local` 并填入真实值：

```bash
cp .env.local.example .env.local
```

编辑 `.env.local`：

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**方式 B：网页端临时快速测试（无需重启构建）**
打开游戏网页，点击右上角账户图标，在弹窗中展开「🛠️ 本地临时凭据快速测试」，填入 Project URL 与 Anon Key，点击「保存并在本地连接」即可即时刷新测试。

### 线上部署自动化注入（GitHub Actions）

进入 GitHub 仓库：
**Settings → Secrets and variables → Actions**
在 **Repository secrets** 或 **Repository variables** 中添加：

- `VITE_SUPABASE_URL`: `https://your-project-id.supabase.co`
- `VITE_SUPABASE_ANON_KEY`: `your-anon-key-here`

后续通过 Git Tag 触发自动构建（`v*`）时，GitHub Pages 产物将自动集成云同步服务。

## 第三步：执行数据库 Schema

在 Supabase Dashboard → **SQL Editor** 中，粘贴并执行 [`supabase-schema.sql`](./supabase-schema.sql) 的全部内容。

该 Schema 会创建并支持：
| 表 | 说明 | 同步范围 |
|---|---|---|
| `profiles` | 账号基础信息（昵称、头像、登录方式） | 用户个人资料 |
| `user_configs` | 玩家全局配置与偏好 | 棋盘配置、惩罚/机关设置、玩家名单、终局奖惩规则、事件卡包、Party Studio 场景与语言模式 |
| `game_progress` | 成就进度 + 耻辱墙 | 总局数、受罚次数、求饶次数、连击纪录、四种变体完成数及玩家耻辱墙映射 |

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
> 服务器上已部署 DiscourseConnect OAuth2 Bridge 桥接服务（基于 Systemd 运行在 `8788` 端口，并通过 Nginx `/oauth/` 安全对外暴露）。

**Supabase 控制台配置步骤：**

1. 登录 Supabase 控制台，进入项目 Dashboard：
   **Authentication → Providers → Custom Providers → Add Provider** (或 **New Provider**)
2. 填入以下配置：
   - **Provider identifier**: `custom:discourse`
   - **Client ID**: `flying-chess`
   - **Client Secret**: `flying-chess-secret`
   - **Authorization URL**: `https://atang-sp.run.place/oauth/authorize`
   - **Token URL**: `https://atang-sp.run.place/oauth/token`
   - **User Info URL**: `https://atang-sp.run.place/oauth/userinfo`
   - _(或直接使用 OIDC Issuer URL: `https://atang-sp.run.place/oauth`)_
3. 点击 **Save** 保存并启用。

用户在飞行棋点击「SP 社区论坛登录」时，将通过桥接器无缝跳转至论坛单点登录并完成身份认证。

## 同步与升级规则

本地保存设置/进度时记录持久化待上传状态，网络失败不阻塞游戏。同步串行执行，先拉取，再以服务器 updated_at 条件更新；并发冲突重新读取。设置按整包编辑时间决定采用哪一侧，云端回填同时更新页面，进行中的对局不重置规则。

进度使用历史基线与每台设备的独立累计计数，元数据位于 game_progress.totals.\_\_replica。不同设备的新事件相加，同一设备的重试去重，最高连击取最大值。使用现有表和 updated_at 触发器；旧项目还须在 SQL Editor 执行 [supabase-sync-upgrade.sql](./supabase-sync-upgrade.sql)，拒绝旧客户端删除新版计数元数据。脚本可重复执行，不改动现有累计值。新版发布须等待此保护部署完成。

旧历史统计按最大值保守合并；升级后新事件可以独立累加。如果旧客户端覆盖了设备元数据且数据不一致，新版停止上传并保留双方数据，需要人工核对并恢复已知有效元数据。发布后请先更新所有参与同步的设备，避免同时运行新旧版本。

账号各自使用独立存储键，游客数据保留在原有本地键中。首次登录不自动上传游客数据；账号面板提供显式导入，导入会替换账号设置，历史进度按最大值合并。退出/切换账号后旧同步响应失效。

邮箱注册、登录与密码找回分别操作。Supabase 的 Email confirmation 与 Password recovery 回调都应允许实际游戏地址 https://atang-sp.github.io/flying-chess/；SMTP/邮件投递及真实 OAuth 最终回调仍需真人账号验收。

完整实施状态和验收清单见 [ACCOUNT_SYSTEM_INTEGRATION_PLAN.md](./ACCOUNT_SYSTEM_INTEGRATION_PLAN.md)。
