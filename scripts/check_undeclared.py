import re

def check_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Get props defined
    props_match = re.search(r'defineProps<\{([^}]+)\}>', content)
    if not props_match:
        print(f"No props found in {filepath}")
        return
    props_str = props_match.group(1)
    defined_props = set(re.findall(r'([a-zA-Z0-9_]+)\s*:', props_str))

    # Get variables used in template
    template_match = re.search(r'<template>(.*)</template>', content, re.DOTALL)
    if not template_match:
        print(f"No template found in {filepath}")
        return
    template = template_match.group(1)

    # find bindings
    bindings = re.findall(r'[:@v-]?[\w-]+="([^"]+)"', template)
    texts = re.findall(r'\{\{([^}]+)\}\}', template)

    used_vars = set()
    for expr in bindings + texts:
        # Find all words that start with a letter and aren't keywords
        words = re.findall(r'\b[a-zA-Z_]\w*\b', expr)
        if words:
            # only first word matters for object dot notation (e.g. obj.value)
            w = words[0]
            if w not in ['true', 'false', 'null', 'undefined', 'emit', 'event', 'console', 'Math', 'Number', 'String']:
                used_vars.add(w)
    
    print(f"Undeclared in {filepath}:")
    for var in sorted(list(used_vars)):
        if var not in defined_props:
            print(f"  {var}")

check_file('/home/atang/flying-chess/src/views/GameView.vue')
