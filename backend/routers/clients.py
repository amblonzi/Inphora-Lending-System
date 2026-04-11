from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import models, schemas, auth
from tenant import get_tenant_db
from pagination import paginate
from utils import log_activity, create_notification
from services import kyc_service

router = APIRouter(prefix="/clients", tags=["clients"])

@router.post("/", response_model=schemas.Client)
def create_client(
    client: schemas.ClientCreate,
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    # Check for duplicate phone or ID
    existing = db.query(models.Client).filter(
        (models.Client.phone == client.phone) | (models.Client.id_number == client.id_number)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Client with this phone or ID already exists")
    
    # Separate Next of Kin data
    client_data = client.dict(exclude={"next_of_kin"})
    nok_data = client.next_of_kin

    db_client = models.Client(**client_data, status='active')
    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    
    # Add Next of Kin if provided
    if nok_data:
        db_nok = models.NextOfKin(**nok_data.dict(), client_id=db_client.id)
        db.add(db_nok)
        db.commit()
    db.refresh(db_client)
    # Log activity
    log_activity(db, current_user.id, "create", "client", db_client.id, {"name": f"{db_client.first_name} {db_client.last_name}"})
    
    # Notify Admin
    create_notification(
        db, 
        current_user.id, 
        "New Client Registered", 
        f"Client {db_client.first_name} {db_client.last_name} has been successfully registered.", 
        "info"
    )

    # Notify Client via SMS
    try:
        from routers.sms import get_sms_service
        from services.sms_service import SmsService
        sms = get_sms_service(db)
        formatted_phone = SmsService.format_phone(db_client.phone)
        message = f"Hello {db_client.first_name}, welcome to Inphora! Your registration was successful. Your account ID is {db_client.id_number}."
        sms.send_sms(formatted_phone, message)
    except Exception as e:
        print(f"Failed to send registration SMS: {e}")

    return db_client

@router.get("/", response_model=schemas.PaginatedResponse[schemas.Client])
def list_clients(
    page: int = 1,
    size: int = 50,
    search: Optional[str] = None,
    branch_id: Optional[int] = None,
    customer_group_id: Optional[int] = None,
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    query = db.query(models.Client)
    
    if branch_id:
        query = query.filter(models.Client.branch_id == branch_id)
        
    if customer_group_id:
        query = query.filter(models.Client.customer_group_id == customer_group_id)
        
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (models.Client.first_name.like(search_pattern)) |
            (models.Client.last_name.like(search_pattern)) |
            (models.Client.phone.like(search_pattern)) |
            (models.Client.id_number.like(search_pattern))
        )
    
    return paginate(query, page, size, schemas.Client)

@router.get("/{client_id}", response_model=schemas.Client)
def get_client(
    client_id: int,
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client

@router.put("/{client_id}", response_model=schemas.ClientRead)
def update_client(
    client_id: int,
    client_update: schemas.ClientUpdate,
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    db_client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not db_client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Only apply non-None values (true partial update)
    update_data = client_update.model_dump(exclude_none=True, exclude={"next_of_kin"})
    for key, value in update_data.items():
        setattr(db_client, key, value)
    
    # Handle next_of_kin separately if provided
    if client_update.next_of_kin is not None:
        if db_client.next_of_kin:
            for key, value in client_update.next_of_kin.model_dump(exclude_none=True).items():
                setattr(db_client.next_of_kin, key, value)
        else:
            kin = models.NextOfKin(**client_update.next_of_kin.model_dump(exclude_none=True), client_id=client_id)
            db.add(kin)
    
    db.commit()
    db.refresh(db_client)
    # Log activity
    log_activity(db, current_user.id, "update", "client", db_client.id, {"name": f"{db_client.first_name} {db_client.last_name}"})
    return db_client

@router.delete("/{client_id}")
def delete_client(
    client_id: int,
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Guard: prevent delete if client has active/pending/approved loans
    active_loan = db.query(models.Loan).filter(
        models.Loan.client_id == client_id,
        models.Loan.status.in_(["pending", "approved", "active"])
    ).first()
    if active_loan:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete client with pending or active loans. Close or reject all loans first."
        )
    
    db.delete(client)
    db.commit()
    
    # Log activity
    log_activity(db, current_user.id, "delete", "client", client_id, {"name": f"{client.first_name} {client.last_name}"})
    
    return {"message": "Client deleted successfully"}

@router.post("/{client_id}/kyc-documents", response_model=schemas.ClientKYCDocument)
def add_kyc_document(
    client_id: int,
    document: schemas.ClientKYCDocumentCreate,
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    db_doc = models.ClientKYCDocument(**document.dict(), client_id=client_id)
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    
    log_activity(db, current_user.id, "upload_kyc", "client", client_id, {"type": document.document_type})
    return db_doc

@router.delete("/{client_id}/kyc-documents/{document_id}")
def delete_kyc_document(
    client_id: int,
    document_id: int,
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    doc = db.query(models.ClientKYCDocument).filter(
        models.ClientKYCDocument.id == document_id,
        models.ClientKYCDocument.client_id == client_id
    ).first()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    db.delete(doc)
    db.commit()
    
    
    log_activity(db, current_user.id, "delete_kyc", "client", client_id, {"document_id": document_id})
    return {"message": "Document deleted successfully"}

@router.post("/{client_id}/verify-id")
def verify_client_id(
    client_id: int,
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Triggers real-time National ID verification for a client."""
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
        
    result = kyc_service.verify_national_id(
        db, 
        client_id, 
        client.id_number, 
        f"{client.first_name} {client.last_name}",
        client.dob.isoformat() if client.dob else None
    )
    
    if not result["success"]:
        # We don't throw 400 here because the API call succeeded, but verification failed
        pass
        
    log_activity(db, current_user.id, "verify_id", "client", client_id, {"status": result["success"]})
    return result
