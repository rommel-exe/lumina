import os
import re

replacements = [
    # text colors
    (r'text-\[color:var\(--text\)\]', 'text-text-primary'),
    (r'text-\[color:var\(--text-soft\)\]', 'text-text-secondary'),
    (r'text-\[color:var\(--text-faint\)\]', 'text-text-tertiary'),
    (r'text-\[color:var\(--accent\)\]', 'text-accent'),
    (r'text-\[#2f2d28\]', 'text-text-primary'),

    # bg colors
    (r'bg-\[color:var\(--accent\)\]', 'bg-accent'),
    (r'bg-\[color:var\(--accent-soft\)\]', 'bg-accent-soft'),
    (r'bg-\[color:var\(--line\)\]', 'bg-border-subtle'),
    (r'bg-\[color:var\(--success\)\]', 'bg-green-500'),
    (r'bg-\[color:var\(--bg\)\]', 'bg-window'),
    (r'bg-\[#fffaf1\]', 'bg-input'),
    (r'bg-\[#f5f0e4\]', 'bg-panel'),
    (r'bg-\[#fffdf8\]', 'bg-window'),
    (r'bg-white', 'bg-window'),
    
    (r'focus:bg-white', 'focus:bg-window'),

    # borders
    (r'border-\[color:var\(--line\)\]', 'border-border-subtle'),
    (r'border-\[color:var\(--line-strong\)\]', 'border-border-strong'),
    (r'border-\[color:var\(--accent\)\]', 'border-accent'),
    (r'border-\[color:var\(--accent-soft\)\]', 'border-accent-soft'),
    (r'border-\[color:var\(--success\)\]', 'border-green-500'),
    (r'border-\[#d9d2c3\]', 'border-border-subtle'),
    (r'border-\[#d7cfbf\]', 'border-border-subtle'),
    (r'focus:border-\[#c7d3ef\]', 'focus:border-border-strong'),
    (r'hover:border-\[color:var\(--accent\)\]', 'hover:border-accent'),
    
    # ring
    (r'ring-\[color:var\(--accent\)\]', 'ring-accent'),
    (r'ring-\[color:var\(--line\)\]', 'ring-border-subtle'),

    # gradients
    (r'from-blue-500/5', 'from-accent-soft'),
    (r'from-purple-500/5', 'from-accent-soft'),
    (r'from-amber-500/5', 'from-accent-soft'),
    
    # drop bg-white/* and bg-black/*
    (r'bg-white/100', 'bg-window'),
    (r'bg-white/60', 'bg-panel'),
    (r'bg-white/50', 'bg-panel'),
    (r'bg-white/45', 'bg-window'),
    (r'bg-white/55', 'bg-window'),
    (r'bg-white/10', 'bg-input'),
    (r'hover:bg-white/60', 'hover:bg-window'),
    (r'hover:bg-white/45', 'hover:bg-window'),
    (r'hover:bg-white/55', 'hover:bg-window'),
    (r'hover:bg-white', 'hover:bg-window'),
    
    (r'bg-black/5', 'bg-window'),
    (r'bg-black/20', 'bg-input'),
    (r'bg-black/70', 'bg-window/80'),
    (r'hover:bg-black/5', 'hover:bg-window'),
    (r'border-black/20', 'border-border-subtle'),
    (r'border-white/10', 'border-border-subtle'),
    (r'border-white/15', 'border-border-subtle'),
    (r'bg-zinc-900/65', 'bg-panel'),
]

for root, dirs, files in os.walk('src/features'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r') as f:
                content = f.read()
            
            new_content = content
            # apply replacements
            for old, new in replacements:
                new_content = re.sub(old, new, new_content)
                
            if new_content != content:
                with open(filepath, 'w') as f:
                    f.write(new_content)
                print(f"Updated {filepath}")
