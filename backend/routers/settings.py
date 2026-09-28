from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from models import SettingsUpdate, SettingsOut
from database import get_db, Database

router = APIRouter(prefix="/api/settings", tags=["settings"])


def _row_to_settings(row) -> dict:
    d = dict(row)
    try:
        d["default_offsets_days"] = json.loads(d["default_offsets_days"])
    except (json.JSONDecodeError, TypeError):
        d["default_offsets_days"] = [30, 14, 7, 3, 1]
    return d


@router.get("", response_model=SettingsOut)
async def get_settings(db: Database = Depends(get_db)):
    row = await db.fetchone("SELECT * FROM settings WHERE id = 1")
    return _row_to_settings(row)


@router.put("", response_model=SettingsOut)
async def update_settings(
    payload: SettingsUpdate, db: Database = Depends(get_db)
):
    updates = payload.model_dump(exclude_none=True)
    if "default_offsets_days" in updates:
        updates["default_offsets_days"] = json.dumps(updates["default_offsets_days"])

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [1]
    await db.execute(f"UPDATE settings SET {set_clause} WHERE id = ?", values)
    await db.commit()

    row = await db.fetchone("SELECT * FROM settings WHERE id = 1")
    return _row_to_settings(row)
