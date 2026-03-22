import sys
import os
sys.path.append(os.getcwd())

from database import engine, Base
import models

def init_db():
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully.")

if __name__ == "__main__":
    init_db()
