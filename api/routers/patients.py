from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..audit import log_action
from ..database import get_db
from ..dependencies import get_current_user, require_min_role
from ..models import AuditAction, Patient, User, UserRole
from ..schemas import PatientCreate, PatientRead

router = APIRouter(prefix="/patients", tags=["patients"])

_clinical = require_min_role(UserRole.nurse)


@router.post("/", response_model=PatientRead, status_code=status.HTTP_201_CREATED)
async def create_patient(
    body: PatientCreate,
    request: Request,
    current_user: User = Depends(_clinical),
    db: AsyncSession = Depends(get_db),
):
    id_hash = body.get_id_hash()

    # return existing patient if the hashed ID already exists
    if id_hash:
        result = await db.execute(select(Patient).where(Patient.national_id_hash == id_hash))
        existing = result.scalar_one_or_none()
        if existing:
            return existing

    patient = Patient(
        national_id_hash=id_hash,
        year_of_birth=body.year_of_birth,
        sex=body.sex,
        residence_district_id=body.residence_district_id,
    )
    db.add(patient)
    await db.flush()

    await log_action(
        db,
        user_id=current_user.id,
        action=AuditAction.INSERT,
        table_name="patients",
        record_id=patient.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    await db.commit()
    await db.refresh(patient)
    return patient


@router.get("/{patient_id}", response_model=PatientRead)
async def get_patient(
    patient_id: int,
    current_user: User = Depends(_clinical),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = result.scalar_one_or_none()
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    return patient


@router.get("/", response_model=list[PatientRead])
async def list_patients(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(_clinical),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Patient).offset(skip).limit(min(limit, 200)))
    return result.scalars().all()
