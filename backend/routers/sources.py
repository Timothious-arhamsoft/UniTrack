from __future__ import annotations

import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from models import SourceCreate, SourceUpdate, SourceOut, FetchResult, PageHistoryOut
from database import get_db, Database
from fetcher import fetch_url
from extractor import extract_all_from_text

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sources", tags=["sources"])


def _row_to_source(row) -> dict:
    d = dict(row)
    d["active"] = bool(d["active"])
    return d


async def sync_extracted_deadlines(source_id: int, source: dict, extracted: dict, db: Database) -> tuple[dict, int]:
    """Automatically update source card details AND insert/update deadline cards."""
    now = datetime.now(timezone.utc).isoformat()
    today_utc = datetime.now(timezone.utc).date()

    # 1. Update Source card details if provided by AI/Pattern extraction
    source_updates = extracted.get("source_updates", {})
    new_program = source_updates.get("program_context")
    new_intake = source_updates.get("intake_year")
    new_notes = source_updates.get("notes")

    updates_to_make = {}
    if new_program and not source.get("program_context"):
        updates_to_make["program_context"] = new_program
    if new_intake and not source.get("intake_year"):
        updates_to_make["intake_year"] = new_intake
    if new_notes and not source.get("notes"):
        updates_to_make["notes"] = new_notes

    if updates_to_make:
        updates_to_make["updated_at"] = now
        set_clause = ", ".join(f"{k} = ?" for k in updates_to_make)
        values = list(updates_to_make.values()) + [source_id]
        await db.execute(f"UPDATE sources SET {set_clause} WHERE id = ?", values)

    # 2. Sync Deadline cards
    deadlines = extracted.get("deadlines", [])
    deadlines_created = 0

    for item in deadlines:
        title = item.get("title") or f"{source['name']} Deadline"
        deadline_date = item.get("deadline_date")
        if not deadline_date:
            continue

        # Compute status: "awaiting" by default for new deadlines, unless already passed
        try:
            dt_deadline = datetime.fromisoformat(deadline_date).date()
            if dt_deadline < today_utc:
                default_status = "passed"
            else:
                default_status = "awaiting"
        except Exception:
            default_status = "awaiting"

        existing = await db.fetchone(
            """SELECT id, status FROM deadlines WHERE source_id = ? AND (title = ? OR deadline_date = ?)""",
            [source_id, title, deadline_date]
        )

        if existing:
            dl_id = existing["id"]
            # Preserve user's manual status edit if already modified by user
            current_status = existing["status"] if existing["status"] in ["confirmed", "passed", "dismissed"] else default_status
            await db.execute(
                """UPDATE deadlines SET
                   title=?, category=?, institution=?, program=?, intake=?,
                   deadline_date=?, status=?, evidence_text=?, confidence=?,
                   needs_review=0, updated_at=?
                   WHERE id=?""",
                [
                    title,
                    item.get("category", "admission"),
                    item.get("institution", source.get("name")),
                    item.get("program", new_program or source.get("program_context")),
                    item.get("intake", new_intake or source.get("intake_year")),
                    deadline_date,
                    current_status,
                    item.get("evidence_text", ""),
                    item.get("confidence", "high"),
                    now,
                    dl_id,
                ]
            )
        else:
            dl_id = await db.execute(
                """INSERT INTO deadlines
                   (title, category, institution, program, intake, deadline_date,
                    status, evidence_text, confidence, needs_review, source_id, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)""",
                [
                    title,
                    item.get("category", "admission"),
                    item.get("institution", source.get("name")),
                    item.get("program", new_program or source.get("program_context")),
                    item.get("intake", new_intake or source.get("intake_year")),
                    deadline_date,
                    default_status,
                    item.get("evidence_text", ""),
                    item.get("confidence", "high"),
                    source_id,
                    now,
                    now,
                ]
            )
            deadlines_created += 1

        # Auto-create default reminders for this deadline
        settings_row = await db.fetchone("SELECT default_offsets_days, notification_channel FROM settings WHERE id = 1")
        if settings_row and dl_id:
            try:
                offsets = json.loads(settings_row["default_offsets_days"])
                channel = settings_row.get("notification_channel", "browser")
                for offset in offsets:
                    try:
                        dt = datetime.fromisoformat(deadline_date)
                        scheduled = (dt - timedelta(days=offset)).replace(hour=9, minute=0, second=0, microsecond=0).isoformat()
                        dedup = f"dl:{dl_id}:offset:{offset}:ch:{channel}"
                        if db.is_postgres:
                            await db.execute(
                                """INSERT INTO reminders (deadline_id, offset_days, scheduled_at, channel, dedup_key, created_at)
                                   VALUES (?, ?, ?, ?, ?, ?)
                                   ON CONFLICT (dedup_key) DO NOTHING""",
                                [dl_id, offset, scheduled, channel, dedup, now]
                            )
                        else:
                            await db.execute(
                                """INSERT OR IGNORE INTO reminders (deadline_id, offset_days, scheduled_at, channel, dedup_key, created_at)
                                   VALUES (?, ?, ?, ?, ?, ?)""",
                                [dl_id, offset, scheduled, channel, dedup, now]
                            )
                    except Exception as err:
                        logger.warning(f"Reminder error for offset {offset}: {err}")
            except Exception as e:
                logger.warning(f"Failed to auto-create reminders: {e}")

    await db.commit()
    updated_source = await _get_source_or_404(source_id, db)
    return updated_source, deadlines_created


