from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..dependencies import require_min_role
from ..models import Facility, FacilityType, UserRole
from ..schemas import FacilityRead

router = APIRouter(tags=["facilities"])


@router.get("/facilities", response_model=list[FacilityRead])
async def list_facilities(
    name: str | None = Query(None, description="Filter by name substring"),
    facility_type: FacilityType | None = None,
    limit: int = Query(50, le=200),
    current_user=Depends(require_min_role(UserRole.nurse)),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Facility).where(Facility.is_active == True)
    if name:
        stmt = stmt.where(Facility.name.ilike(f"%{name}%"))
    if facility_type:
        stmt = stmt.where(Facility.facility_type == facility_type)
    stmt = stmt.order_by(Facility.name).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()
