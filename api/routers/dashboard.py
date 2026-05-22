from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..dependencies import ROLE_LEVEL, get_current_user, require_min_role
from ..models import User, UserRole

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


# ---------------------------------------------------------------------------
# Facility daily summary — nurses, doctors, facility managers
# ---------------------------------------------------------------------------

@router.get("/facility")
async def facility_dashboard(
    current_user: User = Depends(require_min_role(UserRole.nurse)),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.facility_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No facility assigned to this account")

    rows = await db.execute(
        text("""
            SELECT *
            FROM v_facility_daily_summary
            WHERE facility_id = :fid
            ORDER BY consultation_date DESC
            LIMIT 30
        """),
        {"fid": current_user.facility_id},
    )
    return rows.mappings().all()


# ---------------------------------------------------------------------------
# District disease burden — district officers and above
# ---------------------------------------------------------------------------

@router.get("/district/{district_id}")
async def district_dashboard(
    district_id: int,
    current_user: User = Depends(require_min_role(UserRole.district_officer)),
    db: AsyncSession = Depends(get_db),
):
    # district officers are scoped to their own district
    if (
        current_user.role == UserRole.district_officer
        and current_user.district_id != district_id
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access to this district is denied")

    rows = await db.execute(
        text("""
            SELECT *
            FROM v_district_disease_burden
            WHERE district_id = :did
            ORDER BY case_count DESC
        """),
        {"did": district_id},
    )
    return rows.mappings().all()


# ---------------------------------------------------------------------------
# Provincial facility load — provincial officers and above
# ---------------------------------------------------------------------------

@router.get("/province/{province_id}")
async def province_dashboard(
    province_id: int,
    current_user: User = Depends(require_min_role(UserRole.provincial_officer)),
    db: AsyncSession = Depends(get_db),
):
    if (
        current_user.role == UserRole.provincial_officer
        and current_user.province_id != province_id
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access to this province is denied")

    rows = await db.execute(
        text("""
            SELECT *
            FROM v_provincial_facility_load
            WHERE province_id = :pid
            ORDER BY month DESC, consultations DESC
        """),
        {"pid": province_id},
    )
    return rows.mappings().all()


# ---------------------------------------------------------------------------
# National summary — national officers and the Minister
# ---------------------------------------------------------------------------

@router.get("/national")
async def national_dashboard(
    current_user: User = Depends(require_min_role(UserRole.national_officer)),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.execute(
        text("""
            SELECT *
            FROM v_national_province_summary
            ORDER BY month DESC, total_consultations DESC
        """)
    )
    return rows.mappings().all()