@router.get("", response_model=list[SourceOut])
async def list_sources(db: Database = Depends(get_db)):
    rows = await db.fetchall("SELECT * FROM sources ORDER BY created_at DESC")
    return [_row_to_source(r) for r in rows]


@router.post("", response_model=SourceOut, status_code=status.HTTP_201_CREATED)
async def create_source(
    payload: SourceCreate, db: Database = Depends(get_db)
):
    now = datetime.now(timezone.utc).isoformat()
    source_id = await db.execute(
        """INSERT INTO sources
           (name, url, source_type, program_context, intake_year, notes,
            active, check_cadence_hours, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        [
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
        ],
    )
    await db.commit()
    source = await _get_source_or_404(source_id, db)

    # Immediately fetch & extract deadlines if URL is provided
    if payload.url:
        try:
            result = await fetch_url(payload.url)
            if result["ok"] and result["content_text"]:
                extracted = await extract_all_from_text(result["content_text"], source)
                source, _ = await sync_extracted_deadlines(source_id, source, extracted, db)
        except Exception as exc:
            logger.warning(f"Auto-fetch failed for source {source_id}: {exc}")

    # Ensure at least one corresponding deadline card exists for this new source
    existing_dl = await db.fetchone("SELECT id FROM deadlines WHERE source_id = ?", [source_id])
    if not existing_dl:
        title = f"{payload.name} Application Deadline"
        await db.execute(
            """INSERT INTO deadlines
               (title, category, institution, program, intake, status, confidence, needs_review, source_id, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)""",
            [
                title,
                "admission",
                payload.name,
                payload.program_context or "Degree Program",
                payload.intake_year or "Upcoming Intake",
                "awaiting",
                "high",
                source_id,
                now,
                now,
            ],
        )
        await db.commit()

    return await _get_source_or_404(source_id, db)


@router.get("/{source_id}", response_model=SourceOut)
async def get_source(source_id: int, db: Database = Depends(get_db)):
    return await _get_source_or_404(source_id, db)


@router.patch("/{source_id}", response_model=SourceOut)
async def update_source(
    source_id: int,
    payload: SourceUpdate,
    db: Database = Depends(get_db),
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
async def delete_source(source_id: int, db: Database = Depends(get_db)):
    await _get_source_or_404(source_id, db)
    await db.execute("DELETE FROM sources WHERE id = ?", [source_id])
    await db.commit()


@router.post("/{source_id}/fetch", response_model=FetchResult)
async def trigger_fetch(source_id: int, db: Database = Depends(get_db)):
    source = await _get_source_or_404(source_id, db)
    if not source["url"]:
        raise HTTPException(status_code=400, detail="This source has no URL to fetch.")

    result = await fetch_url(source["url"])

    # Get previous fingerprint
    prev_row = await db.fetchone(
        """SELECT content_fingerprint FROM page_history
           WHERE source_id = ? AND content_fingerprint IS NOT NULL
           ORDER BY fetched_at DESC LIMIT 1""",
        [source_id],
    )

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
        [
            source_id,
            result["fetch_at"],
            result["status_code"],
            result["content_fingerprint"],
            excerpt,
            int(content_changed),
            result["error"],
        ],
    )

    # Update source last_checked_at and error state
    now = datetime.now(timezone.utc).isoformat()
    deadlines_created = 0
    if result["ok"]:
        await db.execute(
            """UPDATE sources SET last_checked_at=?, last_success_at=?,
               last_error=NULL, updated_at=? WHERE id=?""",
            [result["fetch_at"], result["fetch_at"], now, source_id],
        )

        # Run AI & pattern extraction for Source & Deadline cards
        if result.get("content_text"):
            extracted = await extract_all_from_text(result["content_text"], source)
            source, deadlines_created = await sync_extracted_deadlines(source_id, source, extracted, db)
    else:
        await db.execute(
            """UPDATE sources SET last_checked_at=?, last_error=?,
               updated_at=? WHERE id=?""",
            [result["fetch_at"], result["error"], now, source_id],
        )

    await db.commit()

    return FetchResult(
        ok=result["ok"],
        status_code=result["status_code"],
        content_fingerprint=result["content_fingerprint"],
        content_changed=content_changed,
        error=result["error"],
        fetched_at=result["fetch_at"],
        source=source,
        deadlines_created=deadlines_created,
    )


@router.get("/{source_id}/history", response_model=list[PageHistoryOut])
async def get_source_history(
    source_id: int,
    limit: int = 20,
    db: Database = Depends(get_db),
):
    await _get_source_or_404(source_id, db)
    rows = await db.fetchall(
        """SELECT * FROM page_history WHERE source_id = ?
           ORDER BY fetched_at DESC LIMIT ?""",
        [source_id, limit],
    )

    def _row_to_hist(r):
        d = dict(r)
        d["content_changed"] = bool(d["content_changed"])
        return d

    return [_row_to_hist(r) for r in rows]


async def _get_source_or_404(source_id: int, db: Database) -> dict:
    row = await db.fetchone("SELECT * FROM sources WHERE id = ?", [source_id])
    if not row:
        raise HTTPException(status_code=404, detail=f"Source {source_id} not found.")
    return _row_to_source(row)
