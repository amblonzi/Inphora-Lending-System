from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas, auth
from database import get_db

router = APIRouter(prefix="/loan-products", tags=["loan_products"])

@router.post("/", response_model=schemas.LoanProduct)
def create_loan_product(
    product: schemas.LoanProductCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin)
):
    db_product = models.LoanProduct(**product.dict())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@router.get("/", response_model=List[schemas.LoanProduct])
def list_loan_products(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    return db.query(models.LoanProduct).all()

@router.get("/{product_id}", response_model=schemas.LoanProduct)
def get_loan_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    product = db.query(models.LoanProduct).filter(models.LoanProduct.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Loan product not found")
    return product

@router.put("/{product_id}", response_model=schemas.LoanProduct)
def update_loan_product(
    product_id: int,
    product_update: schemas.LoanProductCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin)
):
    db_product = db.query(models.LoanProduct).filter(models.LoanProduct.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Loan product not found")
    
    for key, value in product_update.dict().items():
        setattr(db_product, key, value)
    
    db.commit()
    db.refresh(db_product)
    return db_product

@router.delete("/{product_id}")
def delete_loan_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin)
):
    product = db.query(models.LoanProduct).filter(models.LoanProduct.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Loan product not found")
    
    db.delete(product)
    db.commit()
    return {"message": "Loan product deleted successfully"}
