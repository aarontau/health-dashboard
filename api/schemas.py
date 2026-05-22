import hashlib
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List

from pydantic import BaseModel, EmailStr, Field

from .models import (
    ConsultationOutcome, FacilityType, ReferralPriority,
    ReferralStatus, Sex, UserRole,
)


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    role: UserRole
    first_name: str
    last_name: str
    phone: Optional[str] = None
    hpcsa_number: Optional[str] = None
    sanc_number: Optional[str] = None
    facility_id: Optional[int] = None
    district_id: Optional[int] = None
    province_id: Optional[int] = None


class UserRead(BaseModel):
    id: int
    email: str
    role: UserRole
    first_name: str
    last_name: str
    phone: Optional[str] = None
    hpcsa_number: Optional[str] = None
    sanc_number: Optional[str] = None
    facility_id: Optional[int] = None
    district_id: Optional[int] = None
    province_id: Optional[int] = None
    is_active: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    phone: Optional[str] = None
    hpcsa_number: Optional[str] = None
    sanc_number: Optional[str] = None
    is_active: Optional[bool] = None


# ---------------------------------------------------------------------------
# Patients
# ---------------------------------------------------------------------------

class PatientCreate(BaseModel):
    national_id: Optional[str] = None
    year_of_birth: Optional[int] = Field(None, ge=1900, le=2100)
    sex: Sex
    residence_district_id: Optional[int] = None

    def get_id_hash(self) -> Optional[str]:
        if self.national_id:
            return hashlib.sha256(self.national_id.strip().upper().encode()).hexdigest()
        return None


class PatientRead(BaseModel):
    id: int
    year_of_birth: Optional[int] = None
    sex: Sex
    residence_district_id: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# ICD-10
# ---------------------------------------------------------------------------

class ICD10CodeRead(BaseModel):
    code: str
    description: str
    chapter: Optional[str] = None
    block: Optional[str] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Diagnoses
# ---------------------------------------------------------------------------

class DiagnosisCreate(BaseModel):
    icd10_code: str = Field(max_length=7)
    is_primary: bool = False
    confirmed: bool = False


class DiagnosisRead(BaseModel):
    id: int
    consultation_id: int
    icd10_code: str
    is_primary: bool
    confirmed: bool

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Prescriptions
# ---------------------------------------------------------------------------

class PrescriptionCreate(BaseModel):
    medicine_name: str = Field(max_length=200)
    dose: Optional[str] = Field(None, max_length=50)
    frequency: Optional[str] = Field(None, max_length=50)
    duration_days: Optional[int] = Field(None, ge=1, le=365)
    instructions: Optional[str] = None


class PrescriptionRead(BaseModel):
    id: int
    consultation_id: int
    medicine_name: str
    dose: Optional[str] = None
    frequency: Optional[str] = None
    duration_days: Optional[int] = None
    instructions: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Consultations
# ---------------------------------------------------------------------------

class ConsultationCreate(BaseModel):
    patient_id: int
    chief_complaint: str
    clinical_notes: Optional[str] = None
    outcome: ConsultationOutcome
    follow_up_date: Optional[date] = None
    is_new_patient: bool = False
    systolic_bp: Optional[int] = Field(None, ge=40, le=300)
    diastolic_bp: Optional[int] = Field(None, ge=20, le=200)
    heart_rate: Optional[int] = Field(None, ge=20, le=300)
    temperature_celsius: Optional[Decimal] = Field(None, ge=25, le=45)
    oxygen_saturation: Optional[int] = Field(None, ge=0, le=100)
    weight_kg: Optional[Decimal] = Field(None, gt=0)
    diagnoses: List[DiagnosisCreate] = []
    prescriptions: List[PrescriptionCreate] = []


class ConsultationUpdate(BaseModel):
    clinical_notes: Optional[str] = None
    outcome: Optional[ConsultationOutcome] = None
    follow_up_date: Optional[date] = None
    ended_at: Optional[datetime] = None
    systolic_bp: Optional[int] = Field(None, ge=40, le=300)
    diastolic_bp: Optional[int] = Field(None, ge=20, le=200)
    heart_rate: Optional[int] = Field(None, ge=20, le=300)
    temperature_celsius: Optional[Decimal] = Field(None, ge=25, le=45)
    oxygen_saturation: Optional[int] = Field(None, ge=0, le=100)
    weight_kg: Optional[Decimal] = Field(None, gt=0)


class ConsultationRead(BaseModel):
    id: int
    facility_id: int
    patient_id: int
    clinician_id: int
    consultation_date: date
    started_at: datetime
    ended_at: Optional[datetime] = None
    chief_complaint: str
    clinical_notes: Optional[str] = None
    outcome: ConsultationOutcome
    follow_up_date: Optional[date] = None
    is_new_patient: bool
    systolic_bp: Optional[int] = None
    diastolic_bp: Optional[int] = None
    heart_rate: Optional[int] = None
    temperature_celsius: Optional[Decimal] = None
    oxygen_saturation: Optional[int] = None
    weight_kg: Optional[Decimal] = None
    created_at: datetime
    diagnoses: List[DiagnosisRead] = []
    prescriptions: List[PrescriptionRead] = []

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Referrals
# ---------------------------------------------------------------------------

class ReferralCreate(BaseModel):
    receiving_facility_id: int
    priority: ReferralPriority
    reason: str
    clinical_summary: Optional[str] = None


class ReferralStatusUpdate(BaseModel):
    status: ReferralStatus


class ReferralRead(BaseModel):
    id: int
    consultation_id: int
    referring_facility_id: int
    receiving_facility_id: int
    priority: ReferralPriority
    reason: str
    clinical_summary: Optional[str] = None
    status: ReferralStatus
    referred_at: datetime
    accepted_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
