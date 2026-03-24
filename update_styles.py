import os
import re

replacements = [
    (r'text-\[color:var\(--text\)\]', 'text-text-primary'),
    (r'text-\[color:var\(--text-soft\)\]', 'text-text-secondary'),
    (r'text-\[color:var\(--text-faint\)\]', 'text-text-tertiary'),
    (r'text-\[color:var\(--accent\)\]', 'text-accent'),
    
    (r'bg-\[color:var\(--accent\)\]', 'bg-accent'),
    (r'bg-\[color:var\(--accent-soft\)\]', 'bg-accent-soft'),
    
    (r'border-\[color:var\(--line\)\]', 'border-border-subtle'),
    (r'border-\[color:var\(--line-strong\)\]', 'border-border-strong'),

    (r'bg-\[#fffdf8\]', 'bg-window'),
    (r'border-\[#d9d2c3\]', 'border-border-subtle'),
    
    (r'hover:bg-white/45', 'hover:bg-window'),
    (r'hover:bg-white/60', 'hover:bg-window'),
    (r'hover:bg-white/55', 'hover:bg-window'),
    (r'hover:bg-white', 'hover:bg-window'),
    (r'hover:bg-black/5', 'hover:bg-window'),
    
    (r'bg-white/50', 'bg-panel'),
    (r'bg-white/60', 'bg-panel'),
    (r'bg-white/10', 'bg-input'),
    (r'border-white/10', 'border-border-subtle'),
    (r'border-white/15', 'border-border-subtle'),
    
    (r'bg-zinc-900/65', 'bg-panel'),
    (r'bg-black/20', 'bg-input'),
    (r'bg-black/70', 'bg-window/80'),
    (r'border-black/20', 'border-border-subtle'),
]

for root, dirs, files in os.walk('src/features'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r') as f:
                content = f.read()
            
            new_content = content
            for old, new in replacements:
                new_content = re.sub(old, new, new_content)
                
            if new_content != content:
                with open(filepath, 'w') as f:
                    f.write(new_content)
                print(f"Updated {filepath}")
