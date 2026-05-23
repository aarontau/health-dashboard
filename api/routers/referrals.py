from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..dependencies import require_min_role, require_roles
from ..models import Consultation, Referral, ReferralStatus, User, UserRole
from ..schemas import ReferralCreate, ReferralRead, ReferralStatusUpdate

router = APIRouter(tags=["referrals"])

_clinical = require_roles(UserRole.nurse, UserRole.doctor)
_manager = require_min_role(UserRole.facility_manager)


@router.post("/consultations/{consultation_id}/referrals", response_model=ReferralRead, status_code=status.HTTP_201_CREATED)
async def create_referral(
    consultation_id: int,
    body: ReferralCreate,
    current_user: User = Depends(_clinical),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Consultation).where(Consultation.id == consultation_id))
    consult = result.scalar_one_or_none()
    if consult is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consultation not found")
    if consult.facility_id != current_user.facility_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    referral = Referral(
        consultation_id=consultation_id,
        referring_facility_id=current_user.facility_id,
        receiving_facility_id=body.receiving_facility_id,
        priority=body.priority,
        reason=body.reason,
        clinical_summary=body.clinical_summary,
    )
    db.add(referral)
    await db.commit()
    await db.refresh(referral)
    return referral


@router.get("/referrals/{referral_id}", response_model=ReferralRead)
async def get_referral(
    referral_id: int,
    current_user: User = Depends(require_min_role(UserRole.nurse)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Referral).where(Referral.id == referral_id))
    referral = result.scalar_one_or_none()
    if referral is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Referral not found")

    # facility-scoped users can only see referrals involving their facility
    if current_user.facility_id and current_user.facility_id not in (
        referral.referring_facility_id, referral.receiving_facility_id
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return referral


@router.patch("/referrals/{referral_id}/status", response_model=ReferralRead)
async def update_referral_status(
    referral_id: int,
    body: ReferralStatusUpdate,
    current_user: User = Depends(_manager),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Referral).where(Referral.id == referral_id))
    referral = result.scalar_one_or_none()
    if referral is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Referral not found")

    # only the receiving facility can accept/reject; only the referring facility can mark complete
    if body.status in (ReferralStatus.accepted, ReferralStatus.rejected):
        if current_user.facility_id != referral.receiving_facility_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the receiving facility can accept or reject referrals")
    if body.status == ReferralStatus.completed:
        if current_user.facility_id != referral.referring_facility_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the referring facility can mark a referral complete")

    now = datetime.now(timezone.utc)
    referral.status = body.status
    if body.status == ReferralStatus.accepted:
        referral.accepted_at = now
    elif body.status == ReferralStatus.completed:
        referral.completed_at = now

    await db.commit()
    await db.refresh(referral)
    return referral


@router.get("/referrals/outgoing", response_model=list[ReferralRead])
async def list_outgoing_referrals(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(require_min_role(UserRole.nurse)),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.facility_id:
        return []
    stmt = (
        select(Referral)
        .where(Referral.referring_facility_id == current_user.facility_id)
        .order_by(Referral.referred_at.desc())
        .offset(skip)
        .limit(min(limit, 200))
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/referrals/incoming", response_model=list[ReferralRead])
async def list_incoming_referrals(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(_manager),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Referral)
        .where(Referral.receiving_facility_id == current_user.facility_id)
        .order_by(Referral.referred_at.desc())
        .offset(skip)
        .limit(min(limit, 200))
    )
    result = await db.execute(stmt)
    return result.scalars().all()
