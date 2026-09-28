from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from routers import sources, deadlines, reminders, settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="UniTrack API",
    description="University admissions & scholarship reminder system",
    version="1.0.0",
    lifespan=lifespan,
)

allowed_origins = os.environ.get(
    "ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sources.router)
app.include_router(deadlines.router)
app.include_router(reminders.router)
app.include_router(settings.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
