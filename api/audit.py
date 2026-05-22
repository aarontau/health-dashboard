from sqlalchemy.ext.asyncio import AsyncSession

from .models import AuditAction, AuditLog


async def log_action(
    db: AsyncSession,
    *,
    user_id: int,
    action: AuditAction,
    table_name: str,
    record_id: int | None = None,
    payload: dict | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> None:
    db.add(AuditLog(
        user_id=user_id,
        action=action,
        table_name=table_name,
        record_id=record_id,
        payload=payload,
        ip_address=ip_address,
        user_agent=user_agent,
    ))
