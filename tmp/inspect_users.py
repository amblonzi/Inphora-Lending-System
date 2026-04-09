
import logging
import json
logging.basicConfig(level=logging.WARNING)
from sqlalchemy.orm import Session
from database import SessionLocal
from models import User

try:
    db = SessionLocal()
    users = db.query(User).all()
    print("USERS:")
    for u in users:
        print(f"ID {u.id}: {u.full_name} ({u.email}) - {u.role}")

except Exception as e:
    pass
finally:
    db.close()
