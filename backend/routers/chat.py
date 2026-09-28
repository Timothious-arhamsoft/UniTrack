from __future__ import annotations

import os
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import httpx
from fastapi import APIRouter, Depends, HTTPException, status

from database import Database, get_db
from models import (
    ChatSessionOut,
    ChatSessionDetailOut,
    ChatSessionCreate,
    ChatSessionUpdate,
    ChatMessageOut,
    ChatSendMessageRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])


def _get_llm_config() -> tuple[str, str, str]:
    """
    Retrieve LLM configuration.
    Prioritizes HOSTED_BASE_URL, HOSTED_API_KEY, and HOSTED_MODEL (e.g. Groq, Grok).
    Falls back to OPENAI_* or GEMINI_API_KEY.
    """
    base_url = os.environ.get("HOSTED_BASE_URL", "").strip()
    api_key = os.environ.get("HOSTED_API_KEY", "").strip()
    model = os.environ.get("HOSTED_MODEL", "").strip()

    # Fallback to OPENAI env if HOSTED not specified
    if not base_url:
        base_url = os.environ.get("OPENAI_BASE_URL", "").strip()
    if not api_key:
        api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not model:
        model = os.environ.get("OPENAI_MODEL", "").strip()

    # Default fallbacks
    if not base_url:
        base_url = "https://api.groq.com/openai/v1"
    if not model:
        model = "llama-3.3-70b-versatile"

    return base_url.rstrip("/"), api_key, model


async def _generate_system_context(db: Database) -> str:
    """Build a helpful system prompt with UniTrack context and current active deadlines."""
    deadlines = await db.fetchall(
        "SELECT title, category, institution, program, intake, deadline_date, status FROM deadlines WHERE is_archived = 0 ORDER BY deadline_date ASC LIMIT 10"
    )
    sources = await db.fetchall(
        "SELECT name, url, source_type, program_context, intake_year FROM sources WHERE active = 1 LIMIT 10"
    )

    deadlines_summary = ""
    if deadlines:
        deadlines_summary = "Currently tracked deadlines in user's UniTrack app:\n" + "\n".join(
            [
                f"- {d.get('title')} ({d.get('institution') or 'General'}): Due {d.get('deadline_date') or 'TBD'} [Status: {d.get('status')}]"
                for d in deadlines
            ]
        )
    else:
        deadlines_summary = "No deadlines currently saved in user's dashboard."

    sources_summary = ""
    if sources:
        sources_summary = "Tracked sources:\n" + "\n".join(
            [f"- {s.get('name')} ({s.get('url') or 'No URL'}) - {s.get('program_context') or ''}" for s in sources]
        )

    system_prompt = (
        "You are Unibot, an intelligent, friendly AI admissions and scholarship counselor built into UniTrack. "
        "Your mission is to help students track university deadlines, prepare application documents (SOPs, LORs, CVs), "
        "understand admission requirements, find scholarship opportunities, and manage application stress.\n\n"
        f"{deadlines_summary}\n\n"
        f"{sources_summary}\n\n"
        "Guidelines:\n"
        "- Provide concise, well-formatted, helpful responses with markdown formatting (bullet points, bold text).\n"
        "- If asked about the user's deadlines or applications, reference the context above.\n"
        "- Be encouraging, accurate, and practical."
    )
    return system_prompt


@router.get("/sessions", response_model=List[ChatSessionOut])
async def list_chat_sessions(db: Database = Depends(get_db)):
    """List all chat sessions ordered by last update."""
    query = """
        SELECT 
            s.id, 
            s.user_id, 
            s.title, 
            s.created_at, 
            s.updated_at,
            (SELECT content FROM chat_messages m WHERE m.session_id = s.id ORDER BY m.id DESC LIMIT 1) as last_message_excerpt,
            (SELECT COUNT(*) FROM chat_messages m WHERE m.session_id = s.id) as message_count
        FROM chat_sessions s
        ORDER BY s.updated_at DESC
    """
    rows = await db.fetchall(query)
    return [ChatSessionOut(**row) for row in rows]


@router.post("/sessions", response_model=ChatSessionDetailOut)
async def create_chat_session(payload: ChatSessionCreate = ChatSessionCreate(), db: Database = Depends(get_db)):
    """Create a new chat session."""
    now_str = datetime.now(timezone.utc).isoformat()
    title = payload.title.strip() if payload.title else "New Chat"

    session_id = await db.execute(
        "INSERT INTO chat_sessions (title, created_at, updated_at) VALUES (?, ?, ?)",
        [title, now_str, now_str],
    )
    await db.commit()

    if not session_id:
        row = await db.fetchone("SELECT id FROM chat_sessions ORDER BY id DESC LIMIT 1")
        session_id = row["id"] if row else 1

    session = await db.fetchone("SELECT * FROM chat_sessions WHERE id = ?", [session_id])
    return ChatSessionDetailOut(**session, messages=[], message_count=0)


@router.get("/sessions/{session_id}", response_model=ChatSessionDetailOut)
async def get_chat_session(session_id: int, db: Database = Depends(get_db)):
    """Get chat session detail with message history."""
    session = await db.fetchone("SELECT * FROM chat_sessions WHERE id = ?", [session_id])
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    messages_rows = await db.fetchall(
        "SELECT * FROM chat_messages WHERE session_id = ? ORDER BY id ASC",
        [session_id],
    )
    messages = [ChatMessageOut(**m) for m in messages_rows]

    return ChatSessionDetailOut(
        id=session["id"],
        user_id=session.get("user_id"),
        title=session["title"],
        created_at=str(session["created_at"]),
        updated_at=str(session["updated_at"]),
        last_message_excerpt=messages[-1].content if messages else None,
        message_count=len(messages),
        messages=messages,
    )


