from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, Date, Text
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True)
    hashed_password = Column(String(255))
    full_name = Column(String(255))
    role = Column(String(50), default="user") # admin, loan_officer
    permissions = Column(Text, nullable=True) # Comma-separated or JSON
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    
    # 2FA Fields
    phone = Column(String(20), nullable=True)
    two_factor_enabled = Column(Boolean, default=False)
    otp_code = Column(String(10), nullable=True)
    otp_expires_at = Column(DateTime, nullable=True)

class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100))
    last_name = Column(String(100))
    email = Column(String(255), unique=True, index=True, nullable=True)
    phone = Column(String(20), unique=True, index=True)
    id_number = Column(String(50), unique=True)
    address = Column(Text)
    
    # KYC
    dob = Column(Date, nullable=True)
    gender = Column(String(20), nullable=True)
    marital_status = Column(String(50), nullable=True)
    document_url = Column(String(500), nullable=True)  # KYC document path
    
    # Location
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    town = Column(String(100), nullable=True)
    estate = Column(String(100), nullable=True)
    house_number = Column(String(50), nullable=True)
    
    # Meta
    customer_group_id = Column(Integer, ForeignKey("customer_groups.id"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(50), default="active")  # active, inactive, suspended
    
    created_at = Column(DateTime, default=datetime.utcnow)
    joined_at = Column(DateTime, default=datetime.utcnow)
    
    next_of_kin = relationship("NextOfKin", back_populates="client")
    
    # Payment details
    mpesa_phone = Column(String(20), nullable=True)
    bank_name = Column(String(100), nullable=True)
    bank_account_number = Column(String(50), nullable=True)
    bank_account_name = Column(String(255), nullable=True)
    preferred_disbursement = Column(String(20), default="mpesa")
    
    savings_accounts = relationship("SavingsAccount", back_populates="client")
    loans = relationship("Loan", back_populates="client")
    kyc_documents = relationship("ClientKYCDocument", back_populates="client")

class ClientKYCDocument(Base):
    __tablename__ = "client_kyc_documents"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"))
    document_type = Column(String(100), nullable=True) # e.g., "ID Front", "ID Back", "Passport"
    document_url = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="kyc_documents")

class LoanProduct(Base):
    __tablename__ = "loan_products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    interest_rate = Column(Float) # Percentage
    min_amount = Column(Float)
    max_amount = Column(Float)
    min_period_months = Column(Integer)
    max_period_months = Column(Integer)
    description = Column(Text, nullable=True)
    
    # Fees & Penalties
    interest_rate_7_days_plus = Column(Float, default=0.0) # Penalty rate
    grace_period_days = Column(Integer, default=0)
    
    insurance_fee = Column(Float, default=0.0)
    tracking_fee = Column(Float, default=0.0)
    valuation_fee = Column(Float, default=0.0)
    processing_fee_percent = Column(Float, default=0.0)
    crb_fee = Column(Float, default=0.0)
    
    # New Fields
    processing_fee_fixed = Column(Float, default=0.0)
    registration_fee = Column(Float, default=0.0)
    duration_unit = Column(String(20), default="months") # months, weeks, days
    
    # Limits
    first_cycle_limit = Column(Float, nullable=True)

class Loan(Base):
    __tablename__ = "loans"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"))
    product_id = Column(Integer, ForeignKey("loan_products.id"))
    amount = Column(Float)
    interest_rate = Column(Float) # Snapshot at time of loan
    duration_months = Column(Integer)
    start_date = Column(Date)
    end_date = Column(Date)
    
    repayment_frequency = Column(String(20), default="monthly") # daily, weekly, monthly
    
    # Snapshot of fees at creation time
    insurance_fee = Column(Float, default=0.0)
    processing_fee = Column(Float, default=0.0)
    valuation_fee = Column(Float, default=0.0)
    registration_fee = Column(Float, default=0.0)
    is_processing_fee_waived = Column(Boolean, default=False)
    
    duration_unit = Column(String(20), default="months")
    
    status = Column(String(50), default="pending") # pending, approved, active, completed, defaulted, rejected
    
    # Multi-level Approval
    current_approval_level = Column(Integer, default=1) # 1: Officer Review, 2: Manager Review, 3: Final
    
    # Approval tracking (Legacy fields, keeping for now or replacing)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    rejected_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    
    client = relationship("Client", back_populates="loans")
    product = relationship("LoanProduct")
    repayments = relationship("Repayment", back_populates="loan")
    
    # New Relationships
    approvals = relationship("LoanApproval", back_populates="loan")
    guarantors = relationship("LoanGuarantor", back_populates="loan")
    collateral = relationship("LoanCollateral", back_populates="loan")
    referees = relationship("LoanReferee", back_populates="loan")
    financial_analysis = relationship("LoanFinancialAnalysis", uselist=False, back_populates="loan")

