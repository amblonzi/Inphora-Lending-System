from pydantic import BaseModel, field_validator
from typing import Optional, List, Dict, Any, Generic, TypeVar
from datetime import date, datetime

T = TypeVar("T")

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    size: int
    pages: int

    class Config:
        from_attributes = True

# Enhanced Authentication Schemas
class TokenData(BaseModel):
    email: Optional[str] = None

class LoginResponse(BaseModel):
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_type: Optional[str] = "bearer"
    two_factor_required: bool = False
    user_id: Optional[int] = None
    message: Optional[str] = None

class TokenRefreshRequest(BaseModel):
    refresh_token: str

class TokenRefreshResponse(BaseModel):
    success: bool
    data: Dict[str, Any]
    message: str

class LogoutRequest(BaseModel):
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None

class TwoFactorVerify(BaseModel):
    email: str
    otp: str

class TwoFactorResponse(BaseModel):
    success: bool
    message: str

# Standard API Response Schema
class APIResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    data: Optional[Any] = None
    error: Optional[str] = None
    errors: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None

# User Schemas
class UserBase(BaseModel):
    email: str
    full_name: Optional[str] = None
    role: str = "loan_officer"
    phone: Optional[str] = None
    two_factor_enabled: Optional[bool] = False

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None
    phone: Optional[str] = None
    two_factor_enabled: Optional[bool] = None

class Userimpl(UserBase):
    id: int
    is_active: bool
    permissions: Optional[str] = None
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True

# Activity Log Schema
class ActivityLogBase(BaseModel):
    user_id: int
    action: str
    resource: str
    resource_id: Optional[str] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    timestamp: Optional[datetime] = None

class ActivityLog(ActivityLogBase):
    id: int
    user: Optional[Userimpl] = None

    class Config:
        from_attributes = True

# Token Schema
class Token(BaseModel):
    access_token: str
    token_type: str

class OTPVerify(BaseModel):
    user_id: int
    otp_code: str

# Repayment Schemas
class RepaymentBase(BaseModel):
    amount: float
    payment_date: Optional[date] = None
    notes: Optional[str] = None
    mpesa_transaction_id: Optional[str] = None
    payment_method: str = "manual"

class RepaymentCreate(RepaymentBase):
    pass

class Repayment(RepaymentBase):
    id: int
    loan_id: int
    class Config:
        from_attributes = True

class MpesaIncomingTransactionBase(BaseModel):
    transaction_id: str
    amount: float
    phone: str
    bill_ref: Optional[str] = None  # May be absent in some gateway callbacks
    status: str
    created_at: Optional[datetime] = None
    client_id: Optional[int] = None
    loan_id: Optional[int] = None
    repayment_id: Optional[int] = None

class MpesaIncomingTransaction(MpesaIncomingTransactionBase):
    id: int
    class Config:
        from_attributes = True

# Branch Schemas
class BranchBase(BaseModel):
    name: str
    location: Optional[str] = None
    
    # Tier 2 - Paybill
    mpesa_shortcode: Optional[str] = None
    mpesa_passkey: Optional[str] = None
    mpesa_consumer_key: Optional[str] = None
    mpesa_consumer_secret: Optional[str] = None

class BranchCreate(BranchBase):
    pass

class Branch(BranchBase):
    id: int
    class Config:
        from_attributes = True

# Customer Group Schemas
class CustomerGroupBase(BaseModel):
    name: str
    description: Optional[str] = None

class CustomerGroupCreate(CustomerGroupBase):
    pass

class CustomerGroup(CustomerGroupBase):
    id: int
    class Config:
        from_attributes = True

# Next of Kin Schemas
class NextOfKinBase(BaseModel):
    name: str
    phone: str
    relation: str # Renamed
    residence: Optional[str] = None

class NextOfKinCreate(NextOfKinBase):
    pass

class NextOfKin(NextOfKinBase):
    id: int
    class Config:
        from_attributes = True

