import json
import re

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')

translations = {
    "progress_achievements_title": {"zh": "进度、成就与本地耻辱墙", "en": "Progress, Achievements & Local Hall of Shame"},
    "achievements_count": {"zh": "项成就", "en": "Achievements"},
    "completed_games": {"zh": "完成局数", "en": "Games Completed"},
    "total_punishments": {"zh": "累计受罚", "en": "Total Punishments"},
    "total_mercy_requests": {"zh": "累计求饶", "en": "Total Mercy Requests"},
    "longest_chain": {"zh": "最长连锁", "en": "Longest Chain"},
    "achievements_header": {"zh": "成就", "en": "Achievements"},
    "unlocked_content": {"zh": "已解锁内容", "en": "Unlocked Content"},
    "punishment_variants_desc": {"zh": "惩罚变体 {variants}/5（核心 4 种常驻，返场需解锁） · 小游戏机关 {traps}/3", "en": "Punishment Variants {variants}/5 (4 core permanent) · Mini-game Traps {traps}/3"},
    "local_shame_wall": {"zh": "本地耻辱墙", "en": "Local Hall of Shame"},
    "shame_wall_stats": {"zh": "{count} 次 · 求饶 {mercy}", "en": "{count} times · Mercy {mercy}"},
    "privacy_copy": {"zh": "这些记录仅保存在当前设备，可用首页“清除本地游戏数据”一并删除。", "en": "These records are only saved on this device, clear them via 'Clear Local Game Data' on the home page."}
}

en_json = load_json('src/locales/en.json')
zh_json = load_json('src/locales/zh-CN.json')

for key, val in translations.items():
    en_json[key] = val['en']
    zh_json[key] = val['zh']

save_json('src/locales/en.json', en_json)
save_json('src/locales/zh-CN.json', zh_json)

# Fix IntroPage.vue reactivity
with open('src/components/IntroPage.vue', 'r', encoding='utf-8') as f:
    vue_content = f.read()

# Replace scenarioPresets array definition with computed
vue_content = vue_content.replace('const scenarioPresets: ScenarioPreset[] = [', 'const scenarioPresets = computed<ScenarioPreset[]>(() => [')

# Find the end of scenarioPresets array to add the closing parenthesis
# It ends at `    },` followed by `  ]`
vue_content = vue_content.replace('    },\n  ]', '    },\n  ])')

# Replace usages of scenarioPresets with scenarioPresets.value
vue_content = vue_content.replace('scenarioPresets.forEach', 'scenarioPresets.value.forEach')
vue_content = vue_content.replace('scenarioPresets.find', 'scenarioPresets.value.find')
# The template usage doesn't need .value

with open('src/components/IntroPage.vue', 'w', encoding='utf-8') as f:
    f.write(vue_content)

# Fix ProgressAchievements.vue strings
with open('src/components/ProgressAchievements.vue', 'r', encoding='utf-8') as f:
    pa_content = f.read()

if "useI18n" not in pa_content:
    pa_content = pa_content.replace("import { computed } from 'vue'", "import { computed } from 'vue'\n  import { useI18n } from 'vue-i18n'")
    pa_content = pa_content.replace("const props = defineProps", "const { t } = useI18n()\n  const props = defineProps")

replacements = [
    ('进度、成就与本地耻辱墙', '{{ $t(\'progress_achievements_title\') }}'),
    ('项成就', '{{ $t(\'achievements_count\') }}'),
    ('<span>完成局数</span>', '<span>{{ $t(\'completed_games\') }}</span>'),
    ('<span>累计受罚</span>', '<span>{{ $t(\'total_punishments\') }}</span>'),
    ('<span>累计求饶</span>', '<span>{{ $t(\'total_mercy_requests\') }}</span>'),
    ('<span>最长连锁</span>', '<span>{{ $t(\'longest_chain\') }}</span>'),
    ('成就\n        </h3>', '{{ $t(\'achievements_header\') }}\n        </h3>'),
    ('<h3>已解锁内容</h3>', '<h3>{{ $t(\'unlocked_content\') }}</h3>'),
    ('惩罚变体 {{ unlocked.punishmentVariants.length }}/5（核心 4 种常驻，返场需解锁） ·\n          小游戏机关 {{ unlocked.miniGameTraps.length }}/3',
     '{{ $t(\'punishment_variants_desc\', { variants: unlocked.punishmentVariants.length, traps: unlocked.miniGameTraps.length }) }}'),
    ('<h3>本地耻辱墙</h3>', '<h3>{{ $t(\'local_shame_wall\') }}</h3>'),
    ('<strong>{{ player.punishmentCount }} 次 · 求饶 {{ player.mercyRequests }}</strong>', '<strong>{{ $t(\'shame_wall_stats\', { count: player.punishmentCount, mercy: player.mercyRequests }) }}</strong>'),
    ('这些记录仅保存在当前设备，可用首页“清除本地游戏数据”一并删除。', '{{ $t(\'privacy_copy\') }}')
]

for old, new in replacements:
    pa_content = pa_content.replace(old, new)

with open('src/components/ProgressAchievements.vue', 'w', encoding='utf-8') as f:
    f.write(pa_content)
