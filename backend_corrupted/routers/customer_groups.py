from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas, auth
from database import get_db

router = APIRouter(tags=["customer_groups"])

@router.get("/customer-groups/", response_model=List[schemas.CustomerGroup])
def list_customer_groups(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """List all customer groups"""
    groups = db.query(models.CustomerGroup).offset(skip).limit(limit).all()
    return groups

@router.post("/customer-groups/", response_model=schemas.CustomerGroup)
def create_customer_group(
    group: schemas.CustomerGroupCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Create a new customer group"""
    # Check if group with same name exists
    existing = db.query(models.CustomerGroup).filter(models.CustomerGroup.name == group.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Customer group with this name already exists")
    
    db_group = models.CustomerGroup(**group.dict())
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    return db_group

@router.get("/customer-groups/{group_id}", response_model=schemas.CustomerGroup)
def get_customer_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Get a specific customer group"""
    group = db.query(models.CustomerGroup).filter(models.CustomerGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Customer group not found")
    return group

@router.put("/customer-groups/{group_id}", response_model=schemas.CustomerGroup)
def update_customer_group(
    group_id: int,
    group: schemas.CustomerGroupCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Update a customer group"""
    db_group = db.query(models.CustomerGroup).filter(models.CustomerGroup.id == group_id).first()
    if not db_group:
        raise HTTPException(status_code=404, detail="Customer group not found")
    
    # Check if new name conflicts with another group
    if group.name != db_group.name:
        existing = db.query(models.CustomerGroup).filter(models.CustomerGroup.name == group.name).first()
        if existing:
            raise HTTPException(status_code=400, detail="Customer group with this name already exists")
    
    for key, value in group.dict().items():
        setattr(db_group, key, value)
    
    db.commit()
    db.refresh(db_group)
    return db_group

@router.delete("/customer-groups/{group_id}")
def delete_customer_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Delete a customer group"""
    db_group = db.query(models.CustomerGroup).filter(models.CustomerGroup.id == group_id).first()
    if not db_group:
        raise HTTPException(status_code=404, detail="Customer group not found")
    
    # Check if group has clients
    client_count = db.query(models.Client).filter(models.Client.customer_group_id == group_id).count()
    if client_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete customer group with {client_count} associated clients"
        )
    
    db.delete(db_group)
    db.commit()
    return {"message": "Customer group deleted successfully"}
