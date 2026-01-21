import os
import re

def aggressive_fix(directory):
    # This pattern matches 'from ..' or 'from .' followed by any module path
    # and removes the leading dots.
    
    # Matches: 'from ..anything import' -> 'from anything import'
    # Matches: 'from .anything import' -> 'from anything import'
    # Matches: 'from .. import' -> 'import'
    
    # 1. Handle 'from ..module import'
    pattern_multi_dot_module = re.compile(r'^(\s*)from \.\.+([\w\.]+) import (.*)$', re.MULTILINE)
    
    # 2. Handle 'from .module import'
    pattern_single_dot_module = re.compile(r'^(\s*)from \.([\w\.]+) import (.*)$', re.MULTILINE)
    
    # 3. Handle 'from .. import'
    pattern_multi_dot_direct = re.compile(r'^(\s*)from \.\.+ import (.*)$', re.MULTILINE)
    
    # 4. Handle 'from . import'
    pattern_single_dot_direct = re.compile(r'^(\s*)from \. import (.*)$', re.MULTILINE)

    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(".py"):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                new_content = content
                
                new_content = pattern_multi_dot_module.sub(r'\1from \2 import \3', new_content)
                new_content = pattern_single_dot_module.sub(r'\1from \2 import \3', new_content)
                new_content = pattern_multi_dot_direct.sub(r'\1import \2', new_content)
                new_content = pattern_single_dot_direct.sub(r'\1import \2', new_content)
                
                if content != new_content:
                    print(f"Aggressively fixed {path}")
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(new_content)

if __name__ == "__main__":
    aggressive_fix("backend")