class LoanApproval(Base):
    __tablename__ = "loan_approvals"

    id = Column(Integer, primary_key=True, index=True)
    loan_id = Column(Integer, ForeignKey("loans.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    level = Column(Integer) # 1, 2, 3...
    status = Column(String(50)) # approved, rejected
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    loan = relationship("Loan", back_populates="approvals")
    user = relationship("User")

class Repayment(Base):
    __tablename__ = "repayments"

    id = Column(Integer, primary_key=True, index=True)
    loan_id = Column(Integer, ForeignKey("loans.id"))
    amount = Column(Float)
    payment_date = Column(Date)
    notes = Column(Text, nullable=True)
    
    # M-Pesa specific
    mpesa_transaction_id = Column(String(100), nullable=True, unique=True)
    payment_method = Column(String(20), default="manual") # manual, mpesa, cash

    loan = relationship("Loan", back_populates="repayments")

class MpesaIncomingTransaction(Base):
    __tablename__ = "mpesa_incoming_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(String(100), unique=True, index=True)
    amount = Column(Float)
    phone = Column(String(20))
    bill_ref = Column(String(100))
    raw_callback_data = Column(Text) # JSON string
    status = Column(String(20), default="unmatched") # unmatched, matched, invalid
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Link to client/loan if matched
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    loan_id = Column(Integer, ForeignKey("loans.id"), nullable=True)
    repayment_id = Column(Integer, ForeignKey("repayments.id"), nullable=True)


class ExpenseCategory(Base):
    __tablename__ = "expense_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True)
    is_active = Column(Boolean, default=True)

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(String(255))
    amount = Column(Float)
    category_id = Column(Integer, ForeignKey("expense_categories.id"), nullable=True)
    date = Column(Date)
    
    # Recurring Fields
    is_recurring = Column(Boolean, default=False)
    recurrence_interval = Column(String(20), nullable=True) # daily, weekly, monthly
    next_due_date = Column(Date, nullable=True)
    
    # Link
    expense_category = relationship("ExpenseCategory")

class SystemSettings(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    setting_key = Column(String(100), unique=True, index=True)
    setting_value = Column(Text)
    category = Column(String(50))  # payment, sms, general
    description = Column(Text, nullable=True)
    is_encrypted = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class RegistrationApplication(Base):
    __tablename__ = "registration_applications"
    
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255))
    phone = Column(String(20), unique=True, index=True)
    id_number = Column(String(50), unique=True)
    email = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    
    # M-Pesa payment tracking
    mpesa_transaction_id = Column(String(100), unique=True, nullable=True)
    amount_paid = Column(Float, nullable=True)
    payment_phone = Column(String(20), nullable=True)
    payment_date = Column(DateTime, nullable=True)
    
    # Status tracking
    status = Column(String(50), default="pending")  # pending, paid, approved, rejected
    created_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)
    processed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Link to client if approved
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)

class DisbursementTransaction(Base):
    __tablename__ = "disbursement_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    loan_id = Column(Integer, ForeignKey("loans.id"))
    client_id = Column(Integer, ForeignKey("clients.id"))
    
    # Transaction details
    amount = Column(Float)
    method = Column(String(20))  # mpesa, bank, manual
    
    # M-Pesa specific
    mpesa_transaction_id = Column(String(100), nullable=True, unique=True)
    originator_conversation_id = Column(String(100), nullable=True, index=True)
    mpesa_phone = Column(String(20), nullable=True)
    mpesa_result_code = Column(String(10), nullable=True)
    mpesa_result_desc = Column(Text, nullable=True)
    
    # Bank specific
    bank_name = Column(String(100), nullable=True)
    bank_account = Column(String(50), nullable=True)
    bank_reference = Column(String(100), nullable=True)
    
    # Status tracking
    status = Column(String(20), default="pending")  # pending, processing, completed, failed
    initiated_by = Column(Integer, ForeignKey("users.id"))
    initiated_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    # Response data
    error_message = Column(Text, nullable=True)
    
    # Relationships
    loan = relationship("Loan", backref="disbursements")
    client = relationship("Client")
    user = relationship("User")



# --- NEW TABLES FOR FEATURE REPLICATION ---

class Branch(Base):
    __tablename__ = "branches"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True)
    location = Column(String(255))

class CustomerGroup(Base):
    __tablename__ = "customer_groups"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True)
    description = Column(Text, nullable=True)

class LoanGuarantor(Base):
    __tablename__ = "loan_guarantors"
    id = Column(Integer, primary_key=True, index=True)
    loan_id = Column(Integer, ForeignKey("loans.id"))
    name = Column(String(255))
    phone = Column(String(20))
    id_number = Column(String(50), nullable=True)
    relation = Column(String(100)) # Renamed from relationship
    occupation = Column(String(100), nullable=True)
    residence = Column(String(255), nullable=True)
    landmark = Column(String(255), nullable=True)
    
    loan = relationship("Loan", back_populates="guarantors")

