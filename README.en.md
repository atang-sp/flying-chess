# 🎲 Ludo Punishment Game

[English](README.en.md) | [中文文档](README.md)

An innovative board game built with **Vue 3 + TypeScript**, featuring customizable punishment mechanisms, trap cells, privacy-friendly anonymous analytics, multi-device connectivity, and responsive multi-language support. Ideal for parties, casual entertainment, and self-discipline games.

---

## ✨ Key Features

- **Custom Punishment System**: Free combinations of punishment tools, body parts, and postures with automatic configuration generation.
- **Dynamic Board Traps & Mechanisms**: Configurable trap cells triggering special events, reverses, rests, or extra challenges.
- **3D Dice Animation**: Smooth, realistic 3D dice physics and customizable roll effects.
- **Full Internationalization (10 Languages)**: Complete localization across Chinese (`zh-CN`), English (`en`), Japanese (`ja`), Korean (`ko`), Spanish (`es`), French (`fr`), German (`de`), Russian (`ru`), Portuguese (`pt`), and Italian (`it`), featuring a persistent in-game language switcher.
- **Dual Game Modes**:
  - **Classic Mode (`classic_v1`)**: Traditional turn-based flying chess rules with customizable punishment combinations.
  - **Party Heating Mode (`party_v3`)**: A ~20-minute three-act narrative (Warmup, Heating, Finale), heat meter progression, renewable momentum chips, and real-time player reactions.
- **Multi-Device Controller**: Use smartphones as handheld wireless gamepads. Peer-to-peer WebRTC local network pairing without cloud relay or signaling servers.
- **Online Room Server**: 2–8 player online multiplayer via lightweight WebSocket room server (`apps/room-server`), featuring state projection, seat recovery, and reconnect protection.
- **Customizable Victory Settlement**: Customizable winner action, count, and unit with optional loser gradients for party finales.
- **Party Event Cards & Fate Wheel**: Independent event card decks triggered by turns, streaks, or dice values—including secret voting, all-hands rock-paper-scissors, temporary multipliers, and player binding.
- **Interactive Mini-Games**: Traps and event cards trigger quick reflexes, memory card flips, and rapid-fire Q&A challenges that carry rewards or penalties into the next punishment.
- **Static Community Pack Market**: Community catalog on GitHub Pages providing ratings, tags, one-click pack loading, and validated remote HTTP(S) JSON imports with full i18n support (`title_i18n`, `description_i18n`, `tags_i18n`).
- **Local Progress & Shame Wall**: Tracks completed games, punishments served, mercy pleas, and streaks locally on the device—generating badges, achievements, and a local Wall of Shame without remote database storage.
- **Party Studio**: Visual scenario editor supporting act gates, round/time thresholds, cell distribution ratios, Q&A/Dare content pools, drag-and-drop board layouts, and customizable visual themes (Aurora, Ember, Midnight).
- **Responsive Layout**: Fluid design tailored for mobile phones, tablets, and desktop displays.
- **Built-in Tour Guides**: Interactive step-by-step driver.js guides to help new players quickly master the rules.

---

## 🏁 Gameplay Guide

### Basic Flow

1. **Choose Mode**: Select Classic Mode or experimental Party Heating Mode on the home screen.
2. **Player Setup**: Classic supports 1 to N players; Party Mode requires at least 2 players.
3. **Roll Dice**: Tap the 3D dice to move your meeple along the track.
4. **Cell Types**:
   - ⚡ **Punishment Cell**: Triggers a generated punishment (tool, body part, posture, strike count).
   - 💀 **Trap Cell**: Triggers a random mechanism or unexpected punishment.
   - 🎁 **Bonus Cell**: Advances extra steps forward.
   - ⬅️ **Reverse Cell**, 🔄 **Restart to Origin**, 😴 **Rest Cell**, etc.
5. **Settlement**: The first player to reach the final cell wins the game and claims victory rewards over opponents.

### Party Heating Mode (`party_v3`)

- **Three-Act Structure**: Progresses through **Warmup**, **Heating**, and **Finale**. Global heat accumulates from 0 to 100:
  - 30 Heat: Enters Heating Act.
  - 70 Heat: Enters Finale Act.
  - 100 Heat: Triggers game settlement after completing the current full round.
