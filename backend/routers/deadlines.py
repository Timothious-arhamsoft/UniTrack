from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
import aiosqlite

from fastapi import APIRouter, Depends, HTTPException, status, Query
from models import DeadlineCreate, DeadlineUpdate, DeadlineOut
from database import get_db

router = APIRouter(prefix="/api/deadlines", tags=["deadlines"])

VALID_STATUSES = {
    "confirmed", "coming_soon", "awaiting", "needs_verification",
    "no_info", "check_failed", "passed",
}


def _row_to_deadline(row) -> dict:
    d = dict(row)
    d["needs_review"] = bool(d["needs_review"])
    d["is_archived"] = bool(d["is_archived"])
    return d


@router.get("", response_model=list[DeadlineOut])
async def list_deadlines(
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    archived: bool = Query(False),
    search: Optional[str] = Query(None),
    db: aiosqlite.Connection = Depends(get_db),
):
    conditions = ["is_archived = ?"]
    params: list = [int(archived)]

    if status:
        conditions.append("status = ?")
        params.append(status)
    if category:
        conditions.append("category = ?")
        params.append(category)
    if search:
        conditions.append(
            "(title LIKE ? OR institution LIKE ? OR program LIKE ?)"
        )
        like = f"%{search}%"
        params += [like, like, like]

    where = " AND ".join(conditions)
    async with db.execute(
        f"SELECT * FROM deadlines WHERE {where} ORDER BY deadline_date ASC, created_at DESC",
        params,
    ) as cursor:
        rows = await cursor.fetchall()
    return [_row_to_deadline(r) for r in rows]


@router.post("", response_model=DeadlineOut, status_code=status.HTTP_201_CREATED)
async def create_deadline(
    payload: DeadlineCreate, db: aiosqlite.Connection = Depends(get_db)
):
    now = datetime.now(timezone.utc).isoformat()
    async with db.execute(
        """INSERT INTO deadlines
           (title, category, institution, program, intake, deadline_date,
            date_range_end, timezone_note, status, evidence_text, confidence,
            needs_review, source_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            payload.title,
            payload.category,
            payload.institution,
            payload.program,
            payload.intake,
            payload.deadline_date,
            payload.date_range_end,
            payload.timezone_note,
            payload.status,
            payload.evidence_text,
            payload.confidence,
            int(payload.needs_review),
            payload.source_id,
            now,
            now,
        ),
    ) as cursor:
        deadline_id = cursor.lastrowid
    await db.commit()
    return await _get_deadline_or_404(deadline_id, db)


@router.get("/{deadline_id}", response_model=DeadlineOut)
async def get_deadline(deadline_id: int, db: aiosqlite.Connection = Depends(get_db)):
    return await _get_deadline_or_404(deadline_id, db)


@router.patch("/{deadline_id}", response_model=DeadlineOut)
async def update_deadline(
    deadline_id: int,
    payload: DeadlineUpdate,
    db: aiosqlite.Connection = Depends(get_db),
):
    await _get_deadline_or_404(deadline_id, db)
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        return await _get_deadline_or_404(deadline_id, db)

    for bool_field in ("needs_review", "is_archived"):
        if bool_field in updates:
            updates[bool_field] = int(updates[bool_field])

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [deadline_id]
    await db.execute(f"UPDATE deadlines SET {set_clause} WHERE id = ?", values)
    await db.commit()
    return await _get_deadline_or_404(deadline_id, db)


@router.post("/{deadline_id}/confirm", response_model=DeadlineOut)
async def confirm_deadline(
    deadline_id: int, db: aiosqlite.Connection = Depends(get_db)
):
    dl = await _get_deadline_or_404(deadline_id, db)
    now = datetime.now(timezone.utc).isoformat()
    await db.execute(
        """UPDATE deadlines SET status='confirmed', confidence='high',
           needs_review=0, updated_at=? WHERE id=?""",
        (now, deadline_id),
    )
    await db.commit()
    return await _get_deadline_or_404(deadline_id, db)


@router.post("/{deadline_id}/dismiss", response_model=DeadlineOut)
async def dismiss_deadline(
    deadline_id: int, db: aiosqlite.Connection = Depends(get_db)
):
    await _get_deadline_or_404(deadline_id, db)
    now = datetime.now(timezone.utc).isoformat()
    await db.execute(
        "UPDATE deadlines SET is_archived=1, updated_at=? WHERE id=?",
        (now, deadline_id),
    )
    await db.commit()
    return await _get_deadline_or_404(deadline_id, db)


@router.delete("/{deadline_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_deadline(
    deadline_id: int, db: aiosqlite.Connection = Depends(get_db)
):
    await _get_deadline_or_404(deadline_id, db)
    await db.execute("DELETE FROM deadlines WHERE id = ?", (deadline_id,))
    await db.commit()


async def _get_deadline_or_404(deadline_id: int, db: aiosqlite.Connection) -> dict:
    async with db.execute(
        "SELECT * FROM deadlines WHERE id = ?", (deadline_id,)
    ) as cursor:
        row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Deadline {deadline_id} not found.")
    return _row_to_deadline(row)
