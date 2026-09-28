from __future__ import annotations

import json
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from models import ReminderCreate, ReminderUpdate, ReminderOut
from database import get_db, Database

router = APIRouter(prefix="/api/reminders", tags=["reminders"])


def _row_to_reminder(row) -> dict:
    return dict(row)


def _compute_scheduled_at(deadline_date: str, offset_days: int) -> str:
    """Return ISO timestamp for (deadline_date - offset_days) at 09:00 UTC."""
    dt = datetime.fromisoformat(deadline_date)
    scheduled = dt - timedelta(days=offset_days)
    scheduled = scheduled.replace(hour=9, minute=0, second=0, microsecond=0)
    return scheduled.isoformat()


def _dedup_key(deadline_id: int, offset_days: int, channel: str) -> str:
    return f"dl:{deadline_id}:offset:{offset_days}:ch:{channel}"


@router.get("", response_model=list[ReminderOut])
async def list_reminders(
    due: bool = Query(False),
    deadline_id: Optional[int] = Query(None),
    db: Database = Depends(get_db),
):
    conditions = []
    params: list = []

    if due:
        now = datetime.now(timezone.utc).isoformat()
        conditions.append("scheduled_at <= ? AND delivery_status = 'pending'")
        params.append(now)
    if deadline_id is not None:
        conditions.append("deadline_id = ?")
        params.append(deadline_id)

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    rows = await db.fetchall(
        f"SELECT * FROM reminders {where} ORDER BY scheduled_at ASC",
        params,
    )
    return [_row_to_reminder(r) for r in rows]


@router.post("", response_model=ReminderOut, status_code=status.HTTP_201_CREATED)
async def create_reminder(
    payload: ReminderCreate, db: Database = Depends(get_db)
):
    # Fetch deadline to compute scheduled_at
    dl_row = await db.fetchone(
        "SELECT deadline_date FROM deadlines WHERE id = ?", [payload.deadline_id]
    )

    if not dl_row:
        raise HTTPException(status_code=404, detail="Deadline not found.")

    deadline_date = dl_row["deadline_date"]
    if not deadline_date:
        raise HTTPException(
            status_code=400,
            detail="Cannot schedule a reminder for a deadline with no confirmed date.",
        )

    dedup_key = _dedup_key(payload.deadline_id, payload.offset_days, payload.channel)
    scheduled_at = _compute_scheduled_at(deadline_date, payload.offset_days)
    now = datetime.now(timezone.utc).isoformat()

    try:
        reminder_id = await db.execute(
            """INSERT INTO reminders
               (deadline_id, offset_days, scheduled_at, channel, dedup_key, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            [
                payload.deadline_id,
                payload.offset_days,
                scheduled_at,
                payload.channel,
                dedup_key,
                now,
            ],
        )
        await db.commit()
    except Exception as exc:
        if "UNIQUE" in str(exc).upper():
            raise HTTPException(
                status_code=409,
                detail=f"A reminder with offset {payload.offset_days}d already exists for this deadline.",
            )
        raise

    return await _get_reminder_or_404(reminder_id, db)


@router.patch("/{reminder_id}", response_model=ReminderOut)
async def update_reminder(
    reminder_id: int,
    payload: ReminderUpdate,
    db: Database = Depends(get_db),
):
    reminder = await _get_reminder_or_404(reminder_id, db)
    updates = payload.model_dump(exclude_none=True)

    # If offset_days changes, recompute scheduled_at
    if "offset_days" in updates:
        dl_row = await db.fetchone(
            "SELECT deadline_date FROM deadlines WHERE id = ?",
            [reminder["deadline_id"]],
        )
        if dl_row and dl_row["deadline_date"]:
            updates["scheduled_at"] = _compute_scheduled_at(
                dl_row["deadline_date"], updates["offset_days"]
            )

    if not updates:
        return reminder

    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [reminder_id]
    await db.execute(f"UPDATE reminders SET {set_clause} WHERE id = ?", values)
    await db.commit()
    return await _get_reminder_or_404(reminder_id, db)


@router.post("/{reminder_id}/mark-sent", response_model=ReminderOut)
async def mark_sent(reminder_id: int, db: Database = Depends(get_db)):
    await _get_reminder_or_404(reminder_id, db)
    now = datetime.now(timezone.utc).isoformat()
    await db.execute(
        "UPDATE reminders SET delivery_status='sent', sent_at=? WHERE id=?",
        [now, reminder_id],
    )
    await db.commit()
    return await _get_reminder_or_404(reminder_id, db)


@router.delete("/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reminder(
    reminder_id: int, db: Database = Depends(get_db)
):
    await _get_reminder_or_404(reminder_id, db)
    await db.execute("DELETE FROM reminders WHERE id = ?", [reminder_id])
    await db.commit()


async def _get_reminder_or_404(reminder_id: int, db: Database) -> dict:
    row = await db.fetchone(
        "SELECT * FROM reminders WHERE id = ?", [reminder_id]
    )
    if not row:
        raise HTTPException(status_code=404, detail=f"Reminder {reminder_id} not found.")
    return _row_to_reminder(row)
