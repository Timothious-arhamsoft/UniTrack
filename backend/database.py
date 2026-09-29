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
    else:
        # Nothing to initialize for SQLite.
        os.makedirs(os.path.dirname(SQLITE_PATH), exist_ok=True)


async def close_db():
    global pg_pool
    if pg_pool is not None:
        await pg_pool.close()
        pg_pool = None
