import enum
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List

from sqlalchemy import (
    BigInteger, Boolean, CHAR, Date, Enum as SAEnum, ForeignKey,
    Integer, Numeric, SmallInteger, String, Text, TIMESTAMP,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# Python enums — values must match PostgreSQL enum literals exactly
# ---------------------------------------------------------------------------

class UserRole(str, enum.Enum):
    nurse = "nurse"
    doctor = "doctor"
    facility_manager = "facility_manager"
    district_officer = "district_officer"
    provincial_officer = "provincial_officer"
    national_officer = "national_officer"
    minister = "minister"


class FacilityType(str, enum.Enum):
    clinic = "clinic"
    community_health_centre = "community_health_centre"
    district_hospital = "district_hospital"
    regional_hospital = "regional_hospital"
    tertiary_hospital = "tertiary_hospital"


class Sex(str, enum.Enum):
    male = "male"
    female = "female"
    intersex = "intersex"
    unknown = "unknown"


class ConsultationOutcome(str, enum.Enum):
    treated_and_discharged = "treated_and_discharged"
    referred = "referred"
    admitted = "admitted"
    follow_up_scheduled = "follow_up_scheduled"
    left_without_being_seen = "left_without_being_seen"
    deceased = "deceased"


class ReferralPriority(str, enum.Enum):
    routine = "routine"
    urgent = "urgent"
    emergency = "emergency"


class ReferralStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"
    completed = "completed"


class AuditAction(str, enum.Enum):
    INSERT = "INSERT"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    SELECT = "SELECT"


# ---------------------------------------------------------------------------
# ORM models — create_type=False because schema.sql already defined the types
# ---------------------------------------------------------------------------

class Province(Base):
    __tablename__ = "provinces"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    code: Mapped[str] = mapped_column(CHAR(2), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())

    districts: Mapped[List["District"]] = relationship(back_populates="province")


class District(Base):
    __tablename__ = "districts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    province_id: Mapped[int] = mapped_column(Integer, ForeignKey("provinces.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    code: Mapped[str] = mapped_column(String(10), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())

    province: Mapped["Province"] = relationship(back_populates="districts")
    sub_districts: Mapped[List["SubDistrict"]] = relationship(back_populates="district")


class SubDistrict(Base):
    __tablename__ = "sub_districts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    district_id: Mapped[int] = mapped_column(Integer, ForeignKey("districts.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())

    district: Mapped["District"] = relationship(back_populates="sub_districts")
    facilities: Mapped[List["Facility"]] = relationship(back_populates="sub_district")


class Facility(Base):
    __tablename__ = "facilities"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sub_district_id: Mapped[int] = mapped_column(Integer, ForeignKey("sub_districts.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    facility_type: Mapped[FacilityType] = mapped_column(
        SAEnum(FacilityType, name="facility_type", create_type=False), nullable=False
    )
    facility_number: Mapped[Optional[str]] = mapped_column(String(20), unique=True)
    address: Mapped[Optional[str]] = mapped_column(Text)
    gps_latitude: Mapped[Optional[Decimal]] = mapped_column(Numeric(9, 6))
    gps_longitude: Mapped[Optional[Decimal]] = mapped_column(Numeric(9, 6))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())

    sub_district: Mapped["SubDistrict"] = relationship(back_populates="facilities")
    users: Mapped[List["User"]] = relationship(back_populates="facility")
    consultations: Mapped[List["Consultation"]] = relationship(back_populates="facility")


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    facility_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("facilities.id"))
    district_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("districts.id"))
    province_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("provinces.id"))
    role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole, name="user_role", create_type=False), nullable=False
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    hpcsa_number: Mapped[Optional[str]] = mapped_column(String(30))
    sanc_number: Mapped[Optional[str]] = mapped_column(String(30))
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(20))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True))
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())

    facility: Mapped[Optional["Facility"]] = relationship(back_populates="users")
    consultations: Mapped[List["Consultation"]] = relationship(back_populates="clinician")


class Patient(Base):
    __tablename__ = "patients"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    national_id_hash: Mapped[Optional[str]] = mapped_column(CHAR(64), unique=True)
    year_of_birth: Mapped[Optional[int]] = mapped_column(SmallInteger)
    sex: Mapped[Sex] = mapped_column(SAEnum(Sex, name="sex", create_type=False), nullable=False)
    residence_district_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("districts.id"))
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())

    consultations: Mapped[List["Consultation"]] = relationship(back_populates="patient")


