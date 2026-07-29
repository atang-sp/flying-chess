# 🎲 惩罚飞行棋（Ludo Punishment Game）

一个基于 **Vue 3 + TypeScript** 的创新飞行棋游戏，支持自定义惩罚机制、机关陷阱、匿名统计和多端适配。适合聚会、娱乐和“自律”场景。

---

## ✨ 主要特性

- **自定义惩罚系统**：支持多种工具、身体部位、受罚姿势的自由组合，自动生成惩罚方案。
- **机关陷阱**：棋盘可配置机关格，触发特殊事件或惩罚。
- **3D 骰子动画**：真实 3D 效果，动画可自定义。
- **匿名统计**：生产环境使用无 Cookie 的 Umami 统计关键游戏流程，不上传玩家姓名或配置内容。
- **双模式**：经典局冻结既有规则；实验性的升温局提供约 20 分钟三幕节奏、干预筹码与同场反应。
- **多端适配**：响应式设计，适配桌面和移动端。
- **版本号与构建时间显示**：右上角实时显示版本号，支持 Git Tag 自动注入。
- **新手引导**：内置可重置的新手引导，帮助快速上手。

---

## 🏁 游戏玩法简介

1. **本局玩法**：首页选择经典局或实验性的升温局，并记住当前设备上一次选择。
2. **玩家设置**：经典局支持 1-x 名玩家；升温局至少两人，输入昵称后开始游戏。
3. **掷骰子**：点击骰子进行移动，动画真实。
4. **格子类型**：
   - ⚡ 惩罚格：触发自定义惩罚（工具/部位/姿势/次数等）。
   - 💀 机关格：触发特殊事件或额外惩罚。
   - 🎁 奖励格：前进步数或获得奖励。
   - ⬅️ 后退格、🔄 回到起点、😴 休息格等。
5. **惩罚确认与统计**：经典局开始前可确认/调整惩罚组合，自动统计分布。
6. **胜利奖励**：第一个到达终点的玩家可对其他玩家进行奖励惩罚。

### 升温局（party_v1）

- 一键使用默认场景开局，暖场、升温、终局依次可见；第 3/6 轮进入下一幕，
  活跃时长达到 6/14 分钟时也会在下一轮边界提前切幕。
- 每位玩家有两枚通用干预筹码，每回合最多使用一枚：可接受第二次结果的重掷，
  或在两个兼容普通静态棋盘惩罚之间选择。
- 每轮轮换一次非当前玩家反应：预测 `1–3` 或 `4–6`，猜中可保留点数或改为
  `7 − 当前点数`；同一次骰子最多改变一次。
- 活跃时长达到 20 分钟后完成当前轮，位置最远者胜；并列玩家各掷骰决胜。
- 结算页生成仅在当前设备显示的高光卡，不上传惩罚正文或玩家身份。
- 运行中的升温局不能无损切换玩法；结束或明确重置后返回首页再选择。

---

## ⚙️ 配置与自定义

### 游戏参数

- 所有参数集中在 `src/config/gameConfig.ts`，可自定义：
  - 棋盘格数、布局
  - 惩罚工具（如手掌、尺子、藤条等，强度1-10）
  - 身体部位（如屁股、手心、大腿等，敏感度1-10）
  - 受罚姿势（如站立、手扶墙、跪趴等）
  - 惩罚次数范围、步长
  - 机关格、奖励格、后退格等数量和分布

### 匿名统计

- 遥测逻辑集中在 `src/services/gameTelemetry.ts`，生产环境通过 Umami Cloud 的
  `script.js` 上报，本地开发默认禁用。
- 自定义事件只包含应用版本、玩法、规则集、设备类型以及玩家数、局长、回合数的宽分桶。
- 不上传玩家姓名、惩罚内容、导入配置、原始玩家数、原始时长、原始回合数或任何自定义标识符。
- 不调用 `umami.identify()`，不加载 `recorder.js`，不启用录屏、热力图或性能采集。
- 生产构建从 GitHub Actions 仓库变量 `UMAMI_WEBSITE_ID` 和 `UMAMI_SCRIPT_URL`
  注入配置；Website ID 必须是 UUID。

