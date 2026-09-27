import json
import re
import sys

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')

translations = {
  "game_title": {"zh": "惩罚飞行棋", "en": "Punishment Flying Chess"},
  "game_subtitle": {"zh": "环形棋盘 · 自定义惩罚 · 刺激体验", "en": "Circular Board · Custom Punishments · Thrilling Experience"},
  "developer": {"zh": "开发者：阿汤", "en": "Developer: Atang"},
  "forum_link": {"zh": "论坛: atang-sp.run.place", "en": "Forum: atang-sp.run.place"},
  "quick_start_recommend": {"zh": "快速开局推荐", "en": "Quick Start Recommended"},
  "classic_priority": {"zh": "👑 经典局优先", "en": "👑 Classic Priority"},
  "presets_intro": {"zh": "选择推荐配置即可一键直接掷骰开局，或点击卡片选定后在下方按需微调", "en": "Select a recommended preset to start immediately, or click a card to customize below"},
  "classic_4_title": {"zh": "经典 4 人标准局", "en": "Classic 4-Player Standard"},
  "classic_4_badge": {"zh": "最经典", "en": "Most Classic"},
  "classic_4_desc": {"zh": "4人满员起飞 · 撞子回航 · 原汁原味的经典飞行棋对战", "en": "4-player full takeoff · Collision return · Authentic classic gameplay"},
  "classic_2_title": {"zh": "经典 2 人极速局", "en": "Classic 2-Player Fast"},
  "classic_2_badge": {"zh": "快节奏", "en": "Fast Paced"},
  "classic_2_desc": {"zh": "双人面对面较量 · 快速起飞 · 轻松休闲的策略博弈", "en": "1v1 duel · Quick takeoff · Relaxed strategic battle"},
  "classic_3_title": {"zh": "经典 3 人好友局", "en": "Classic 3-Player Friends"},
  "classic_3_badge": {"zh": "好友局", "en": "Friends"},
  "classic_3_desc": {"zh": "三人环形棋盘 · 攻防牵制 · 欢乐互动的经典对弈", "en": "3-player circular board · Attack and defense · Joyful classic interaction"},
  "party_4_title": {"zh": "聚会升温拓展局", "en": "Party Extension"},
  "party_4_badge": {"zh": "拓展玩法", "en": "Extended Play"},
  "party_4_desc": {"zh": "真心话大冒险、筹码干预与同场反应 · 破冰酒局必备", "en": "Truth or Dare, Token Interventions, and Reactions · Icebreaker essential"},
  "quick_start_btn": {"zh": "一键开局", "en": "Quick Start"},
  "gameplay_mode": {"zh": "本局玩法模式", "en": "Gameplay Mode"},
  "classic_badge": {"zh": "👑 官方推荐 · 核心玩法", "en": "👑 Official Recommended · Core Gameplay"},
  "classic_desc": {"zh": "经典飞行棋完整规则 · 原汁原味起飞、撞子回航与策略博弈（支持 2–4 人）", "en": "Complete classic rules · Authentic takeoff, collision return and strategy (2-4 players)"},
  "party_badge": {"zh": "🔥 聚会拓展", "en": "🔥 Party Extension"},
  "party_desc": {"zh": "派对互动玩法 · 约 20 分钟 · 三幕进程、筹码干预与真心话大冒险", "en": "Party interactive gameplay · Around 20 mins · 3-act progression, token interventions and truth or dare"},
  "multi_device_mode": {"zh": "多设备模式", "en": "Multi-Device Mode"},
  "multi_device_desc": {"zh": "每人用自己的手机操作", "en": "Each player uses their own phone"},
  "online_party_title": {"zh": "联机升温局", "en": "Online Party Mode"},
  "online_party_desc": {"zh": "2–8 人扫码加入，由房间服务器同步局面", "en": "2-8 players join via QR code, synchronized by room server"},
  "player_settings": {"zh": "玩家设置", "en": "Player Settings"},
  "player_count_label": {"zh": "玩家人数", "en": "Player Count"},
  "unit_people": {"zh": "人", "en": ""},
  "player_names_label": {"zh": "玩家昵称", "en": "Player Names"},
  "players_duel": {"zh": "人对决", "en": " Players"},
  "preset_time_20m": {"zh": "约20分", "en": "~20 mins"},
  "preset_time_10m": {"zh": "约10分", "en": "~10 mins"},
  "preset_time_15m": {"zh": "约15分", "en": "~15 mins"},
  "game_duration_20m": {"zh": "约20分钟", "en": "Around 20 mins"},
  "game_duration_10m": {"zh": "约10分钟", "en": "Around 10 mins"},
  "game_duration_15_20m": {"zh": "约15-20分钟", "en": "Around 15-20 mins"},
  "game_duration_label": {"zh": "游戏时长：", "en": "Duration: "},
  "game_target_adult": {"zh": "适合年龄：18岁以上（聚会互动）", "en": "Ages: 18+ (Party Interaction)"},
  "game_target_all": {"zh": "全年龄段休闲益智对战", "en": "All ages casual strategy battle"},
  "advanced_settings_workshop": {"zh": "升温局局况与工坊", "en": "Party Mode Workshop"},
  "custom_rules_config": {"zh": "⚙️ 自定义规则配置", "en": "⚙️ Custom Rules Config"},
  "clear_local_data": {"zh": "清除本地游戏数据", "en": "Clear Local Game Data"},
  "clear_cache_hint": {"zh": "清除后刷新页面即可从默认配置重新开始", "en": "Refresh the page after clearing to restart from default settings"},
  "local_data_cleared": {"zh": "本地游戏数据已清除", "en": "Local game data cleared"},
  "party_min_players_hint": {"zh": "升温局需要至少两名玩家参与反应。", "en": "Party mode requires at least two players for reactions."},
  "privacy_note": {"zh": "本应用使用无 Cookie 的匿名统计改进体验；不会上传玩家姓名、游戏配置内容，也不启用录屏或页面回放。", "en": "This app uses cookie-free anonymous stats; does not upload player names, game configs, nor record screens."}
}

