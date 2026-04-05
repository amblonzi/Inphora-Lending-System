from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas, auth
from database import get_db
from tenant import get_tenant_db
from datetime import datetime, timezone

router = APIRouter(prefix="/chama", tags=["chama"])

@router.post("/groups", response_model=schemas.ChamaGroup)
def create_chama_group(
    group: schemas.ChamaGroupCreate,
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Creates a new Chama group."""
    db_group = models.ChamaGroup(**group.dict())
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    return db_group

@router.get("/groups", response_model=List[schemas.ChamaGroup])
def list_chama_groups(
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Lists all Chama groups."""
    return db.query(models.ChamaGroup).all()

@router.post("/groups/{group_id}/members", response_model=schemas.ChamaMember)
def add_chama_member(
    group_id: int,
    client_id: int,
    role: str = "member",
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Adds a client to a Chama group."""
    # Check if client already in group
    existing = db.query(models.ChamaMember).filter(
        models.ChamaMember.group_id == group_id,
        models.ChamaMember.client_id == client_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Client already a member of this group")
        
    db_member = models.ChamaMember(
        group_id=group_id,
        client_id=client_id,
        role=role
    )
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    return db_member

@router.get("/groups/{group_id}/members", response_model=List[schemas.ChamaMember])
def get_chama_members(
    group_id: int,
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Fetches all members of a Chama group."""
    return db.query(models.ChamaMember).filter(models.ChamaMember.group_id == group_id).all()