- **Momentum Chips**: Each player starts with 1 renewable momentum chip (maximum capacity of 3, up to 1 chip usable per turn). Chips can be spent to re-roll, pick between two random options, or transfer, double, or negate punishments before settlement.
- **Punishment Variants**: Heating and Finale acts introduce Mystery Box, Conditional, Deferred, and Two-Way punishment variants.
- **Event Cards**: Decks trigger every N rounds, on consecutive punishment streaks, or specific dice rolls (e.g. Lucky 6 Reflex, Fate Vote, Bound by Fate, All-Hands Rock-Paper-Scissors).

---

## 🌐 Internationalization & Language Switcher

The application provides first-class support for 10 languages:

- 🇨🇳 简体中文 (Simplified Chinese, `zh-CN`)
- 🇺🇸 English (`en`)
- 🇯🇵 日本語 (Japanese, `ja`)
- 🇰🇷 한국어 (Korean, `ko`)
- 🇪🇸 Español (Spanish, `es`)
- 🇫🇷 Français (French, `fr`)
- 🇩🇪 Deutsch (German, `de`)
- 🇷🇺 Русский (Russian, `ru`)
- 🇵🇹 Português (Portuguese, `pt`)
- 🇮🇹 Italiano (Italian, `it`)

Switch languages at any time using the language selector on the introductory screen or directly in-game via the floating navigation dock. All tour guides, dynamic event announcements, and community market cards dynamically adapt to your selected language.

---

## 🛒 Community Pack Catalog

- The static catalog index is located at `public/community/index.json`, with sample packs in `public/community/packs/`.
- Remote packs accept HTTP(S) URLs up to 500 KB and validate schema version, event decks, victory settings, and Party Studio configs.
- Packs support localized metadata:
  ```json
  {
    "schemaVersion": 1,
    "id": "icebreaker-plus",
    "title": "破冰加量包",
    "title_i18n": {
      "en": "Icebreaker Plus Pack",
      "zh-CN": "破冰加量包"
    },
    "description": "适合新朋友的轻量投票、问答和反应事件。",
    "description_i18n": {
      "en": "Lightweight voting, Q&A, and reaction events suitable for new friends.",
      "zh-CN": "适合新朋友的轻量投票、问答和反应事件。"
    },
    "tags": ["破冰局", "轻度", "多人"],
    "tags_i18n": {
      "en": ["Icebreaker", "Light", "Multiplayer"],
      "zh-CN": ["破冰局", "轻度", "多人"]
    },
    "rating": 4.8,
    "packUrl": "/flying-chess/community/packs/icebreaker-plus.json"
  }
  ```

---

## 🔒 Privacy & Anonymous Telemetry

- In production, privacy-respecting Umami Cloud telemetry (`script.js`) is used to record anonymous lifecycle events (`app_open`, `mode_selected`, `game_started`, `game_completed`).
- **Zero Personal Data**: Player names, custom punishment text, imported configurations, and IP addresses are **never** collected or stored.
- Strictly adheres to **Do Not Track (DNT)** browser signals and strips URL parameters and hashes.

---

## 🛠️ Development & Installation

### Prerequisites

- Node.js 20+
- npm or yarn

### Getting Started

```bash
# 1. Clone repository
git clone https://github.com/atang-sp/flying-chess.git
cd flying-chess

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev

# 4. Open in browser
# Visit http://localhost:5173/flying-chess/
```

### Verification & Testing

```bash
# Type checking
npm run type-check

# Linting
npm run lint:check

# Unit tests
npm run test

# Check i18n key consistency across all 10 locales
npm run i18n:check
```

### Build & Deployment

```bash
# Production build
npm run build

# Build and copy output to docs/ for GitHub Pages
npm run deploy:docs
```

---

## 🧩 Tech Stack

- **Framework**: [Vue 3](https://vuejs.org/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **State & Logic**: `@flying-chess/game-core` domain package
- **Internationalization**: [vue-i18n](https://vue-i18n.intlify.dev/)
- **UI & Icons**: [Lucide Icons](https://lucide.dev/), [PrimeVue](https://primevue.org/)
- **Guided Tours**: [driver.js](https://driverjs.com/)
- **PWA**: `vite-plugin-pwa`

---

## 📄 License

MIT License. Have fun and enjoy responsibly! 🎲✨