en_json = load_json('src/locales/en.json')
zh_json = load_json('src/locales/zh-CN.json')

for key, val in translations.items():
    en_json[key] = val['en']
    zh_json[key] = val['zh']

save_json('src/locales/en.json', en_json)
save_json('src/locales/zh-CN.json', zh_json)

with open('src/components/IntroPage.vue', 'r', encoding='utf-8') as f:
    vue_content = f.read()

# Replace script array
script_replacements = [
    ("title: '经典 4 人标准局'", "title: localeContent.classic_4_title || '经典 4 人标准局'"),
    ("tag: '👑 官方推荐'", "tag: localeContent.classic_priority || '👑 官方推荐'"),
    ("badge: '最经典'", "badge: localeContent.classic_4_badge || '最经典'"),
    ("desc: '4人满员起飞 · 撞子回航 · 原汁原味的经典飞行棋对战'", "desc: localeContent.classic_4_desc || '4人满员起飞 · 撞子回航 · 原汁原味的经典飞行棋对战'"),
    ("title: '经典 2 人极速局'", "title: localeContent.classic_2_title || '经典 2 人极速局'"),
    ("tag: '⚡ 双人速战'", "tag: localeContent.classic_2_tag || '⚡ 双人速战'"),
    ("badge: '快节奏'", "badge: localeContent.classic_2_badge || '快节奏'"),
    ("desc: '双人面对面较量 · 快速起飞 · 轻松休闲的策略博弈'", "desc: localeContent.classic_2_desc || '双人面对面较量 · 快速起飞 · 轻松休闲的策略博弈'"),
    ("title: '经典 3 人好友局'", "title: localeContent.classic_3_title || '经典 3 人好友局'"),
    ("tag: '🎯 三人同行'", "tag: localeContent.classic_3_tag || '🎯 三人同行'"),
    ("badge: '好友局'", "badge: localeContent.classic_3_badge || '好友局'"),
    ("desc: '三人环形棋盘 · 攻防牵制 · 欢乐互动的经典对弈'", "desc: localeContent.classic_3_desc || '三人环形棋盘 · 攻防牵制 · 欢乐互动的经典对弈'"),
    ("title: '聚会升温拓展局'", "title: localeContent.party_4_title || '聚会升温拓展局'"),
    ("tag: '🔥 派对自选'", "tag: localeContent.party_4_tag || '🔥 派对自选'"),
    ("badge: '拓展玩法'", "badge: localeContent.party_4_badge || '拓展玩法'"),
    ("desc: '真心话大冒险、筹码干预与同场反应 · 破冰酒局必备'", "desc: localeContent.party_4_desc || '真心话大冒险、筹码干预与同场反应 · 破冰酒局必备'"),
]

