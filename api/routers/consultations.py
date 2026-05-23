from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from ..audit import log_action
from ..database import get_db
from ..dependencies import assert_facility_access, get_current_user, require_min_role, require_roles
from ..models import (
    AuditAction, Consultation, ConsultationDiagnosis, Prescription, User, UserRole,
)
from ..schemas import (
    ConsultationCreate, ConsultationRead, ConsultationUpdate,
    DiagnosisCreate, DiagnosisRead, PrescriptionCreate, PrescriptionRead,
)

router = APIRouter(prefix="/consultations", tags=["consultations"])

_clinical = require_roles(UserRole.nurse, UserRole.doctor)
_view = require_min_role(UserRole.nurse)


def _load_full(stmt):
    return stmt.options(
        selectinload(Consultation.diagnoses),
        selectinload(Consultation.prescriptions),
        selectinload(Consultation.referrals),
    )


async def _get_or_404(db: AsyncSession, consultation_id: int) -> Consultation:
    result = await db.execute(
        _load_full(select(Consultation).where(Consultation.id == consultation_id))
    )
    obj = result.scalar_one_or_none()
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consultation not found")
    return obj


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------

@router.post("/", response_model=ConsultationRead, status_code=status.HTTP_201_CREATED)
async def create_consultation(
    body: ConsultationCreate,
    request: Request,
    current_user: User = Depends(_clinical),
    db: AsyncSession = Depends(get_db),
):
    consult = Consultation(
        facility_id=current_user.facility_id,
        patient_id=body.patient_id,
        clinician_id=current_user.id,
        chief_complaint=body.chief_complaint,
        clinical_notes=body.clinical_notes,
        outcome=body.outcome,
        follow_up_date=body.follow_up_date,
        is_new_patient=body.is_new_patient,
        systolic_bp=body.systolic_bp,
        diastolic_bp=body.diastolic_bp,
        heart_rate=body.heart_rate,
        temperature_celsius=body.temperature_celsius,
        oxygen_saturation=body.oxygen_saturation,
        weight_kg=body.weight_kg,
    )
    db.add(consult)
    await db.flush()

    for d in body.diagnoses:
        db.add(ConsultationDiagnosis(
            consultation_id=consult.id,
            icd10_code=d.icd10_code,
            is_primary=d.is_primary,
            confirmed=d.confirmed,
        ))

    for p in body.prescriptions:
        db.add(Prescription(
            consultation_id=consult.id,
            medicine_name=p.medicine_name,
            dose=p.dose,
            frequency=p.frequency,
            duration_days=p.duration_days,
            instructions=p.instructions,
        ))

    await log_action(
        db,
        user_id=current_user.id,
        action=AuditAction.INSERT,
        table_name="consultations",
        record_id=consult.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    await db.commit()

    result = await db.execute(_load_full(select(Consultation).where(Consultation.id == consult.id)))
    return result.scalar_one()


# ---------------------------------------------------------------------------
# List
# ---------------------------------------------------------------------------

@router.get("/", response_model=list[ConsultationRead])
async def list_consultations(
    consultation_date: str | None = Query(None, description="Filter by date YYYY-MM-DD"),
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(_view),
    db: AsyncSession = Depends(get_db),
):
    stmt = _load_full(
        select(Consultation).where(Consultation.facility_id == current_user.facility_id)
    )
    if consultation_date:
        from datetime import date
        stmt = stmt.where(Consultation.consultation_date == date.fromisoformat(consultation_date))

    stmt = stmt.order_by(Consultation.started_at.desc()).offset(skip).limit(min(limit, 200))
    result = await db.execute(stmt)
    return result.scalars().all()


# ---------------------------------------------------------------------------
# Get one
# ---------------------------------------------------------------------------

@router.get("/{consultation_id}", response_model=ConsultationRead)
async def get_consultation(
    consultation_id: int,
    current_user: User = Depends(_view),
    db: AsyncSession = Depends(get_db),
):
    obj = await _get_or_404(db, consultation_id)
    assert_facility_access(current_user, obj.facility_id)
    return obj


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------

@router.patch("/{consultation_id}", response_model=ConsultationRead)
async def update_consultation(
    consultation_id: int,
    body: ConsultationUpdate,
    request: Request,
    current_user: User = Depends(_view),
    db: AsyncSession = Depends(get_db),
):
    obj = await _get_or_404(db, consultation_id)
    assert_facility_access(current_user, obj.facility_id)

    # nurses and doctors can only edit their own consultations
    if current_user.role in (UserRole.nurse, UserRole.doctor):
        if obj.clinician_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot edit another clinician's consultation")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(obj, field, value)
    obj.updated_at = datetime.now(timezone.utc)

    await log_action(
        db,
        user_id=current_user.id,
        action=AuditAction.UPDATE,
        table_name="consultations",
        record_id=obj.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    await db.commit()
    await db.refresh(obj)
    return obj


# ---------------------------------------------------------------------------
# Diagnoses sub-resource
# ---------------------------------------------------------------------------

@router.post("/{consultation_id}/diagnoses", response_model=DiagnosisRead, status_code=status.HTTP_201_CREATED)
async def add_diagnosis(
    consultation_id: int,
    body: DiagnosisCreate,
    current_user: User = Depends(_clinical),
    db: AsyncSession = Depends(get_db),
):
    obj = await _get_or_404(db, consultation_id)
    assert_facility_access(current_user, obj.facility_id)

    dx = ConsultationDiagnosis(
        consultation_id=consultation_id,
        icd10_code=body.icd10_code,
        is_primary=body.is_primary,
        confirmed=body.confirmed,
    )
    db.add(dx)
    await db.commit()
    await db.refresh(dx)
    return dx


# ---------------------------------------------------------------------------
# Prescriptions sub-resource
# ---------------------------------------------------------------------------

@router.post("/{consultation_id}/prescriptions", response_model=PrescriptionRead, status_code=status.HTTP_201_CREATED)
async def add_prescription(
    consultation_id: int,
    body: PrescriptionCreate,
    current_user: User = Depends(_clinical),
    db: AsyncSession = Depends(get_db),
):
    obj = await _get_or_404(db, consultation_id)
    assert_facility_access(current_user, obj.facility_id)

    rx = Prescription(
        consultation_id=consultation_id,
        medicine_name=body.medicine_name,
        dose=body.dose,
        frequency=body.frequency,
        duration_days=body.duration_days,
        instructions=body.instructions,
    )
    db.add(rx)
    await db.commit()
    await db.refresh(rx)
    return rx


@router.get("/{consultation_id}/prescriptions", response_model=list[PrescriptionRead])
async def list_prescriptions(
    consultation_id: int,
    current_user: User = Depends(_view),
    db: AsyncSession = Depends(get_db),
):
    obj = await _get_or_404(db, consultation_id)
    assert_facility_access(current_user, obj.facility_id)
    return obj.prescriptions
