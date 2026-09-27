import json

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')

translations = {
    "preset_feedback": {"zh": "已选定【{title}】，可点击「立即开局」直接掷骰，或在下方调整玩家昵称与规则", "en": "Selected [{title}], click 'Quick Start' to roll dice immediately, or adjust names and rules below."},
    "quick_start_party": {"zh": "一键开始升温局", "en": "Quick Start Party Mode"},
    "quick_start_preset": {"zh": "⚡ 立即开局（{title}）", "en": "⚡ Quick Start ({title})"},
    "quick_start_classic": {"zh": "⚡ 立即开始经典局（{count}人）", "en": "⚡ Quick Start Classic ({count} players)"},
    "classic_2_tag": {"zh": "⚡ 双人速战", "en": "⚡ 2-Player Fast"},
    "classic_3_tag": {"zh": "🎯 三人同行", "en": "🎯 3-Player Friends"},
    "party_4_tag": {"zh": "🔥 派对自选", "en": "🔥 Party Custom"}
}

en_json = load_json('src/locales/en.json')
zh_json = load_json('src/locales/zh-CN.json')

for key, val in translations.items():
    en_json[key] = val['en']
    zh_json[key] = val['zh']

save_json('src/locales/en.json', en_json)
save_json('src/locales/zh-CN.json', zh_json)
