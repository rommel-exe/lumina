import os
import re

replacements = [
    # text
    (r'text-\[#6d675b\]', 'text-text-secondary'),
    (r'text-\[#5f584b\]', 'text-text-secondary'),
    (r'text-\[#6c4fae\]', 'text-text-secondary'),
    (r'text-\[#4b463b\]', 'text-text-primary'),
    (r'text-\[#8a826f\]', 'text-text-tertiary'),
    (r'text-\[#6f675a\]', 'text-text-secondary'),
    (r'text-\[#4f4a40\]', 'text-text-primary'),
    (r'text-\[#a04739\]', 'text-red-500'),
    
    # bg
    (r'bg-\[#faf5ea\]', 'bg-panel'),
    (r'bg-\[#f4effe\]', 'bg-panel'),
    (r'bg-\[#fbf8f1\]', 'bg-panel'),
    (r'bg-\[#fbf7ef\]', 'bg-panel'),
    (r'bg-zinc-950/60', 'bg-input'),
    
    # border
    (r'border-\[#ddd5c7\]', 'border-border-subtle'),
    (r'border-\[#ded5f2\]', 'border-border-subtle'),
    (r'border-\[#d9d1c2\]', 'border-border-subtle'),
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
