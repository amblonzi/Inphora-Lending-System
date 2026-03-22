import sys
import os
from a2wsgi import ASGIMiddleware

# 1. SETUP PATHS
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)
sys.path.insert(0, os.path.dirname(BASE_DIR))

# 2. LOAD APP
try:
    from main import app
except ImportError:
    from backend.main import app

# 3. WSGI WRAPPER
application = ASGIMiddleware(app)