class LoanReferee(Base):
    __tablename__ = "loan_referees"
    id = Column(Integer, primary_key=True, index=True)
    loan_id = Column(Integer, ForeignKey("loans.id"))
    name = Column(String(255))
    phone = Column(String(20))
    relation = Column(String(100)) # Renamed from relationship
    address = Column(String(255), nullable=True)
    
    loan = relationship("Loan", back_populates="referees")

class LoanCollateral(Base):
    __tablename__ = "loan_collateral"
    id = Column(Integer, primary_key=True, index=True)
    loan_id = Column(Integer, ForeignKey("loans.id"))
    name = Column(String(255)) # Description
    serial_number = Column(String(100), nullable=True)
    estimated_value = Column(Float)
    condition = Column(String(255), nullable=True)
    
    loan = relationship("Loan", back_populates="collateral")

class LoanFinancialAnalysis(Base):
    __tablename__ = "loan_financial_analysis"
    id = Column(Integer, primary_key=True, index=True)
    loan_id = Column(Integer, ForeignKey("loans.id"), unique=True)
    
    # Sales
    daily_sales = Column(Float, default=0.0)
    monthly_sales = Column(Float, default=0.0)
    gross_profit = Column(Float, default=0.0)
    other_income = Column(Float, default=0.0)
    
    # Expenses
    cost_of_sales = Column(Float, default=0.0)
    expenditure = Column(Float, default=0.0)
    
    # Net
    net_income = Column(Float, default=0.0)
    available_income = Column(Float, default=0.0) # After logic
    
    loan = relationship("Loan", back_populates="financial_analysis")

class NextOfKin(Base):
    __tablename__ = "next_of_kin"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"))
    name = Column(String(255))
    phone = Column(String(20))
    relation = Column(String(100)) # Renamed from relationship
    residence = Column(String(255), nullable=True)

    client = relationship("Client", back_populates="next_of_kin")

class SavingsAccount(Base):
    __tablename__ = "savings_accounts"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"))
    account_type = Column(String(50), default="general") # general, lgf
    balance = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    client = relationship("Client", back_populates="savings_accounts")
    transactions = relationship("SavingsTransaction", back_populates="account")

class SavingsTransaction(Base):
    __tablename__ = "savings_transactions"
    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("savings_accounts.id"))
    amount = Column(Float)
    transaction_type = Column(String(20)) # deposit, withdrawal, interest
    description = Column(String(255))
    date = Column(DateTime, default=datetime.utcnow)
    performed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    account = relationship("SavingsAccount", back_populates="transactions")

class ActivityLog(Base):
    __tablename__ = "activity_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String(50)) # create, update, delete, login, disburse
    resource = Column(String(50)) # client, loan, repayment, setting
    resource_id = Column(String(50), nullable=True)
    details = Column(Text, nullable=True) # JSON details
    ip_address = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User")

class OrganizationConfig(Base):
    __tablename__ = "organization_config"
    
    id = Column(Integer, primary_key=True, index=True)
    organization_name = Column(String(255), default="Inphora Lending System")
    slug = Column(String(100), unique=True, index=True, nullable=True)
    logo_url = Column(String(500), nullable=True)
    
    # Brand Colors
    primary_color = Column(String(7), default="#f97316")  # Hex color
    secondary_color = Column(String(7), default="#0ea5e9")  # Hex color
    
    # Contact Information
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    
    # Business Details
    registration_number = Column(String(100), nullable=True)
    tax_id = Column(String(100), nullable=True)
    
    # Localization
    currency = Column(String(3), default="KES")  # ISO 4217 currency code
    locale = Column(String(10), default="en-KE")
    timezone = Column(String(50), default="Africa/Nairobi")
    
    # Meta
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # PWA Settings
    pwa_short_name = Column(String(30), nullable=True)  # Max 30 chars for homescreen
    pwa_description = Column(String(500), nullable=True)
    pwa_icon_url = Column(String(500), nullable=True)         # 192x192
    pwa_icon_512_url = Column(String(500), nullable=True)     # 512x512
    pwa_splash_bg_color = Column(String(7), nullable=True)    # Hex, default white
    pwa_theme_color = Column(String(7), nullable=True)        # Status bar color
    pwa_display = Column(String(20), default="standalone")    # standalone, minimal-ui, fullscreen
    pwa_start_url = Column(String(100), default="/")         # Start path
    pwa_enabled = Column(Boolean, default=False)              # Feature flag

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String(255))
    message = Column(Text)
    type = Column(String(50), default="info") # info, success, warning, error
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")