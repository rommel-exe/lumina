import os
import re

replacements = [
    # TasksView specific hexes
    (r'text-\[#8b836f\]', 'text-text-secondary'),
    (r'text-\[#7b92ca\]', 'text-accent'),
    (r'text-\[#857d6d\]', 'text-text-tertiary'),
    (r'text-\[#736c5e\]', 'text-text-secondary'),
    (r'text-\[#5a7c65\]', 'text-text-secondary'),
    (r'text-\[#c65b4d\]', 'text-red-500'),
    (r'text-\[#b64636\]', 'text-red-500'),
    
    (r'border-\[#e2dacb\]', 'border-border-subtle'),
    (r'border-\[#c7d3ef\]', 'border-accent'),
    (r'border-\[#d8d2c7\]', 'border-border-subtle'),
    (r'border-\[#b9d1c0\]', 'border-border-strong'),
    (r'border-\[#f2c4bb\]', 'border-border-strong'),
    
    (r'bg-\[#fde9e6\]', 'bg-panel'),
    (r'bg-window/80', 'bg-window'),
    (r'bg-window/35', 'bg-window'),
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
