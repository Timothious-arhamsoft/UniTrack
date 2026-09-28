from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db, close_db
from routers import sources, deadlines, reminders, settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await close_db()


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


@app.get("/api/test-gemini")
async def test_gemini():
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        return {
            "status": "error",
            "message": "GEMINI_API_KEY environment variable is missing or empty in .env.",
            "api_key_set": False
        }

    try:
        from google import genai
        client = genai.Client(api_key=api_key)

        available_models = []
        try:
            model_list = client.models.list()
            for m in model_list:
                name = getattr(m, 'name', getattr(m, 'model', str(m)))
                available_models.append(name)
        except Exception as list_err:
            available_models = [f"Could not list: {list_err}"]

        candidates = []
        for name in available_models:
            if "gemini" in name.lower() and "embed" not in name.lower():
                candidates.append(name)
                # Also try without 'models/' prefix if present
                clean_name = name.replace("models/", "")
                if clean_name not in candidates:
                    candidates.append(clean_name)

        fallback_defaults = [
            "gemini-1.5-flash",
            "gemini-2.5-flash",
            "gemini-2.0-flash",
            "gemini-1.5-pro",
            "models/gemini-1.5-flash",
            "models/gemini-2.5-flash",
        ]
        for def_m in fallback_defaults:
            if def_m not in candidates:
                candidates.append(def_m)

        last_err = None
        for model_name in candidates:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents="Respond with: Gemini API connected!",
                )
                return {
                    "status": "success",
                    "model_used": model_name,
                    "available_models_found": available_models[:15],
                    "response": response.text.strip() if response.text else "No text returned"
                }
            except Exception as exc:
                last_err = str(exc)

        return {
            "status": "error",
            "message": f"Gemini API call failed for candidates {candidates}: {last_err}",
            "available_models_found": available_models,
            "api_key_set": True
        }

    except Exception as exc:
        return {
            "status": "error",
            "message": f"Setup error: {exc}",
            "api_key_set": True
        }