# Client Schemas
class ClientBase(BaseModel):
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: str
    id_number: str
    address: Optional[str] = None
    
    # New Fields
    dob: Optional[date] = None
    gender: Optional[str] = None
    marital_status: Optional[str] = None
    document_url: Optional[str] = None  # KYC document
    town: Optional[str] = None
    estate: Optional[str] = None
    house_number: Optional[str] = None
    
    # Payment details
    mpesa_phone: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_account_name: Optional[str] = None
    preferred_disbursement: str = "mpesa"
    
    # Tier 1 Regulatory - KYC
    is_id_verified: bool = False
    id_verification_date: Optional[datetime] = None
    id_verification_metadata: Optional[str] = None

    @field_validator('dob', mode='before')
    @classmethod
    def empty_string_to_none(cls, v):
        if v == "":
            return None
        return v

class ClientCreate(ClientBase):
    branch_id: Optional[int] = None
    customer_group_id: Optional[int] = None
    next_of_kin: Optional[NextOfKinCreate] = None

class ClientUpdate(BaseModel):
    """All-Optional schema for partial client updates (PATCH semantics)"""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    id_number: Optional[str] = None
    address: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = None
    marital_status: Optional[str] = None
    document_url: Optional[str] = None
    town: Optional[str] = None
    estate: Optional[str] = None
    house_number: Optional[str] = None
    mpesa_phone: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_account_name: Optional[str] = None
    preferred_disbursement: Optional[str] = None
    is_id_verified: Optional[bool] = None
    branch_id: Optional[int] = None
    customer_group_id: Optional[int] = None
    next_of_kin: Optional[NextOfKinCreate] = None

    @field_validator('dob', mode='before')
    @classmethod
    def empty_string_to_none(cls, v):
        if v == "":
            return None
        return v

class ClientKYCDocumentBase(BaseModel):
    document_type: Optional[str] = None
    document_url: str

class ClientKYCDocument(ClientKYCDocumentBase):
    id: int
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class Client(ClientBase):
    id: int
    created_at: Optional[datetime] = None
    status: Optional[str] = "active"
    joined_at: Optional[datetime] = None
    branch_id: Optional[int] = None
    customer_group_id: Optional[int] = None
    next_of_kin: List[NextOfKin] = []
    kyc_documents: List[ClientKYCDocument] = []
    
    class Config:
        from_attributes = True

# Alias used by update endpoint
ClientRead = Client
class ClientKYCDocumentCreate(ClientKYCDocumentBase):
    pass

# Loan Product Schemas
class LoanProductBase(BaseModel):
    name: str
    interest_rate: float
    min_amount: float
    max_amount: float
    min_period_months: int
    max_period_months: int
    description: Optional[str] = None
    
    # New Fees
    interest_rate_7_days_plus: float = 0.0
    grace_period_days: int = 0
    insurance_fee: float = 0.0
    tracking_fee: float = 0.0
    valuation_fee: float = 0.0
    processing_fee_percent: float = 0.0
    crb_fee: float = 0.0
    
    # New Fields
    processing_fee_fixed: float = 0.0
    registration_fee: float = 0.0
    duration_unit: Optional[str] = "months"
    
    first_cycle_limit: Optional[float] = None
    
    # Tier 1 Regulatory - APR
    apr_effective_rate: float = 0.0

class LoanProductCreate(LoanProductBase):
    pass

class LoanProduct(LoanProductBase):
    id: int
    
    class Config:
        from_attributes = True

# Loan Component Schemas
class LoanGuarantorBase(BaseModel):
    name: str
    phone: str
    id_number: Optional[str] = None
    relation: str # Renamed
    occupation: Optional[str] = None
    residence: Optional[str] = None
    landmark: Optional[str] = None

class LoanGuarantorCreate(LoanGuarantorBase):
    pass

class LoanGuarantor(LoanGuarantorBase):
    id: int
    class Config:
        from_attributes = True

class LoanCollateralBase(BaseModel):
    name: str
    serial_number: Optional[str] = None
    estimated_value: float
    condition: Optional[str] = None

class LoanCollateralCreate(LoanCollateralBase):
    pass

class LoanCollateral(LoanCollateralBase):
    id: int
    class Config:
        from_attributes = True

class LoanRefereeBase(BaseModel):
    name: str
    phone: str
    relation: str # Renamed
    address: Optional[str] = None

class LoanRefereeCreate(LoanRefereeBase):
    pass

class LoanReferee(LoanRefereeBase):
    id: int
    class Config:
        from_attributes = True

class LoanFinancialAnalysisBase(BaseModel):
    daily_sales: float = 0.0
    monthly_sales: float = 0.0
    gross_profit: float = 0.0
    other_income: float = 0.0
    cost_of_sales: float = 0.0
    expenditure: float = 0.0
    net_income: float = 0.0

