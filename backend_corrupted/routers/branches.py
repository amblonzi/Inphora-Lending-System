from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas, auth
from database import get_db

router = APIRouter(tags=["branches"])

@router.get("/branches/", response_model=List[schemas.Branch])
def list_branches(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """List all branches"""
    branches = db.query(models.Branch).offset(skip).limit(limit).all()
    return branches

@router.post("/branches/", response_model=schemas.Branch)
def create_branch(
    branch: schemas.BranchCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Create a new branch"""
    # Check if branch with same name exists
    existing = db.query(models.Branch).filter(models.Branch.name == branch.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Branch with this name already exists")
    
    db_branch = models.Branch(**branch.dict())
    db.add(db_branch)
    db.commit()
    db.refresh(db_branch)
    return db_branch

@router.get("/branches/{branch_id}", response_model=schemas.Branch)
def get_branch(
    branch_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Get a specific branch"""
    branch = db.query(models.Branch).filter(models.Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    return branch

@router.put("/branches/{branch_id}", response_model=schemas.Branch)
def update_branch(
    branch_id: int,
    branch: schemas.BranchCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Update a branch"""
    db_branch = db.query(models.Branch).filter(models.Branch.id == branch_id).first()
    if not db_branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    # Check if new name conflicts with another branch
    if branch.name != db_branch.name:
        existing = db.query(models.Branch).filter(models.Branch.name == branch.name).first()
        if existing:
            raise HTTPException(status_code=400, detail="Branch with this name already exists")
    
    for key, value in branch.dict().items():
        setattr(db_branch, key, value)
    
    db.commit()
    db.refresh(db_branch)
    return db_branch

@router.delete("/branches/{branch_id}")
def delete_branch(
    branch_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Delete a branch"""
    db_branch = db.query(models.Branch).filter(models.Branch.id == branch_id).first()
    if not db_branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    # Check if branch has clients
    client_count = db.query(models.Client).filter(models.Client.branch_id == branch_id).count()
    if client_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete branch with {client_count} associated clients"
        )
    
    db.delete(db_branch)
    db.commit()
    return {"message": "Branch deleted successfully"}
