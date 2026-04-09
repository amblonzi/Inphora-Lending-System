
import logging
logging.basicConfig(level=logging.WARNING)
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Client, Loan

try:
    db = SessionLocal()
    clients = db.query(Client).count()
    loans = db.query(Loan).count()
    print(f"Total clients (customers): {clients}")
    print(f"Total loans: {loans}")

    print("\nClients (first 5):")
    for c in db.query(Client).limit(5):
        print(f"- {c.id}: {c.first_name} {c.last_name}")

    print("\nLoans (first 5):")
    for l in db.query(Loan).limit(5):
        print(f"- {l.id}: Client {l.client_id}, Amount {l.amount}, Status {l.status}")
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