class LoanFinancialAnalysisCreate(LoanFinancialAnalysisBase):
    pass

class LoanFinancialAnalysis(LoanFinancialAnalysisBase):
    id: int
    class Config:
        from_attributes = True

# Loan Schemas
class LoanBase(BaseModel):
    client_id: int
    product_id: int
    amount: float
    duration_months: int = 1 # Default to 1 to avoid validation errors
    duration_count: Optional[int] = None
    duration_unit: Optional[str] = "months"
    start_date: Optional[date] = None
    repayment_frequency: str = "monthly"
    is_processing_fee_waived: bool = False

class LoanCreate(LoanBase):
    guarantors: List[LoanGuarantorCreate] = []
    collateral: List[LoanCollateralCreate] = []
    referees: List[LoanRefereeCreate] = []
    financial_analysis: Optional[LoanFinancialAnalysisCreate] = None

class LoanApprovalBase(BaseModel):
    status: str
    notes: Optional[str] = None
    level: int

class LoanApprovalCreate(LoanApprovalBase):
    pass

class LoanApproval(LoanApprovalBase):
    id: int
    user_id: int
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class Loan(LoanBase):
    id: int
    status: str
    interest_rate: float
    end_date: Optional[date] = None
    current_approval_level: int
    
    # Approval info
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    
    approvals: List[LoanApproval] = []
    guarantors: List[LoanGuarantor] = []
    collateral: List[LoanCollateral] = []
    referees: List[LoanReferee] = []
    financial_analysis: Optional[LoanFinancialAnalysis] = None
    repayments: List[Repayment] = []  # Include repayments for real-time balance calc
    
    # Calculated fields
    outstanding_balance: Optional[float] = None
    accrued_penalties: Optional[float] = None
    
    # Tier 1 Regulatory - APR
    apr_at_offered: Optional[float] = None
    total_cost_of_credit: Optional[float] = None
    
    class Config:
        from_attributes = True

class LoanApprovalRequest(BaseModel):
    action: str # approve, reject
    notes: Optional[str] = None

class LoanScheduleBase(BaseModel):
    installment_number: int
    due_date: Optional[date] = None
    amount_due: float
    principal_amount: float
    interest_amount: float
    balance: float

class LoanSchedule(LoanScheduleBase):
    pass

# Expense Category Schemas
class ExpenseCategoryBase(BaseModel):
    name: str
    is_active: bool = True

class ExpenseCategoryCreate(ExpenseCategoryBase):
    pass

class ExpenseCategory(ExpenseCategoryBase):
    id: int
    
    class Config:
        from_attributes = True

# Expense Schemas
class ExpenseBase(BaseModel):
    description: str
    amount: float
    category_id: Optional[int] = None
    category: Optional[str] = None # Optional fallback
    date: Optional[date] = None
    
    # Recurring Fields
    is_recurring: bool = False
    recurrence_interval: Optional[str] = None # daily, weekly, monthly
    next_due_date: Optional[date] = None

class ExpenseCreate(ExpenseBase):
    pass

class Expense(ExpenseBase):
    id: int
    
    class Config:
        from_attributes = True
# Disbursement Schemas
class DisbursementTransactionBase(BaseModel):
    loan_id: int
    client_id: int
    amount: float
    method: str
    mpesa_phone: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None
    bank_reference: Optional[str] = None

class DisbursementTransactionCreate(DisbursementTransactionBase):
    pass

class DisbursementTransaction(DisbursementTransactionBase):
    id: int
    status: str
    mpesa_transaction_id: Optional[str] = None
    originator_conversation_id: Optional[str] = None
    mpesa_result_code: Optional[str] = None
    mpesa_result_desc: Optional[str] = None
    initiated_by: int
    initiated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None

    class Config:
        from_attributes = True

# System Settings Schemas
class SystemSettingBase(BaseModel):
    setting_key: str
    setting_value: str
    category: Optional[str] = "general"
    description: Optional[str] = None
    is_encrypted: bool = False

class SystemSettingCreate(SystemSettingBase):
    pass

