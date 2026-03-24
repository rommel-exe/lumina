import os
import re

replacements = [
    # TasksView specific overrides
    (r'bg-\[#faf4e8\]', 'bg-panel'),
    (r'text-\[#5e584c\]', 'text-text-secondary'),
    (r'hover:border-\[#c7d3ef\]', 'hover:border-border-strong'),
    
    (r'bg-\[#efe8d7\] text-\[#6f624e\] border-\[#ddd1b9\]', 'bg-panel text-text-secondary border-border-subtle'),
    (r'bg-\[#f9f2e4\]', 'bg-window'),
    
    (r'bg-\[#e6eefc\] text-\[#2f58ba\] border-\[#c7d3ef\]', 'bg-panel text-text-secondary border-border-subtle'),
    (r'bg-\[#eff4ff\]', 'bg-window'),
    
    (r'bg-\[#dff2ea\] text-\[#1b7a57\] border-\[#bbddcf\]', 'bg-panel text-text-secondary border-border-subtle'),
    (r'bg-\[#edf8f3\]', 'bg-window'),
    
    (r'bg-\[#f6eadf\] text-\[#9a5a12\] border-\[#ead1b8\]', 'bg-panel text-text-secondary border-border-subtle'),
    (r'bg-\[#fdf5ea\]', 'bg-window'),
    
    (r'bg-\[#ede7fa\] text-\[#6a4bb0\] border-\[#d7caef\]', 'bg-panel text-text-secondary border-border-subtle'),
    (r'bg-\[#f6f1ff\]', 'bg-window'),

    (r'bg-\[#e8eee7\] text-\[#4a6250\] border-\[#d4dfd2\]', 'bg-panel text-text-secondary border-border-subtle'),
    (r'bg-\[#f5f8f4\]', 'bg-window'),

    (r'bg-\[#eceae5\] text-\[#6d675b\] border-\[#dcd7ce\]', 'bg-panel text-text-secondary border-border-subtle'),
    (r'bg-\[#f7f4ef\]', 'bg-window'),

    (r'bg-\[#fde9e6\] text-\[#b64636\] border-\[#f2c4bb\]', 'bg-panel text-text-secondary border-border-subtle'),
    (r'bg-\[#f8efdf\] text-\[#966120\] border-\[#e9d0aa\]', 'bg-panel text-text-secondary border-border-subtle'),
    (r'bg-\[#e7f0fd\] text-\[#2c61ba\] border-\[#c4d7f4\]', 'bg-panel text-text-secondary border-border-subtle'),

    # NotesView and NoteBlock rgbas
    (r'bg-\[rgba\(255,255,255,0\.24\)\]', 'bg-panel'),
    (r'bg-\[rgba\(255,255,255,0\.16\)\]', 'bg-input'),
    (r'bg-\[rgba\(255,255,255,0\.14\)\]', 'bg-input'),
    (r'bg-\[rgba\(255,255,255,0\.18\)\]', 'bg-panel'),
    (r'rgba\(255,255,255,0\.08\)', 'var(--bg-input, transparent)'),
    (r'shadow-\[inset_0_1px_0_rgba\(255,255,255,0\.68\)\]', 'shadow-sm'),
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
