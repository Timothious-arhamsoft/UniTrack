import os
import re
import aiosqlite
import asyncpg
from typing import Optional, List, Dict, Any

DATABASE_URL = os.environ.get("DATABASE_URL", "")

IS_POSTGRES = DATABASE_URL.startswith("postgresql://") or DATABASE_URL.startswith("postgres://")

if not IS_POSTGRES and not DATABASE_URL.startswith("sqlite://"):
    SQLITE_PATH = os.path.join(os.path.dirname(__file__), "data", "app.db")
else:
    SQLITE_PATH = DATABASE_URL.replace("sqlite:///", "").replace("sqlite://", "")

pg_pool: Optional[asyncpg.Pool] = None


class Database:
    """Unified Database interface supporting both PostgreSQL (asyncpg) and SQLite (aiosqlite)."""

    def __init__(self, conn: Any, is_postgres: bool):
        self.conn = conn
        self.is_postgres = is_postgres

    def _format_pg_query(self, query: str) -> str:
        """Convert SQLite parameter placeholders (?) to Postgres placeholders ($1, $2, ...)."""
        idx = 1

        def replacer(match):
            nonlocal idx
            res = f"${idx}"
            idx += 1
            return res

        return re.sub(r"\?", replacer, query)

    async def fetchall(self, query: str, params: Optional[List[Any]] = None) -> List[Dict[str, Any]]:
        params = list(params) if params else []
        if self.is_postgres:
            pg_query = self._format_pg_query(query)
            rows = await self.conn.fetch(pg_query, *params)
            return [dict(r) for r in rows]
        else:
            async with self.conn.execute(query, params) as cursor:
                rows = await cursor.fetchall()
            return [dict(r) for r in rows]

    async def fetchone(self, query: str, params: Optional[List[Any]] = None) -> Optional[Dict[str, Any]]:
        params = list(params) if params else []
        if self.is_postgres:
            pg_query = self._format_pg_query(query)
            row = await self.conn.fetchrow(pg_query, *params)
            return dict(row) if row else None
        else:
            async with self.conn.execute(query, params) as cursor:
                row = await cursor.fetchone()
            return dict(row) if row else None

    async def execute(self, query: str, params: Optional[List[Any]] = None) -> Any:
        """Execute a query. If INSERT on PostgreSQL, appends RETURNING id to return inserted ID."""
        params = list(params) if params else []
        if self.is_postgres:
            pg_query = self._format_pg_query(query)
            if pg_query.strip().upper().startswith("INSERT") and "RETURNING" not in pg_query.upper():
                pg_query += " RETURNING id"
                row = await self.conn.fetchrow(pg_query, *params)
                return row["id"] if row and "id" in row else None
            else:
                return await self.conn.execute(pg_query, *params)
        else:
            cursor = await self.conn.execute(query, params)
            return cursor.lastrowid

    async def commit(self):
        if not self.is_postgres:
            await self.conn.commit()


async def get_db():
    if IS_POSTGRES:
        if pg_pool is None:
            raise RuntimeError("PostgreSQL connection pool is not initialized.")
        async with pg_pool.acquire() as conn:
            yield Database(conn, is_postgres=True)
    else:
        os.makedirs(os.path.dirname(SQLITE_PATH), exist_ok=True)
        async with aiosqlite.connect(SQLITE_PATH) as db:
            db.row_factory = aiosqlite.Row
            yield Database(db, is_postgres=False)