# Note: actually it's easier to use $t in template for template stuff
template_replacements = [
    ('<span class="title-main">惩罚飞行棋</span>', '<span class="title-main">{{ $t(\'game_title\') }}</span>'),
    ('<span class="subtitle-text">环形棋盘 · 自定义惩罚 · 刺激体验</span>', '<span class="subtitle-text">{{ $t(\'game_subtitle\') }}</span>'),
    ('<span class="dev-name">开发者：阿汤</span>', '<span class="dev-name">{{ $t(\'developer\') }}</span>'),
    ('<span class="dev-id">论坛: atang-sp.run.place</span>', '<span class="dev-id">{{ $t(\'forum_link\') }}</span>'),
    ('<span class="settings-title-text">快速开局推荐</span>', '<span class="settings-title-text">{{ $t(\'quick_start_recommend\') }}</span>'),
    ('<span class="settings-title-badge">👑 经典局优先</span>', '<span class="settings-title-badge">{{ $t(\'classic_priority\') }}</span>'),
    ('选择推荐配置即可一键直接掷骰开局，或点击卡片选定后在下方按需微调', '{{ $t(\'presets_intro\') }}'),
    ('{{ preset.playerCount }}人对决', '{{ preset.playerCount }}{{ $t(\'players_duel\') }}'),
    ("? '约20分'", "? $t('preset_time_20m')"),
    ("? '约10分'", "? $t('preset_time_10m')"),
    (": '约15分'", ": $t('preset_time_15m')"),
    ('<span>一键开局</span>', '<span>{{ $t(\'quick_start_btn\') }}</span>'),
    ('<span class="settings-title-text">本局玩法模式</span>', '<span class="settings-title-text">{{ $t(\'gameplay_mode\') }}</span>'),
    ('👑 官方推荐 · 核心玩法', '{{ $t(\'classic_badge\') }}'),
    ('经典飞行棋完整规则 · 原汁原味起飞、撞子回航与策略博弈（支持 2–4 人）', '{{ $t(\'classic_desc\') }}'),
    ('🔥 聚会拓展', '{{ $t(\'party_badge\') }}'),
    ('派对互动玩法 · 约 20 分钟 · 三幕进程、筹码干预与真心话大冒险', '{{ $t(\'party_desc\') }}'),
    ('<span class="mode-card__title">多设备模式</span>', '<span class="mode-card__title">{{ $t(\'multi_device_mode\') }}</span>'),
    ('<span class="mode-card__desc">每人用自己的手机操作</span>', '<span class="mode-card__desc">{{ $t(\'multi_device_desc\') }}</span>'),
    ('<strong>联机升温局</strong>', '<strong>{{ $t(\'online_party_title\') }}</strong>'),
    ('<span>2–8 人扫码加入，由房间服务器同步局面</span>', '<span>{{ $t(\'online_party_desc\') }}</span>'),
    ('<span class="settings-title-text">玩家设置</span>', '<span class="settings-title-text">{{ $t(\'player_settings\') }}</span>'),
    ('<span class="label-text">玩家人数</span>', '<span class="label-text">{{ $t(\'player_count_label\') }}</span>'),
    ('<span class="count-unit">人</span>', '<span class="count-unit" v-if="$t(\'unit_people\')">{{ $t(\'unit_people\') }}</span>'),
    ('<span class="names-title">玩家昵称</span>', '<span class="names-title">{{ $t(\'player_names_label\') }}</span>'),
    ('游戏时长：', '{{ $t(\'game_duration_label\') }}'),
    ("? '约20分钟'", "? $t('game_duration_20m')"),
    ("? '约10分钟'", "? $t('game_duration_10m')"),
    (": '约15-20分钟'", ": $t('game_duration_15_20m')"),
    ("? '适合年龄：18岁以上（聚会互动）' : '全年龄段休闲益智对战'", "? $t('game_target_adult') : $t('game_target_all')"),
    ("{{ selectedMode === 'party' ? '升温局局况与工坊' : '⚙️ 自定义规则配置' }}", "{{ selectedMode === 'party' ? $t('advanced_settings_workshop') : $t('custom_rules_config') }}"),
    ('<span class="btn-text">清除本地游戏数据</span>', '<span class="btn-text">{{ $t(\'clear_local_data\') }}</span>'),
    ('<p class="cache-hint">清除后刷新页面即可从默认配置重新开始</p>', '<p class="cache-hint">{{ $t(\'clear_cache_hint\') }}</p>'),
    ('<span class="toast-text">本地游戏数据已清除</span>', '<span class="toast-text">{{ $t(\'local_data_cleared\') }}</span>'),
    ('升温局需要至少两名玩家参与反应。', '{{ $t(\'party_min_players_hint\') }}'),
    ('本应用使用无 Cookie\n          的匿名统计改进体验；不会上传玩家姓名、游戏配置内容，也不启用录屏或页面回放。', '{{ $t(\'privacy_note\') }}'),
    ('本应用使用无 Cookie\n          的匿名统计改进体验；不会上传玩家姓名、游戏配置内容，也不启用录屏或页面回放。', '{{ $t(\'privacy_note\') }}')
]

