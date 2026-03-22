import os
import re

def fix_imports(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(".py"):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Replace 'from .. import models, schemas, auth' -> 'import models, schemas, auth'
                new_content = re.sub(r'from \.\. import (models, schemas, auth)', r'import \1', content)
                
                # Replace 'from ..database import get_db' -> 'from database import get_db'
                new_content = re.sub(r'from \.\.database import get_db', r'from database import get_db', new_content)

                # Replace 'from ..utils import' -> 'from utils import'
                new_content = re.sub(r'from \.\.utils import', r'from utils import', new_content)
                
                if content != new_content:
                    print(f"Fixed imports in {path}")
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(new_content)

if __name__ == "__main__":
    fix_imports("backend/routers")
