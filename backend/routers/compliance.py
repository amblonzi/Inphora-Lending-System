from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas, auth
from tenant import get_tenant_db
from datetime import datetime, timezone

router = APIRouter(prefix="/compliance", tags=["compliance"])

@router.get("/checklist", response_model=List[schemas.ComplianceChecklist])
def get_compliance_checklist(
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Retrieves the DCP compliance checklist."""
    return db.query(models.ComplianceChecklist).all()

@router.patch("/checklist/{item_id}", response_model=schemas.ComplianceChecklist)
def update_compliance_item(
    item_id: int,
    status: str,
    notes: str = None,
    evidence_url: str = None,
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth.require_admin)
):
    """Updates a compliance requirement status."""
    item = db.query(models.ComplianceChecklist).filter(models.ComplianceChecklist.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Compliance item not found")
        
    item.status = status
    if notes:
        item.notes = notes
    if evidence_url:
        item.evidence_url = evidence_url
    
    db.commit()
    db.refresh(item)
    return item

@router.post("/seed")
def seed_compliance_checklist(
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth.require_admin)
):
    """Seeds the checklist with CBK Digital Credit Provider 2022 requirements."""
    # Check if already seeded
    if db.query(models.ComplianceChecklist).count() > 0:
        return {"message": "Checklist already seeded"}
        
    requirements = [
        {"category": "Licensing", "requirement": "Certificate of Incorporation / Registration"},
        {"category": "Licensing", "requirement": "Fit and Proper Test for Directors and Senior Management"},
        {"category": "Consumer Protection", "requirement": "Disclosure of APR (Effective Interest Rate) in all loan offers"},
        {"category": "Consumer Protection", "requirement": "Standardized Credit Agreement with all key terms disclosed"},
        {"category": "Data Privacy", "requirement": "Registration with the Office of the Data Protection Commissioner (ODPC)"},
        {"category": "Data Privacy", "requirement": "Data Protection Policy and Impact Assessment implemented"},
        {"category": "AML/CFT", "requirement": "AML/CFT Policy and risk assessment manual"},
        {"category": "Governance", "requirement": "Approved Credit Policy and Operations Manual"},
    ]
    
    for req in requirements:
        db_req = models.ComplianceChecklist(**req, status="non-compliant")
        db.add(db_req)
        
    db.commit()
    return {"message": "Compliance checklist seeded with 8 requirements"}