for old, new in template_replacements:
    vue_content = vue_content.replace(old, new)
    # also handle potential single line
    old_single = old.replace('\n          ', ' ')
    if old_single != old:
        vue_content = vue_content.replace(old_single, new)

# Handle script setup translation using localeContent
# but wait! We can just define variables from localeContent!
# First we need to make sure we export/add these in LocaleContent interface if necessary,
# but it's typescript so might fail if LocaleContent doesn't define them.
# The user wants UI mostly translated. Wait, instead of updating localeContent which requires changing TS interfaces in game-core,
# We can use vue-i18n's $t or global t inside the script!
# In IntroPage.vue, there is no `useI18n` imported.
# We can import it: `import { useI18n } from 'vue-i18n'` and call `const { t } = useI18n()`
# then in the script we can use `t('classic_4_title')`

# Wait, `scenarioPresets` is outside the component setup? No, it's inside `const scenarioPresets = ...`
# Let's insert `import { useI18n } from 'vue-i18n'` at the top.
if 'useI18n' not in vue_content:
    vue_content = vue_content.replace("import { computed, ref, onMounted, onUnmounted, watch } from 'vue'",
                                      "import { computed, ref, onMounted, onUnmounted, watch } from 'vue'\n  import { useI18n } from 'vue-i18n'")
    vue_content = vue_content.replace("const props = defineProps",
                                      "const { t } = useI18n()\n  const props = defineProps")

# Now update the scenarioPresets strings in the script
script_updates = [
    ("'经典 4 人标准局'", "t('classic_4_title')"),
    ("'👑 官方推荐'", "t('classic_priority')"),
    ("'最经典'", "t('classic_4_badge')"),
    ("'4人满员起飞 · 撞子回航 · 原汁原味的经典飞行棋对战'", "t('classic_4_desc')"),
    ("'经典 2 人极速局'", "t('classic_2_title')"),
    ("'⚡ 双人速战'", "t('classic_2_tag')"),
    ("'快节奏'", "t('classic_2_badge')"),
    ("'双人面对面较量 · 快速起飞 · 轻松休闲的策略博弈'", "t('classic_2_desc')"),
    ("'经典 3 人好友局'", "t('classic_3_title')"),
    ("'🎯 三人同行'", "t('classic_3_tag')"),
    ("'好友局'", "t('classic_3_badge')"),
    ("'三人环形棋盘 · 攻防牵制 · 欢乐互动的经典对弈'", "t('classic_3_desc')"),
    ("'聚会升温拓展局'", "t('party_4_title')"),
    ("'🔥 派对自选'", "t('party_4_tag')"),
    ("'拓展玩法'", "t('party_4_badge')"),
    ("'真心话大冒险、筹码干预与同场反应 · 破冰酒局必备'", "t('party_4_desc')"),
    ("presetFeedback.value = `已选定【${preset.title}】，可点击「立即开局」直接掷骰，或在下方调整玩家昵称与规则`",
     "presetFeedback.value = t('preset_feedback', { title: preset.title })"),
    ("return '一键开始升温局'", "return t('quick_start_party')"),
    ("return `⚡ 立即开局（${currentPreset.title}）`", "return t('quick_start_preset', { title: currentPreset.title })"),
    ("return `⚡ 立即开始经典局（${playerCount.value}人）`", "return t('quick_start_classic', { count: playerCount.value })"),
]
for old, new in script_updates:
    vue_content = vue_content.replace(old, new)

with open('src/components/IntroPage.vue', 'w', encoding='utf-8') as f:
    f.write(vue_content)
