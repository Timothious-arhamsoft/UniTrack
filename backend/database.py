import aiosqlite
import os

DB_PATH = os.environ.get("DATABASE_URL", os.path.join(os.path.dirname(__file__), "data", "app.db"))


async def get_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        yield db
    finally:
        await db.close()


async def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    async with aiosqlite.connect(DB_PATH) as db:
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

            CREATE INDEX IF NOT EXISTS idx_deadlines_status ON deadlines(status);
            CREATE INDEX IF NOT EXISTS idx_deadlines_deadline_date ON deadlines(deadline_date);
            CREATE INDEX IF NOT EXISTS idx_reminders_scheduled_at ON reminders(scheduled_at);
            CREATE INDEX IF NOT EXISTS idx_reminders_delivery_status ON reminders(delivery_status);
            CREATE INDEX IF NOT EXISTS idx_page_history_source_id ON page_history(source_id);
        """)
        await db.commit()
