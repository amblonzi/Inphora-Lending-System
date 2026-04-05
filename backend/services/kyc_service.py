from sqlalchemy.orm import Session
import models
from datetime import datetime, timezone
import json
import random

def verify_national_id(db: Session, client_id: int, id_number: str, full_name: str, dob: str = None):
    """
    Mocks a real-time National ID verification with IPRS/NIIMS.
    In production, this would call a 3rd party API like Metropol or Smile ID.
    
    :param db: Database session
    :param client_id: ID of the client to verify
    :param id_number: National ID number
    :param full_name: Expected full name
    :param dob: Date of birth (optional)
    :return: dict with verification status
    """
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        return {"status": "error", "message": "Client not found"}

    # Mocking the verification logic
    # In a real scenario, we'd send a request to a gateway
    
    # 1. Simulate API Latency
    # time.sleep(1) 
    
    # 2. Logic: Let's say IDs starting with '99' fail for testing purposes
    if id_number.startswith("99"):
        success = False
        message = "ID Number not found in national registry"
    else:
        success = True
        message = "Verified successfully via IPRS"

    # Update client record
    client.is_id_verified = success
    client.id_verification_date = datetime.now(timezone.utc)
    
    metadata = {
        "provider": "Mock-IPRS-Gateway",
        "raw_response": {
            "success": success,
            "message": message,
            "match_score": 100 if success else 0,
            "registry_name": full_name.upper() if success else None,
            "verification_id": f"VRF-{random.randint(100000, 999999)}"
        }
    }
    client.id_verification_metadata = json.dumps(metadata)
    
    db.commit()
    
    return {
        "success": success,
        "message": message,
        "details": metadata["raw_response"]
    }
