from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import models, schemas, auth
from database import get_db

router = APIRouter(prefix="/expenses", tags=["expenses"])

@router.post("/categories/", response_model=schemas.ExpenseCategory)
def create_expense_category(
    category: schemas.ExpenseCategoryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    db_category = models.ExpenseCategory(**category.dict())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

@router.get("/categories/", response_model=List[schemas.ExpenseCategory])
def list_expense_categories(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    return db.query(models.ExpenseCategory).filter(models.ExpenseCategory.is_active == True).all()

@router.post("/", response_model=schemas.Expense)
def create_expense(
    expense: schemas.ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    # Determine category name fallback if ID provided
    cat_name = expense.category
    if expense.category_id:
        cat = db.query(models.ExpenseCategory).filter(models.ExpenseCategory.id == expense.category_id).first()
        if cat:
            cat_name = cat.name
            
    # Calculate next due date if recurring
    next_due = None
    if expense.is_recurring and expense.recurrence_interval:
        from datetime import timedelta
        if expense.recurrence_interval == 'daily':
            next_due = expense.date + timedelta(days=1)
        elif expense.recurrence_interval == 'weekly':
            next_due = expense.date + timedelta(weeks=1)
        elif expense.recurrence_interval == 'monthly':
            # Simple 30 day add for now, improved calendar logic can be added later
            next_due = expense.date + timedelta(days=30)
            
    db_expense = models.Expense(
        **expense.dict(),
        category=cat_name, # Sync string field
        next_due_date=next_due
    )
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense

@router.get("/", response_model=List[schemas.Expense])
def list_expenses(
    category_id: Optional[int] = None,
    is_recurring: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    query = db.query(models.Expense)
    if category_id:
        query = query.filter(models.Expense.category_id == category_id)
    if is_recurring is not None:
        query = query.filter(models.Expense.is_recurring == is_recurring)
        
    return query.order_by(models.Expense.date.desc()).all()

@router.delete("/{expense_id}")
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    db.delete(expense)
    db.commit()
    return {"message": "Expense deleted"}
