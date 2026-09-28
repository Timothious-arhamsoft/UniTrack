from __future__ import annotations
from typing import Optional, List
from pydantic import BaseModel, HttpUrl
from datetime import datetime


# ─── Source ──────────────────────────────────────────────────────────────────

class SourceCreate(BaseModel):
    name: str
    url: Optional[str] = None
    source_type: str = "university"
    program_context: Optional[str] = None
    intake_year: Optional[str] = None
    notes: Optional[str] = None
    active: bool = True
    check_cadence_hours: int = 24


class SourceUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    source_type: Optional[str] = None
    program_context: Optional[str] = None
    intake_year: Optional[str] = None
    notes: Optional[str] = None
    active: Optional[bool] = None
    check_cadence_hours: Optional[int] = None


class SourceOut(BaseModel):
    id: int
    name: str
    url: Optional[str]
    source_type: str
    program_context: Optional[str]
    intake_year: Optional[str]
    notes: Optional[str]
    active: bool
    check_cadence_hours: int
    last_checked_at: Optional[str]
    last_success_at: Optional[str]
    last_error: Optional[str]
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


# ─── Deadline ─────────────────────────────────────────────────────────────────

class DeadlineCreate(BaseModel):
    title: str
    category: str = "admission"
    institution: Optional[str] = None
    program: Optional[str] = None
    intake: Optional[str] = None
    deadline_date: Optional[str] = None
    date_range_end: Optional[str] = None
    timezone_note: Optional[str] = None
    status: str = "awaiting"
    evidence_text: Optional[str] = None
    confidence: str = "manual"
    needs_review: bool = False
    source_id: Optional[int] = None


class DeadlineUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    institution: Optional[str] = None
    program: Optional[str] = None
    intake: Optional[str] = None
    deadline_date: Optional[str] = None
    date_range_end: Optional[str] = None
    timezone_note: Optional[str] = None
    status: Optional[str] = None
    evidence_text: Optional[str] = None
    confidence: Optional[str] = None
    needs_review: Optional[bool] = None
    source_id: Optional[int] = None
    is_archived: Optional[bool] = None


class DeadlineOut(BaseModel):
    id: int
    title: str
    category: str
    institution: Optional[str]
    program: Optional[str]
    intake: Optional[str]
    deadline_date: Optional[str]
    date_range_end: Optional[str]
    timezone_note: Optional[str]
    status: str
    evidence_text: Optional[str]
    confidence: str
    needs_review: bool
    source_id: Optional[int]
    is_archived: bool
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


# ─── Page History ─────────────────────────────────────────────────────────────

class PageHistoryOut(BaseModel):
    id: int
    source_id: int
    fetched_at: str
    status_code: Optional[int]
    content_fingerprint: Optional[str]
    content_text_excerpt: Optional[str]
    content_changed: bool
    error: Optional[str]

    class Config:
        from_attributes = True


# ─── Reminder ─────────────────────────────────────────────────────────────────

class ReminderCreate(BaseModel):
    deadline_id: int
    offset_days: int
    channel: str = "browser"


class ReminderUpdate(BaseModel):
    offset_days: Optional[int] = None
    channel: Optional[str] = None
    delivery_status: Optional[str] = None


class ReminderOut(BaseModel):
    id: int
    deadline_id: int
    offset_days: int
    scheduled_at: str
    channel: str
    sent_at: Optional[str]
    delivery_status: str
    dedup_key: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


# ─── Settings ─────────────────────────────────────────────────────────────────

class SettingsUpdate(BaseModel):
    timezone: Optional[str] = None
    default_offsets_days: Optional[List[int]] = None
    notification_channel: Optional[str] = None


class SettingsOut(BaseModel):
    id: int
    timezone: str
    default_offsets_days: List[int]
    notification_channel: str
    updated_at: str

    class Config:
        from_attributes = True


# ─── Fetch Result ─────────────────────────────────────────────────────────────

class FetchResult(BaseModel):
    ok: bool
    status_code: Optional[int] = None
    content_fingerprint: Optional[str] = None
    content_changed: bool = False
    error: Optional[str] = None
    fetched_at: str
    source: Optional[SourceOut] = None
    deadlines_created: int = 0

