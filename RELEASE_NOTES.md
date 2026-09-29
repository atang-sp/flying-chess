# 飞行棋 Release Notes

## v1.20.0 — Supabase 账号系统与云端同步（2026-09-29）

### ☁️ 云端同步与账号系统 / Supabase Cloud Sync & Account System

- **Supabase 账号认证体系**：支持邮箱/密码注册、登录与密码找回，预留 X (Twitter) 与 SP 社区论坛 (Discourse) 快捷登录；采用本地优先（Local-First）架构，未登录或断网时游戏完全不受影响。
- **全量配置与成就进度双向同步**：
  - `user_configs`：同步棋盘、惩罚/机关规则、玩家名单、事件卡包、Party Studio 场景与个性化外观配置。
  - `game_progress`：同步成就墙、耻辱墙、对局胜负、受罚/求饶纪录、最高连击统计。
- **双向智能合并算法**：登录后自动将本地进度与云端记录取最高值/并集无损合并，防止多设备游玩时进度覆盖与丢失。
- **自动化 Schema 与行级安全**：提供 `scripts/apply-supabase-schema.mjs` 自动化数据库初始化工具，所有云端表全量启用 Row Level Security (RLS) 保护用户隐私。
- **多语言与交互升级**：右上角新增账户与同步状态面板，实时显示同步状态与时间戳，并支持一键手动同步；全套 10 种语言同步文案补充完毕。

---

## v1.19.12 — 棋盘格子详情与核心对局流程全量国际化修补（2025-09-28）

### 🌍 棋盘卡片与运行期文本彻底本地化 / Complete Localization Cleanup

- **棋盘卡片详情与惩罚卡片全量本地化**：补齐全套 10 种语言中 18 个 `board_cell_detail_*` 键值，彻底消除非中文下卡片显示 `board_cell_detail_tool` 等 raw key 的问题；工具、部位、姿势、次数、动态翻倍后缀及上下玩家前缀全量适配 10 国语言并具备语言切换即时响应能力。
- **手柄控制器多语言接入**：`ActionPanel`、`ConnectionScreen`、`ConnectionStatus`、`MiniBoard` 等手柄控制器组件与 `useMultiDeviceHost` / `useMultiDeviceController` 全面接入 i18n（新增 24 个 `ctrl_*` 键），局域网连接、房间状态及配对错误提示全量本地化。
- **主流程运行期提示彻底去中文化**：消除 `App.vue` 中的中文字符串泄漏，涵盖单机对局恢复确认弹窗 (`resume_session_confirm`)、起飞成功移动提示 (`takeoff_success_move_1`)、三段移动路径格式化 (`effect_display_origin`、`effect_display_cell_n`、`app_rest_in_cell`)、派对模式配置无效弹窗以及投票票数统计。
- **语言包权威对齐**：全套 10 种语言包词条对齐扩展至 882 条，`npm run i18n:check` 与 50 套测试套件（413 项测试）全数通过。

---

## v1.19.11 — 默认惩罚工具/部位/姿势多语言动态适配（2025-09-28）

### 🌍 惩罚实体跨语言即时适配 / Multi-language Punishment Entity Localization

- **动态实体多语言转换**：新增 `punishmentLocalization.ts`，支持将 12 款默认工具、5 个受罚部位、5 种受罚姿势及其执行描述模板在 10 种支持语言（中文、英语、日语、韩语、西班牙语、法语、德语、俄语、葡萄牙语、意大利语）之间自动双向实时映射。
- **展示层全局适配**：`PunishmentDisplay`、`PunishmentConfirmation`、`TakeoffPunishmentDisplay`、`MercyDecision` 及棋盘详情等展示层全面接入动态多语言转换，彻底解决非中文界面下受罚弹窗仍出现中文“尺子/屁股/跪趴”的问题，保证不同语言下完整母语沉浸感。
- **配置与棋盘响应式同步**：切换语言时自动同步当前语言的默认惩罚与机关配置，并在未开始游戏时实时重构棋盘；惩罚配置面板中的“恢复默认”自适应跟随当前选择的界面语言。

---

## v1.19.10 — 国际化里程碑版本（2025-09-28）

> **International Localization Milestone Release**
> This release marks the completion of comprehensive i18n support across the entire application.

---

### 🌍 概述 / Overview

v1.19.10 是飞行棋的**国际化里程碑版本**，实现了从运行期硬编码中文字符串到完整多语言支持的全面升级。

本版本支持 **10 种语言**，玩家可在游戏内实时切换，无需刷新页面。所有动态文案、Toast 通知、游戏事件、社区卡包元数据均实现本地化。

**Supported Languages（支持语言）：**
`zh-CN` · `zh-TW` · `en` · `ja` · `ko` · `fr` · `de` · `es` · `ru` · `ar`

---

### ✨ 主要变更 / What's New

#### Phase 1 — 运行期字符串全面 i18n 化

消除了所有运行期硬编码中文字符串，涵盖：

- **`src/App.vue`**：Toast 通知、Party 事件广播、惩罚变体文案、游戏状态文本、driver.js 新手引导（6 个引导函数统一重构为 `createGuideDriver()`）
- **`src/components/AuthModal.vue`**：云同步未配置提示
- **`src/components/ConfigExport.vue`**：导出/导入错误提示、说明文档弹窗（`showDocumentation`）
- **`src/controller/components/`**（5 个组件）：手机手柄端所有 UI 标签
  - `ConnectionScreen.vue`、`ActionPanel.vue`、`ControllerMain.vue`
  - `ControllerDice.vue`、`GameEndScreen.vue`