async def init_db():
    global pg_pool
    if IS_POSTGRES:
        pg_pool = await asyncpg.create_pool(DATABASE_URL)
        async with pg_pool.acquire() as conn:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS sources (
                    id                  SERIAL PRIMARY KEY,
                    name                TEXT NOT NULL,
                    url                 TEXT,
                    source_type         TEXT NOT NULL DEFAULT 'university',
                    program_context     TEXT,
                    intake_year         TEXT,
                    notes               TEXT,
                    active              INTEGER NOT NULL DEFAULT 1,
                    check_cadence_hours INTEGER NOT NULL DEFAULT 24,
                    last_checked_at     TEXT,
                    last_success_at     TEXT,
                    last_error          TEXT,
                    created_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS deadlines (
                    id              SERIAL PRIMARY KEY,
                    title           TEXT NOT NULL,
                    category        TEXT NOT NULL DEFAULT 'admission',
                    institution     TEXT,
                    program         TEXT,
                    intake          TEXT,
                    deadline_date   TEXT,
                    date_range_end  TEXT,
                    timezone_note   TEXT,
                    status          TEXT NOT NULL DEFAULT 'awaiting',
                    evidence_text   TEXT,
                    confidence      TEXT NOT NULL DEFAULT 'manual',
                    needs_review    INTEGER NOT NULL DEFAULT 0,
                    source_id       INTEGER REFERENCES sources(id) ON DELETE SET NULL,
                    is_archived     INTEGER NOT NULL DEFAULT 0,
                    created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS page_history (
                    id                  SERIAL PRIMARY KEY,
                    source_id           INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
                    fetched_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    status_code         INTEGER,
                    content_fingerprint TEXT,
                    content_text_excerpt TEXT,
                    content_changed     INTEGER NOT NULL DEFAULT 0,
                    error               TEXT
                );

                CREATE TABLE IF NOT EXISTS reminders (
                    id              SERIAL PRIMARY KEY,
                    deadline_id     INTEGER NOT NULL REFERENCES deadlines(id) ON DELETE CASCADE,
                    offset_days     INTEGER NOT NULL,
                    scheduled_at    TEXT NOT NULL,
                    channel         TEXT NOT NULL DEFAULT 'browser',
                    sent_at         TEXT,
                    delivery_status TEXT NOT NULL DEFAULT 'pending',
                    dedup_key       TEXT UNIQUE,
                    created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS settings (
                    id                      INTEGER PRIMARY KEY DEFAULT 1,
                    timezone                TEXT NOT NULL DEFAULT 'Asia/Karachi',
                    default_offsets_days    TEXT NOT NULL DEFAULT '[30,14,7,3,1]',
                    notification_channel    TEXT NOT NULL DEFAULT 'browser',
                    updated_at              TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

                INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

                CREATE TABLE IF NOT EXISTS chat_sessions (
                    id                  SERIAL PRIMARY KEY,
                    user_id             INTEGER,
                    title               TEXT NOT NULL DEFAULT 'New Chat',
                    created_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS chat_messages (
                    id                  SERIAL PRIMARY KEY,
                    session_id          INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
                    role                TEXT NOT NULL,
                    content             TEXT NOT NULL,
                    created_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

                CREATE INDEX IF NOT EXISTS idx_deadlines_status ON deadlines(status);
                CREATE INDEX IF NOT EXISTS idx_deadlines_deadline_date ON deadlines(deadline_date);
                CREATE INDEX IF NOT EXISTS idx_reminders_scheduled_at ON reminders(scheduled_at);
                CREATE INDEX IF NOT EXISTS idx_reminders_delivery_status ON reminders(delivery_status);
                CREATE INDEX IF NOT EXISTS idx_page_history_source_id ON page_history(source_id);
                CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON chat_sessions(updated_at);
                CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
            """)
    else:
        os.makedirs(os.path.dirname(SQLITE_PATH), exist_ok=True)
        async with aiosqlite.connect(SQLITE_PATH) as db:
            await db.executescript("""
                PRAGMA journal_mode=WAL;
                PRAGMA foreign_keys=ON;

                CREATE TABLE IF NOT EXISTS sources (
                    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
                    name                TEXT NOT NULL,
                    url                 TEXT,
                    source_type         TEXT NOT NULL DEFAULT 'university',
                    program_context     TEXT,
                    intake_year         TEXT,
                    notes               TEXT,
                    active              INTEGER NOT NULL DEFAULT 1,
                    check_cadence_hours INTEGER NOT NULL DEFAULT 24,
                    last_checked_at     TEXT,
                    last_success_at     TEXT,
                    last_error          TEXT,
                    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
                    updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
                );

                CREATE TABLE IF NOT EXISTS deadlines (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    title           TEXT NOT NULL,
                    category        TEXT NOT NULL DEFAULT 'admission',
                    institution     TEXT,
                    program         TEXT,
                    intake          TEXT,
                    deadline_date   TEXT,
                    date_range_end  TEXT,
                    timezone_note   TEXT,
                    status          TEXT NOT NULL DEFAULT 'awaiting',
                    evidence_text   TEXT,
                    confidence      TEXT NOT NULL DEFAULT 'manual',
                    needs_review    INTEGER NOT NULL DEFAULT 0,
                    source_id       INTEGER REFERENCES sources(id) ON DELETE SET NULL,
                    is_archived     INTEGER NOT NULL DEFAULT 0,
                    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
                    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
                );

                CREATE TABLE IF NOT EXISTS page_history (
                    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
                    source_id           INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
                    fetched_at          TEXT NOT NULL DEFAULT (datetime('now')),
                    status_code         INTEGER,
                    content_fingerprint TEXT,
                    content_text_excerpt TEXT,
                    content_changed     INTEGER NOT NULL DEFAULT 0,
                    error               TEXT
                );

                CREATE TABLE IF NOT EXISTS reminders (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    deadline_id     INTEGER NOT NULL REFERENCES deadlines(id) ON DELETE CASCADE,
                    offset_days     INTEGER NOT NULL,
                    scheduled_at    TEXT NOT NULL,
                    channel         TEXT NOT NULL DEFAULT 'browser',
                    sent_at         TEXT,
                    delivery_status TEXT NOT NULL DEFAULT 'pending',
                    dedup_key       TEXT UNIQUE,
                    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
                );

                CREATE TABLE IF NOT EXISTS settings (
                    id                      INTEGER PRIMARY KEY DEFAULT 1,
                    timezone                TEXT NOT NULL DEFAULT 'Asia/Karachi',
                    default_offsets_days    TEXT NOT NULL DEFAULT '[30,14,7,3,1]',
                    notification_channel    TEXT NOT NULL DEFAULT 'browser',
                    updated_at              TEXT NOT NULL DEFAULT (datetime('now'))
                );

                INSERT OR IGNORE INTO settings (id) VALUES (1);

                CREATE TABLE IF NOT EXISTS chat_sessions (
                    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id             INTEGER,
                    title               TEXT NOT NULL DEFAULT 'New Chat',
                    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
                    updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
                );

                CREATE TABLE IF NOT EXISTS chat_messages (
                    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id          INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
                    role                TEXT NOT NULL,
                    content             TEXT NOT NULL,
                    created_at          TEXT NOT NULL DEFAULT (datetime('now'))
                );

                CREATE INDEX IF NOT EXISTS idx_deadlines_status ON deadlines(status);
                CREATE INDEX IF NOT EXISTS idx_deadlines_deadline_date ON deadlines(deadline_date);
                CREATE INDEX IF NOT EXISTS idx_reminders_scheduled_at ON reminders(scheduled_at);
                CREATE INDEX IF NOT EXISTS idx_reminders_delivery_status ON reminders(delivery_status);
                CREATE INDEX IF NOT EXISTS idx_page_history_source_id ON page_history(source_id);
                CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON chat_sessions(updated_at);
                CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
            """)
            await db.commit()
            await db.commit()


async def close_db():
    global pg_pool
    if pg_pool is not None:
        await pg_pool.close()
        pg_pool = None
