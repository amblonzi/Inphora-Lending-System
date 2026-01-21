from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import models, schemas, auth
from database import get_db
from utils import log_activity, create_notification

router = APIRouter(prefix="/clients", tags=["clients"])

@router.post("/", response_model=schemas.Client)
def create_client(
    client: schemas.ClientCreate,
    db: Session = Depends(get_db),
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

    db_client = models.Client(**client_data, status='active', joined_at=datetime.utcnow())
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
    return db_client

@router.get("/", response_model=List[schemas.Client])
def list_clients(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    branch_id: Optional[int] = None,
    customer_group_id: Optional[int] = None,
    db: Session = Depends(get_db),
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
    return query.offset(skip).limit(limit).all()

@router.get("/{client_id}", response_model=schemas.Client)
def get_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client

@router.put("/{client_id}", response_model=schemas.Client)
def update_client(
    client_id: int,
    client_update: schemas.ClientCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    db_client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not db_client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Separate nested data
    update_data = client_update.dict(exclude={"next_of_kin"})
    nok_data = client_update.next_of_kin
    
    # Update Client fields
    for key, value in update_data.items():
        setattr(db_client, key, value)
    
    # Update Next of Kin
    if nok_data:
        # Check if existing NOK
        existing_nok = db.query(models.NextOfKin).filter(models.NextOfKin.client_id == client_id).first()
        if existing_nok:
            for key, value in nok_data.dict().items():
                setattr(existing_nok, key, value)
        else:
            new_nok = models.NextOfKin(**nok_data.dict(), client_id=client_id)
            db.add(new_nok)
    
    db.commit()
    db.refresh(db_client)
    # Log activity
    log_activity(db, current_user.id, "update", "client", db_client.id, {"name": f"{db_client.first_name} {db_client.last_name}"})
    return db_client

@router.delete("/{client_id}")
def delete_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin)
):
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    db.delete(client)
    db.commit()
    
    # Log activity
    log_activity(db, current_user.id, "delete", "client", client_id, {"name": f"{client.first_name} {client.last_name}"})
    
    return {"message": "Client deleted successfully"}

@router.post("/{client_id}/kyc-documents", response_model=schemas.ClientKYCDocument)
def add_kyc_document(
    client_id: int,
    document: schemas.ClientKYCDocumentCreate,
    db: Session = Depends(get_db),
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
    db: Session = Depends(get_db),
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