class ICD10Code(Base):
    __tablename__ = "icd10_codes"
    code: Mapped[str] = mapped_column(String(7), primary_key=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    chapter: Mapped[Optional[str]] = mapped_column(String(5))
    block: Mapped[Optional[str]] = mapped_column(String(10))


class Consultation(Base):
    __tablename__ = "consultations"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    facility_id: Mapped[int] = mapped_column(Integer, ForeignKey("facilities.id"), nullable=False)
    patient_id: Mapped[int] = mapped_column(Integer, ForeignKey("patients.id"), nullable=False)
    clinician_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    consultation_date: Mapped[date] = mapped_column(Date, nullable=False, server_default=func.current_date())
    started_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())
    ended_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True))
    chief_complaint: Mapped[str] = mapped_column(Text, nullable=False)
    clinical_notes: Mapped[Optional[str]] = mapped_column(Text)
    outcome: Mapped[ConsultationOutcome] = mapped_column(
        SAEnum(ConsultationOutcome, name="consultation_outcome", create_type=False), nullable=False
    )
    follow_up_date: Mapped[Optional[date]] = mapped_column(Date)
    systolic_bp: Mapped[Optional[int]] = mapped_column(SmallInteger)
    diastolic_bp: Mapped[Optional[int]] = mapped_column(SmallInteger)
    heart_rate: Mapped[Optional[int]] = mapped_column(SmallInteger)
    temperature_celsius: Mapped[Optional[Decimal]] = mapped_column(Numeric(4, 1))
    oxygen_saturation: Mapped[Optional[int]] = mapped_column(SmallInteger)
    weight_kg: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 1))
    is_new_patient: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())

    facility: Mapped["Facility"] = relationship(back_populates="consultations")
    patient: Mapped["Patient"] = relationship(back_populates="consultations")
    clinician: Mapped["User"] = relationship(back_populates="consultations")
    diagnoses: Mapped[List["ConsultationDiagnosis"]] = relationship(
        back_populates="consultation", cascade="all, delete-orphan"
    )
    prescriptions: Mapped[List["Prescription"]] = relationship(
        back_populates="consultation", cascade="all, delete-orphan"
    )
    referrals: Mapped[List["Referral"]] = relationship(
        back_populates="consultation", cascade="all, delete-orphan"
    )


class ConsultationDiagnosis(Base):
    __tablename__ = "consultation_diagnoses"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    consultation_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("consultations.id", ondelete="CASCADE"), nullable=False
    )
    icd10_code: Mapped[str] = mapped_column(String(7), ForeignKey("icd10_codes.code"), nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    confirmed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    consultation: Mapped["Consultation"] = relationship(back_populates="diagnoses")
    icd10: Mapped["ICD10Code"] = relationship()


class Prescription(Base):
    __tablename__ = "prescriptions"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    consultation_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("consultations.id", ondelete="CASCADE"), nullable=False
    )
    medicine_name: Mapped[str] = mapped_column(String(200), nullable=False)
    dose: Mapped[Optional[str]] = mapped_column(String(50))
    frequency: Mapped[Optional[str]] = mapped_column(String(50))
    duration_days: Mapped[Optional[int]] = mapped_column(SmallInteger)
    instructions: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())

    consultation: Mapped["Consultation"] = relationship(back_populates="prescriptions")


class Referral(Base):
    __tablename__ = "referrals"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    consultation_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("consultations.id", ondelete="CASCADE"), nullable=False
    )
    referring_facility_id: Mapped[int] = mapped_column(Integer, ForeignKey("facilities.id"), nullable=False)
    receiving_facility_id: Mapped[int] = mapped_column(Integer, ForeignKey("facilities.id"), nullable=False)
    priority: Mapped[ReferralPriority] = mapped_column(
        SAEnum(ReferralPriority, name="referral_priority", create_type=False), nullable=False
    )
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    clinical_summary: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[ReferralStatus] = mapped_column(
        SAEnum(ReferralStatus, name="referral_status", create_type=False),
        nullable=False,
        default=ReferralStatus.pending,
    )
    referred_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())
    accepted_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True))
    completed_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True))

    consultation: Mapped["Consultation"] = relationship(back_populates="referrals")
    referring_facility: Mapped["Facility"] = relationship(foreign_keys=[referring_facility_id])
    receiving_facility: Mapped["Facility"] = relationship(foreign_keys=[receiving_facility_id])


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"))
    action: Mapped[AuditAction] = mapped_column(
        SAEnum(AuditAction, name="audit_action", create_type=False), nullable=False
    )
    table_name: Mapped[str] = mapped_column(String(100), nullable=False)
    record_id: Mapped[Optional[int]] = mapped_column(BigInteger)
    payload: Mapped[Optional[dict]] = mapped_column(JSONB)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45))
    user_agent: Mapped[Optional[str]] = mapped_column(Text)
    occurred_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())