@router.patch("/sessions/{session_id}", response_model=ChatSessionOut)
async def update_chat_session(session_id: int, payload: ChatSessionUpdate, db: Database = Depends(get_db)):
    """Update chat session title."""
    session = await db.fetchone("SELECT * FROM chat_sessions WHERE id = ?", [session_id])
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    if payload.title is not None:
        now_str = datetime.now(timezone.utc).isoformat()
        await db.execute(
            "UPDATE chat_sessions SET title = ?, updated_at = ? WHERE id = ?",
            [payload.title.strip(), now_str, session_id],
        )
        await db.commit()

    updated = await db.fetchone("SELECT * FROM chat_sessions WHERE id = ?", [session_id])
    return ChatSessionOut(**updated)


@router.delete("/sessions/{session_id}")
async def delete_chat_session(session_id: int, db: Database = Depends(get_db)):
    """Delete a chat session and all associated messages."""
    session = await db.fetchone("SELECT * FROM chat_sessions WHERE id = ?", [session_id])
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    await db.execute("DELETE FROM chat_messages WHERE session_id = ?", [session_id])
    await db.execute("DELETE FROM chat_sessions WHERE id = ?", [session_id])
    await db.commit()
    return {"ok": True, "message": f"Session {session_id} deleted"}


@router.post("/sessions/{session_id}/messages")
async def send_chat_message(
    session_id: int,
    payload: ChatSendMessageRequest,
    db: Database = Depends(get_db),
):
    """Send a user message to Unibot and receive AI response."""
    user_text = payload.content.strip()
    if not user_text:
        raise HTTPException(status_code=400, detail="Message content cannot be empty")

    session = await db.fetchone("SELECT * FROM chat_sessions WHERE id = ?", [session_id])
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    now_str = datetime.now(timezone.utc).isoformat()

    # 1. Store User Message
    user_msg_id = await db.execute(
        "INSERT INTO chat_messages (session_id, role, content, created_at) VALUES (?, ?, ?, ?)",
        [session_id, "user", user_text, now_str],
    )
    await db.commit()

    # 2. Fetch existing history for context
    history_rows = await db.fetchall(
        "SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY id ASC",
        [session_id],
    )

    # 3. Prepare system prompt & messages list
    system_prompt = await _generate_system_context(db)
    api_messages = [{"role": "system", "content": system_prompt}]
    for h in history_rows:
        role = h["role"]
        if role in ["user", "assistant"]:
            api_messages.append({"role": role, "content": h["content"]})

    # 4. Get LLM Credentials
    base_url, api_key, model_name = _get_llm_config()

    if not api_key:
        # Fallback check for GEMINI_API_KEY if HOSTED_API_KEY/OPENAI_API_KEY is missing
        gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()
        if gemini_key:
            try:
                from google import genai
                client = genai.Client(api_key=gemini_key)
                gemini_prompt = system_prompt + "\n\nConversation history:\n"
                for m in api_messages[1:]:
                    gemini_prompt += f"{m['role'].capitalize()}: {m['content']}\n"
                
                resp = client.models.generate_content(
                    model="gemini-1.5-flash",
                    contents=gemini_prompt,
                )
                bot_reply = resp.text.strip() if resp.text else "No response generated."
            except Exception as g_err:
                bot_reply = f"Error with Gemini fallback: {g_err}"
        else:
            bot_reply = (
                "⚠️ **HOSTED_API_KEY is not set.**\n\n"
                "Please configure your `.env` file with:\n"
                "```env\n"
                "HOSTED_BASE_URL=https://api.groq.com/openai/v1\n"
                "HOSTED_API_KEY=your_groq_api_key_here\n"
                "HOSTED_MODEL=llama-3.3-70b-versatile\n"
                "```"
            )
    else:
        # 5. Call OpenAI-compatible Chat Completions API (Groq, OpenAI, etc.)
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        json_body = {
            "model": model_name,
            "messages": api_messages,
            "temperature": 0.7,
            "max_tokens": 1500,
        }

        url = f"{base_url}/chat/completions"
        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                res = await client.post(url, headers=headers, json=json_body)
                if res.status_code == 200:
                    data = res.json()
                    bot_reply = data["choices"][0]["message"]["content"]
                else:
                    err_msg = res.text
                    logger.error(f"LLM API Error ({res.status_code}): {err_msg}")
                    bot_reply = f"⚠️ API Error from provider ({res.status_code}): {err_msg}"
        except Exception as exc:
            logger.error(f"HTTP Connection error to {url}: {exc}")
            bot_reply = f"⚠️ Failed to connect to LLM service at `{base_url}`. Error: {exc}"

    # 6. Save Assistant Response
    bot_msg_id = await db.execute(
        "INSERT INTO chat_messages (session_id, role, content, created_at) VALUES (?, ?, ?, ?)",
        [session_id, "assistant", bot_reply, datetime.now(timezone.utc).isoformat()],
    )

    # 7. Auto-update session title if it is still default
    if session.get("title") in ["New Chat", "Unibot Chat"]:
        new_title = user_text[:35] + ("..." if len(user_text) > 35 else "")
        await db.execute(
            "UPDATE chat_sessions SET title = ?, updated_at = ? WHERE id = ?",
            [new_title, now_str, session_id],
        )
    else:
        await db.execute(
            "UPDATE chat_sessions SET updated_at = ? WHERE id = ?",
            [now_str, session_id],
        )

    await db.commit()

    # Return complete updated session details
    return await get_chat_session(session_id, db)