class SystemSetting(SystemSettingBase):
    id: int
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Organization Config Schemas
class OrganizationConfigBase(BaseModel):
    organization_name: str = "Inphora Lending System"
    slug: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: str = "#f97316"
    secondary_color: str = "#0ea5e9"
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    registration_number: Optional[str] = None
    tax_id: Optional[str] = None
    currency: str = "KES"
    locale: str = "en-KE"
    timezone: str = "Africa/Nairobi"
    
    # PWA Settings
    pwa_short_name: Optional[str] = None
    pwa_description: Optional[str] = None
    pwa_icon_url: Optional[str] = None
    pwa_icon_512_url: Optional[str] = None
    pwa_splash_bg_color: Optional[str] = None
    pwa_theme_color: Optional[str] = None
    pwa_display: str = "standalone"
    pwa_start_url: str = "/"
    pwa_enabled: bool = False

class OrganizationConfigCreate(OrganizationConfigBase):
    pass

class OrganizationConfigUpdate(BaseModel):
    organization_name: Optional[str] = None
    slug: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    registration_number: Optional[str] = None
    tax_id: Optional[str] = None
    currency: Optional[str] = None
    locale: Optional[str] = None
    timezone: Optional[str] = None
    
    # PWA Settings
    pwa_short_name: Optional[str] = None
    pwa_description: Optional[str] = None
    pwa_icon_url: Optional[str] = None
    pwa_icon_512_url: Optional[str] = None
    pwa_splash_bg_color: Optional[str] = None
    pwa_theme_color: Optional[str] = None
    pwa_display: Optional[str] = None
    pwa_start_url: Optional[str] = None
    pwa_enabled: Optional[bool] = None

class OrganizationConfig(OrganizationConfigBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Notification Schemas
class NotificationBase(BaseModel):
    title: str
    message: str
    type: str = "info"
    is_read: bool = False

class NotificationCreate(NotificationBase):
    user_id: int

class Notification(NotificationBase):
    id: int
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Cheque Discounting Schemas
class ChequeDiscountBase(BaseModel):
    client_id: int
    cheque_number: str
    bank_name: str
    drawer_name: str
    face_amount: float
    discount_rate: float
    due_date: date
    notes: Optional[str] = None

class ChequeDiscountCreate(ChequeDiscountBase):
    pass

class ChequeDiscount(ChequeDiscountBase):
    id: int
    discount_amount: float
    net_amount: float
    status: str
    created_at: Optional[datetime] = None
    
    client: Optional[Client] = None

    class Config:
        from_attributes = True

# Tier 1 Regulatory Schemas

class StatutoryReportBase(BaseModel):
    report_type: str
    period_month: int
    period_year: int
    status: str = "pending"

class StatutoryReport(StatutoryReportBase):
    id: int
    file_url: Optional[str] = None
    generated_at: Optional[datetime] = None
    generated_by_id: Optional[int] = None
    
    class Config:
        from_attributes = True

class ComplianceChecklistBase(BaseModel):
    category: str
    requirement: str
    status: str = "non-compliant"
    evidence_url: Optional[str] = None
    notes: Optional[str] = None

class ComplianceChecklist(ComplianceChecklistBase):
    id: int
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Tier 3 - Chama (Group Lending) Schemas

class ChamaGroupBase(BaseModel):
    name: str
    branch_id: int
    description: Optional[str] = None

class ChamaGroupCreate(ChamaGroupBase):
    pass

class ChamaMemberBase(BaseModel):
    group_id: int
    client_id: int
    role: str = "member"

class ChamaMember(ChamaMemberBase):
    id: int
    joined_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class ChamaGroup(ChamaGroupBase):
    id: int
    total_savings: float
    status: str
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

# Tier 3 - Logbook Collateral
class LogbookCollateralBase(BaseModel):
    registration_number: str
    chassis_number: Optional[str] = None
    make_model: str

class LogbookCollateral(LogbookCollateralBase):
    id: int
    ntsa_verified: bool
    caveat_lodged: bool
    class Config:
        from_attributes = True

# Tier 3 - Loan Rollover
class LoanRolloverBase(BaseModel):
    rollover_number: int
    new_end_date: date
    additional_interest: float
    reason: str

class LoanRollover(LoanRolloverBase):
    id: int
    created_at: Optional[datetime] = None
    authorized_by: int
    class Config:
        from_attributes = True

# Tier 2 - STK Push
class StkPushRequest(BaseModel):
    loan_id: int
    amount: float
    phone: str
