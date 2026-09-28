from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
import aiosqlite

from fastapi import APIRouter, Depends, HTTPException, status
from models import SourceCreate, SourceUpdate, SourceOut, FetchResult, PageHistoryOut
from database import get_db
from fetcher import fetch_url

router = APIRouter(prefix="/api/sources", tags=["sources"])


def _row_to_source(row) -> dict:
    d = dict(row)
    d["active"] = bool(d["active"])
    return d


@router.get("", response_model=list[SourceOut])
async def list_sources(db: aiosqlite.Connection = Depends(get_db)):
    async with db.execute(
        "SELECT * FROM sources ORDER BY created_at DESC"
    ) as cursor:
        rows = await cursor.fetchall()
    return [_row_to_source(r) for r in rows]


@router.post("", response_model=SourceOut, status_code=status.HTTP_201_CREATED)
async def create_source(
    payload: SourceCreate, db: aiosqlite.Connection = Depends(get_db)
):
    now = datetime.now(timezone.utc).isoformat()
    async with db.execute(
        """INSERT INTO sources
           (name, url, source_type, program_context, intake_year, notes,
            active, check_cadence_hours, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            payload.name,
            payload.url,
            payload.source_type,
            payload.program_context,
            payload.intake_year,
            payload.notes,
            int(payload.active),
            payload.check_cadence_hours,
            now,
            now,
        ),
    ) as cursor:
        source_id = cursor.lastrowid
    await db.commit()
    return await _get_source_or_404(source_id, db)


@router.get("/{source_id}", response_model=SourceOut)
async def get_source(source_id: int, db: aiosqlite.Connection = Depends(get_db)):
    return await _get_source_or_404(source_id, db)


@router.patch("/{source_id}", response_model=SourceOut)
async def update_source(
    source_id: int,
    payload: SourceUpdate,
    db: aiosqlite.Connection = Depends(get_db),
):
    await _get_source_or_404(source_id, db)
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        return await _get_source_or_404(source_id, db)

    if "active" in updates:
        updates["active"] = int(updates["active"])

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [source_id]
    await db.execute(f"UPDATE sources SET {set_clause} WHERE id = ?", values)
    await db.commit()
    return await _get_source_or_404(source_id, db)


@router.delete("/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_source(source_id: int, db: aiosqlite.Connection = Depends(get_db)):
    await _get_source_or_404(source_id, db)
    await db.execute("DELETE FROM sources WHERE id = ?", (source_id,))
    await db.commit()


@router.post("/{source_id}/fetch", response_model=FetchResult)
async def trigger_fetch(source_id: int, db: aiosqlite.Connection = Depends(get_db)):
    source = await _get_source_or_404(source_id, db)
    if not source["url"]:
        raise HTTPException(status_code=400, detail="This source has no URL to fetch.")

    result = await fetch_url(source["url"])

    # Get previous fingerprint
    async with db.execute(
        """SELECT content_fingerprint FROM page_history
           WHERE source_id = ? AND content_fingerprint IS NOT NULL
           ORDER BY fetched_at DESC LIMIT 1""",
        (source_id,),
    ) as cursor:
        prev_row = await cursor.fetchone()

    prev_fingerprint = prev_row["content_fingerprint"] if prev_row else None
    content_changed = (
        result["content_fingerprint"] is not None
        and result["content_fingerprint"] != prev_fingerprint
    )

    # Record in page_history
    excerpt = (result.get("content_text") or "")[:2000]
    await db.execute(
        """INSERT INTO page_history
           (source_id, fetched_at, status_code, content_fingerprint,
            content_text_excerpt, content_changed, error)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (
            source_id,
            result["fetch_at"],
            result["status_code"],
            result["content_fingerprint"],
            excerpt,
            int(content_changed),
            result["error"],
        ),
    )

    # Update source last_checked_at and error state
    now = datetime.now(timezone.utc).isoformat()
    if result["ok"]:
        await db.execute(
            """UPDATE sources SET last_checked_at=?, last_success_at=?,
               last_error=NULL, updated_at=? WHERE id=?""",
            (result["fetch_at"], result["fetch_at"], now, source_id),
        )
    else:
        await db.execute(
            """UPDATE sources SET last_checked_at=?, last_error=?,
               updated_at=? WHERE id=?""",
            (result["fetch_at"], result["error"], now, source_id),
        )

    await db.commit()

    return FetchResult(
        ok=result["ok"],
        status_code=result["status_code"],
        content_fingerprint=result["content_fingerprint"],
        content_changed=content_changed,
        error=result["error"],
        fetched_at=result["fetch_at"],
    )


@router.get("/{source_id}/history", response_model=list[PageHistoryOut])
async def get_source_history(
    source_id: int,
    limit: int = 20,
    db: aiosqlite.Connection = Depends(get_db),
):
    await _get_source_or_404(source_id, db)
    async with db.execute(
        """SELECT * FROM page_history WHERE source_id = ?
           ORDER BY fetched_at DESC LIMIT ?""",
        (source_id, limit),
    ) as cursor:
        rows = await cursor.fetchall()

    def _row_to_hist(r):
        d = dict(r)
        d["content_changed"] = bool(d["content_changed"])
        return d

    return [_row_to_hist(r) for r in rows]


async def _get_source_or_404(source_id: int, db: aiosqlite.Connection) -> dict:
    async with db.execute("SELECT * FROM sources WHERE id = ?", (source_id,)) as cursor:
        row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Source {source_id} not found.")
    return _row_to_source(row)