#### Phase 2 — 游戏内持久语言切换器

- **`src/utils/locale.ts`**：新增 `SUPPORTED_LANGUAGES` 常量和响应式 `currentLanguageRef`，作为全局语言状态的唯一权威入口
- **`src/App.vue`**：顶部导航区新增**毛玻璃风格语言切换下拉菜单**（支持移动端折叠）
- **`src/components/IntroPage.vue`**：切换至消费共享的 locale 状态，与主应用保持同步

#### Phase 3 — 社区包 / 事件卡 / 场景编辑器多语言 Schema

**社区卡包（Community Packs）：**

- `CommunityPackMetadata` 接口新增可选字段：`title_i18n`、`description_i18n`、`tags_i18n`
- 新增三个辅助函数：`getLocalizedPackTitle()`、`getLocalizedPackDescription()`、`getLocalizedPackTags()`，支持语言回退
- `public/community/index.json` 及所有卡包 JSON（3 个）补齐 10 种语言元数据
- `src/components/CommunityPackBrowser.vue`：语言切换即时响应卡包展示

**Party 事件卡（Party Event Cards）：**

- `PartyEventCard` 接口新增：`title_i18n`、`description_i18n`、`tags_i18n`（可选）
- `validatePartyEventDeck()` 扩展 i18n 字段格式校验
- `src/components/PartyEventCardOverlay.vue`：新增本地化计算属性，标题/描述/标签/Prompt/投票选项均动态响应语言切换

**场景编辑器（Party Studio）：**

- `PartyStudioConfig` 接口新增 `name_i18n` 可选字段
- `src/components/PartySceneSelector.vue`：通过 `$te`/`$t` 动态检测并渲染场景预设的本地化名称与描述，自动回退到原始 `config.name`
- `getLocalizedStudioName()` 辅助函数

**词库扩充：**

- 10 种语言词库从 **799 条 → 822 条**（新增 23 个词条，涵盖场景预设名称/描述及 6 张核心事件卡的标题/描述/选项）

#### Phase 4 — 英文文档

- **`README.en.md`**（新建）：完整英文项目文档，含特性介绍、玩法说明、10 种语言支持列表、社区包 Schema 说明、隐私遥测、安装部署、技术栈
- **`README.md`**：顶部与底部添加双语互链导航（中英互跳）

---

### 📊 质量矩阵 / Quality Matrix

| 指标                 | 结果                                          |
| -------------------- | --------------------------------------------- |
| i18n 词条对称性      | ✅ 10/10 语言，822 词条，100% 对称            |
| TypeScript 类型检查  | ✅ 0 错误（主工程 + game-core + room-server） |
| ESLint 检查          | ✅ 0 warnings，0 errors                       |
| 单元测试             | ✅ 407 个测试，49 个测试文件，全部通过        |
| 格式检查（Prettier） | ✅ 全仓库通过                                 |

---

### 🔄 向后兼容性 / Backward Compatibility

本版本**完全向后兼容**：

- 现有社区卡包无需修改，`*_i18n` 字段为**可选**，缺失时自动回退到原始 `title`/`description`/`tags` 字段
- 游戏规则逻辑（`classic_v1` / `party_v3`）未作任何修改
- 默认语言行为与之前版本一致（跟随浏览器 locale）
- E2E 测试默认 locale（`zh-CN`）保持不变

**社区包作者注意**：如需为您的卡包添加多语言支持，可参照以下 Schema 扩展：

```json
{
  "title": "原始标题（回退值）",
  "title_i18n": {
    "en": "English Title",
    "zh-TW": "繁體中文標題",
    "ja": "日本語タイトル"
  }
}
```

---

### 📁 受影响文件清单 / Changed Files

<details>
<summary>展开查看完整列表（57 个文件）</summary>

**核心源码：**

- `src/App.vue`
- `src/utils/locale.ts`
- `src/components/AuthModal.vue`
- `src/components/ConfigExport.vue`
- `src/components/IntroPage.vue`
- `src/components/CommunityPackBrowser.vue`
- `src/components/PartyEventCardOverlay.vue`
- `src/components/PartySceneSelector.vue`
- `src/services/communityPacks.ts`
- `src/services/partyStudio.ts`
- `packages/game-core/src/partyEvents.ts`

**手柄端组件：**

- `src/controller/components/ConnectionScreen.vue`
- `src/controller/components/ActionPanel.vue`
- `src/controller/components/ControllerMain.vue`
- `src/controller/components/ControllerDice.vue`
- `src/controller/components/GameEndScreen.vue`

**语言词库（10 个文件）：**

- `src/locales/zh-CN.json`、`zh-TW.json`、`en.json`、`ja.json`、`ko.json`
- `src/locales/fr.json`、`de.json`、`es.json`、`ru.json`、`ar.json`

**社区数据：**

- `public/community/index.json`
- `public/community/packs/classic-adventure.json`
- `public/community/packs/family-fun.json`
- `public/community/packs/office-party.json`

**测试：**

- `src/tests/communityPacks.test.ts`
- `src/tests/partyStudio.test.ts`

**文档：**

- `README.md`
- `README.en.md`（新建）

**构建产物：**

- `docs/**`（`npm run deploy:docs` 重新生成）

**版本：**

- `package.json`（`1.19.9` → `1.19.10`）

</details>

---

### 🙏 致谢 / Acknowledgments

感谢所有为飞行棋的国际化推进做出贡献的社区成员。

---

_Generated for release v1.19.10_
