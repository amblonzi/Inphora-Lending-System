
import logging
import json
from datetime import date, datetime
logging.basicConfig(level=logging.WARNING)
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Client, Loan

def default_serializer(o):
    if isinstance(o, (date, datetime)): return o.isoformat()
    return str(o)

try:
    db = SessionLocal()
    
    print("\nLOAN SCHEMA:")
    loan_keys = Loan.__table__.columns.keys()
    print(", ".join(loan_keys))

    print("\nFirst 2 Loans:")
    for l in db.query(Loan).limit(2):
        d = {k: getattr(l, k) for k in loan_keys}
        print(json.dumps(d, default=default_serializer, indent=2))
        
    print("\nCLIENT SCHEMA:")
    client_keys = Client.__table__.columns.keys()
    print(", ".join(client_keys))

    print("\nFirst 2 Clients:")
    for c in db.query(Client).limit(2):
        d = {k: getattr(c, k) for k in client_keys}
        print(json.dumps(d, default=default_serializer, indent=2))
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
