"""
models.py — FIXED
- Proper column types for financial data (DECIMAL, not FLOAT)
- Indexes on frequently queried columns
- Soft-delete pattern
- Relationship definitions
"""

from datetime import datetime
from sqlalchemy import (
    Boolean, Column, Date, DateTime, ForeignKey,
    Integer, Numeric, String, Text, Index
)
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    username        = Column(String(50), unique=True, nullable=False, index=True)
    full_name       = Column(String(100), nullable=False)
    email           = Column(String(100), unique=True, nullable=True)
    hashed_password = Column(String(255), nullable=False)   # bcrypt hash
    role            = Column(String(20), nullable=False, default="officer")  # admin|manager|officer|cashier
    is_active       = Column(Boolean, default=True, nullable=False)
    created_at      = Column(DateTime, default=datetime.utcnow)
    last_login_at   = Column(DateTime, nullable=True)


class Borrower(Base):
    __tablename__ = "borrowers"

    id              = Column(Integer, primary_key=True, index=True)
    full_name       = Column(String(150), nullable=False)
    national_id     = Column(String(50),  nullable=False)
    phone           = Column(String(30),  nullable=False)
    email           = Column(String(100), nullable=True)
    address         = Column(Text, nullable=True)
    date_of_birth   = Column(Date, nullable=True)
    employer        = Column(String(150), nullable=True)
    # FIXED: DECIMAL not FLOAT for financial figures
    monthly_income  = Column(Numeric(12, 2), nullable=True)
    is_active       = Column(Boolean, default=True, nullable=False)
    created_at      = Column(DateTime, default=datetime.utcnow)

    loans = relationship("Loan", back_populates="borrower")

    __table_args__ = (
        Index("ix_borrower_national_id", "national_id"),
        Index("ix_borrower_phone",       "phone"),
    )


class Loan(Base):
    __tablename__ = "loans"

    id                = Column(Integer, primary_key=True, index=True)
    borrower_id       = Column(Integer, ForeignKey("borrowers.id"), nullable=False, index=True)
    # FIXED: DECIMAL for all monetary values — FLOAT causes rounding errors in financial calcs
    amount            = Column(Numeric(12, 2), nullable=False)
    interest_rate     = Column(Numeric(5, 2),  nullable=False)
    term_months       = Column(Integer, nullable=False)
    loan_type         = Column(String(50), nullable=False)
    purpose           = Column(Text, nullable=True)
    status            = Column(String(20), nullable=False, default="pending", index=True)
    disbursement_date = Column(Date, nullable=True)
    notes             = Column(Text, nullable=True)
    is_deleted        = Column(Boolean, default=False, nullable=False)
    created_at        = Column(Date, default=datetime.utcnow)
    created_by        = Column(Integer, ForeignKey("users.id"), nullable=True)

    borrower = relationship("Borrower", back_populates="loans")
    payments = relationship("Payment", back_populates="loan")

    __table_args__ = (
        Index("ix_loan_status",      "status"),
        Index("ix_loan_borrower",    "borrower_id"),
        Index("ix_loan_not_deleted", "is_deleted"),
    )


class Payment(Base):
    __tablename__ = "payments"

    id               = Column(Integer, primary_key=True, index=True)
    loan_id          = Column(Integer, ForeignKey("loans.id"), nullable=False, index=True)
    amount           = Column(Numeric(12, 2), nullable=False)
    payment_date     = Column(Date, nullable=False, index=True)
    payment_method   = Column(String(50), nullable=False)
    reference        = Column(String(100), nullable=True)
    idempotency_key  = Column(String(100), nullable=True, unique=True)  # Prevent double-recording
    receipt_number   = Column(String(50), nullable=True, unique=True)
    status           = Column(String(20), nullable=False, default="confirmed")  # confirmed|reversed
    reversal_reason  = Column(Text, nullable=True)
    recorded_by      = Column(Integer, ForeignKey("users.id"), nullable=True)
    reversed_by      = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at       = Column(DateTime, default=datetime.utcnow)

    loan = relationship("Loan", back_populates="payments")

    __table_args__ = (
        Index("ix_payment_loan_date", "loan_id", "payment_date"),
        Index("ix_payment_idempotency", "idempotency_key"),
    )