### 版本号与构建时间

- 版本号自动注入，优先使用环境变量、Git Tag、`package.json`
- 构建时间自动显示
- 相关逻辑见 `vite-plugin-version.ts` 和 `src/config/version.ts`

---

## 📊 统计与分析

- v1.7.4 仅记录 `app_open`、`setup_started`、`game_started`、`game_completed`、
  `game_ended` 和 `play_again` 六类自定义事件，玩法固定为 `classic`。
- v1.8.0 在用户真实选择或切换本局玩法后增加 `mode_selected` 和
  `mode_switched`；所有生命周期事件区分 `mode_id`（`classic`/`party`）与
  `ruleset_version`（`classic_v1`/`party_v1`）。
- Umami 保留标准匿名页面和会话元数据；跟踪器限制域名为 `atang-sp.github.io`，尊重
  Do Not Track，并排除 URL 查询参数与 Hash。
- 统计基线从 v1.7.4 成功部署后开始，历史游戏不会补算。
- 广告拦截、Do Not Track、离线、关闭或刷新页面、脚本加载失败和换设备都会造成少算。
  应用不使用指纹、持久化队列、离线补传或重试来提高上报率。
- 仓库没有 Supabase 统计后端，也没有本地统计弹窗或统计重置入口。

---

## 🛠️ 安装与运行

### 环境要求

- Node.js 18+
- npm 或 yarn

### 安装步骤

```bash
# 1. 克隆项目
git clone https://github.com/atang-sp/flying-chess.git
cd flying-chess

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 4. 访问应用
# 打开浏览器访问: http://localhost:5173/flying-chess/
```

### 构建与部署

```bash
# 构建生产版本
npm run build

# 使用 Git Tag 构建（推荐生产环境）
npm run build:tag

# 预览生产版本
npm run preview
```

### 常见问题

**Q: 访问 localhost:5173 出现 404 错误？**
A: 请确保访问完整路径：`http://localhost:5173/flying-chess/`

**Q: 安装依赖时出现 PrimeVue 相关错误？**
A: 确保安装了所有必需的依赖：

```bash
npm install @primevue/themes
npm install primevue primeicons
```

---

## 🚀 部署

- **GitHub Pages**：支持自动/手动部署，详见 `deploy.sh` 和 `.github/workflows/deploy.yml`
- **Umami Cloud**：生产网站名为 `flying-chess-production`，域名为
  `atang-sp.github.io`；Replays、Heatmaps、Performance 与公开 Share URL 必须保持关闭。
- **Vercel/Netlify**：直接连接仓库，构建命令 `npm run build`，输出目录 `dist`
- **自定义服务器**：将 `dist` 目录部署到任意静态服务器

---

## 🏷️ 版本管理

- 右上角显示当前版本号和构建时间
- 开发环境显示 `dev`，生产环境显示实际版本号（如 `v1.2.3`）
- 支持通过 Git Tag 自动注入版本号

---

## 📱 移动端支持

- 响应式布局，适配手机、平板、PC
- 触摸优化，移动端体验良好

---

## 🧩 技术栈

- **前端框架**：Vue 3 + TypeScript
- **构建工具**：Vite
- **UI/动画**：CSS3 + 3D 变换
- **匿名统计**：Umami Cloud（仅生产环境）
- **PWA 支持**：可安装为桌面/移动应用

---

## 📚 相关文档

- 游戏参数与惩罚机制详见 `src/config/gameConfig.ts`
- 匿名统计事件契约与隐私边界见 `src/services/gameTelemetry.ts`
- 版本号注入逻辑见 `vite-plugin-version.ts`
- 详细开发路线、更新日志请见 [ROADMAP.md] 和 [RELEASE_NOTES.md]（如有）

---

## 📄 许可证

MIT License

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 改进本项目！

---

享受游戏，健康娱乐！🎲✨

---

如需英文版或更详细的开发文档，请联系维护者。
