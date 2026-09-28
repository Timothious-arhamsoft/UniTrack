"""
AI & Rule-Based Deadline & Source Details Extractor for UniTrack.

Supports:
1. OpenAI API (if OPENAI_API_KEY is present)
2. Google Gemini API (if GEMINI_API_KEY is present)
3. Fast Local Pattern Parser (Fallback)
"""

from __future__ import annotations

import os
import re
import json
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import httpx

logger = logging.getLogger(__name__)

MONTH_MAP = {
    "january": 1, "jan": 1, "januar": 1,
    "february": 2, "feb": 2, "februar": 2,
    "march": 3, "mar": 3, "märz": 3, "maerz": 3,
    "april": 4, "apr": 4,
    "may": 5, "mai": 5,
    "june": 6, "jun": 6, "juni": 6,
    "july": 7, "jul": 7, "juli": 7,
    "august": 8, "aug": 8,
    "september": 9, "sep": 9, "sept": 9,
    "october": 10, "oct": 10, "oktober": 10,
    "november": 11, "nov": 11,
    "december": 12, "dec": 12, "dezember": 12,
}


async def extract_all_from_text(text: str, source_info: Dict[str, Any]) -> Dict[str, Any]:
    if not text or not text.strip():
        return {"source_updates": {}, "deadlines": []}

    # 1. Try OpenAI API if key is present
    openai_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if openai_key:
        try:
            res = await _extract_with_openai(text, source_info, openai_key)
            if res and (res.get("deadlines") or res.get("source_updates")):
                return res
        except Exception as exc:
            logger.warning(f"OpenAI extraction failed: {exc}")

    # 2. Try Gemini API if key is present
    gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if gemini_key:
        try:
            res = await _extract_with_gemini(text, source_info, gemini_key)
            if res and (res.get("deadlines") or res.get("source_updates")):
                return res
        except Exception as exc:
            logger.warning(f"Gemini API extraction failed: {exc}")

    # 3. Fallback Pattern Parser
    return _extract_with_patterns(text, source_info)


async def _extract_with_openai(text: str, source_info: Dict[str, Any], api_key: str) -> Dict[str, Any]:
    university_name = source_info.get("name", "University")
    program = source_info.get("program_context", "")
    intake = source_info.get("intake_year", "")
    current_year = datetime.now().year

    model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
    base_url = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")

    prompt = f"""
Analyze admissions webpage text for {university_name}.
Current Program Context: "{program}"
Current Intake: "{intake}"
Current Year: {current_year}

Extract:
1. Program / Degree Name and Intake Year.
2. Application deadlines (converted to YYYY-MM-DD).

Return JSON only:
{{
  "source_updates": {{
    "program_context": "Degree Name",
    "intake_year": "{current_year + 1}",
    "notes": "Short summary"
  }},
  "deadlines": [
    {{
      "title": "Winter Semester Application Deadline (non-EU)",
      "category": "admission",
      "institution": "{university_name}",
      "program": "Degree Name",
      "intake": "Winter {current_year + 1}",
      "deadline_date": "YYYY-MM-DD",
      "evidence_text": "Exact text quote",
      "confidence": "high"
    }}
  ]
}}

Text:
\"\"\"
{text[:12000]}
\"\"\"
"""

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    body = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You extract university admission dates into JSON."},
            {"role": "user", "content": prompt}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.1
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(f"{base_url}/chat/completions", headers=headers, json=body)
        if resp.status_code == 200:
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            return json.loads(content)
        else:
            logger.warning(f"OpenAI error response: {resp.status_code} {resp.text}")

    return {"source_updates": {}, "deadlines": []}


async def _extract_with_gemini(text: str, source_info: Dict[str, Any], api_key: str) -> Dict[str, Any]:
    try:
        from google import genai
        from google.genai import types
        import asyncio

        client = genai.Client(api_key=api_key)
    except ImportError:
        logger.warning("google-genai SDK not installed.")
        return {"source_updates": {}, "deadlines": []}

    university_name = source_info.get("name", "University")
    program = source_info.get("program_context", "")
    intake = source_info.get("intake_year", "")
    current_year = datetime.now().year

    prompt = f"""
You are an expert university admissions parser.
Analyze the text extracted from a university webpage for: {university_name}.

Current Program Context in system: "{program}"
Current Intake in system: "{intake}"
Current Year: {current_year}

Task:
1. Extract exact Program / Degree Name and Intake Year.
2. Extract all application deadlines (converted to YYYY-MM-DD).

Return ONLY a JSON object:
{{
  "source_updates": {{
    "program_context": "Degree Name",
    "intake_year": "{current_year + 1}",
    "notes": "Short summary of admissions page"
  }},
  "deadlines": [
    {{
      "title": "Winter Semester Application Deadline (non-EU)",
      "category": "admission",
      "institution": "{university_name}",
      "program": "Degree Name",
      "intake": "Winter {current_year + 1}",
      "deadline_date": "YYYY-MM-DD",
      "evidence_text": "Exact quote from webpage proving this deadline date",
      "confidence": "high"
    }}
  ]
}}

Webpage Content:
\"\"\"
{text[:12000]}
\"\"\"
"""

    models_to_try = [
        "gemini-1.5-flash-latest",
        "gemini-2.0-flash-exp",
        "gemini-1.5-pro-latest",
        "models/gemini-1.5-flash-latest",
        "models/gemini-1.5-flash",
    ]

    raw_json = None
    for model_name in models_to_try:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                ),
            )
            if response.text:
                raw_json = response.text.strip()
                logger.info(f"Successfully extracted using model: {model_name}")
                break
        except Exception as exc:
            exc_str = str(exc)
            logger.warning(f"Model {model_name} failed: {exc_str}")

    if not raw_json:
        return {"source_updates": {}, "deadlines": []}

    if raw_json.startswith("```json"):
        raw_json = raw_json[7:]
    if raw_json.startswith("```"):
        raw_json = raw_json[3:]
    if raw_json.endswith("```"):
        raw_json = raw_json[:-3]

    try:
        parsed = json.loads(raw_json.strip())
        if isinstance(parsed, dict):
            return parsed
    except Exception as exc:
        logger.warning(f"Failed to parse Gemini JSON: {exc}")

    return {"source_updates": {}, "deadlines": []}


def _extract_with_patterns(text: str, source_info: Dict[str, Any]) -> Dict[str, Any]:
    lines = [line.strip() for line in text.split("\n") if line.strip()]

    university_name = source_info.get("name", "University")
    existing_program = source_info.get("program_context", "")
    existing_intake = source_info.get("intake_year", "")
    current_year = datetime.now().year

    detected_program = existing_program
    for line in lines[:30]:
        line_clean = re.sub(r"[^\w\s\-\(\)]", "", line)
        if any(kw in line_clean.lower() for kw in ["master", "bachelor", "m.sc", "b.sc", "phd", "degree", "computer science", "data science"]):
            if 5 < len(line_clean) < 100:
                detected_program = line_clean.strip()
                break

    # Date Range Pattern (e.g. "1 March - 15 August" or "1 November - 15 January")
    range_pattern = re.compile(
        r"(\d{1,2})\.?\s*(january|januar|february|februar|march|märz|maerz|april|may|mai|june|juni|july|juli|august|september|october|oktober|november|december|dezember)?\s*(?:-|to|bis|until)\s*(\d{1,2})\.?\s*(january|januar|february|februar|march|märz|maerz|april|may|mai|june|juni|july|juli|august|september|october|oktober|november|december|dezember)\b",
        re.IGNORECASE
    )

    # Single Date Pattern (e.g. "15 August" or "15.08." or "July 15")
    single_pattern = re.compile(
        r"(\d{1,2})\.?\s*(january|januar|february|februar|march|märz|maerz|april|may|mai|june|juni|july|juli|august|september|october|oktober|november|december|dezember)\b",
        re.IGNORECASE
    )

    extracted_deadlines = []
    seen_keys = set()

    for idx, line in enumerate(lines):
        context_snippet = " ".join(lines[max(0, idx - 3):min(len(lines), idx + 4)])
        context_lower = context_snippet.lower()

        non_eu = "non-eu" in context_lower or "non eu" in context_lower or "third country" in context_lower
        eu = ("eu countries" in context_lower or "eu applicants" in context_lower or "citizens" in context_lower) and not non_eu
        winter = "winter" in context_lower or "wintersemester" in context_lower or "fall" in context_lower
        summer = "summer" in context_lower or "sommersemester" in context_lower or "spring" in context_lower

        # First check range matches
        range_matches = range_pattern.findall(line)
        found_dates = []

        if range_matches:
            for start_day, start_month, end_day, end_month in range_matches:
                # Range deadline is the end date
                found_dates.append((end_day, end_month))
        else:
            single_matches = single_pattern.findall(line)
            for day_str, month_str in single_matches:
                found_dates.append((day_str, month_str))

        for day_str, month_str in found_dates:
            month_num = MONTH_MAP.get(month_str.lower())
            if not month_num:
                continue

            day_num = int(day_str)
            now = datetime.now()
            target_year = current_year
            if month_num < now.month or (month_num == now.month and day_num < now.day):
                target_year = current_year + 1

            formatted_date = f"{target_year:04d}-{month_num:02d}-{day_num:02d}"

            key = (formatted_date, "non_eu" if non_eu else ("eu" if eu else "gen"), "winter" if winter else ("summer" if summer else "gen"))
            if key in seen_keys:
                continue
            seen_keys.add(key)

            title_parts = [university_name]
            if winter:
                title_parts.append("Winter Semester")
            elif summer:
                title_parts.append("Summer Semester")

            if non_eu:
                title_parts.append("Application Deadline (Non-EU)")
            elif eu:
                title_parts.append("Application Deadline (EU)")
            else:
                title_parts.append(f"Application Deadline ({month_str.capitalize()} {day_num})")

            title = " - ".join(title_parts)

            extracted_deadlines.append({
                "title": title,
                "category": "admission",
                "institution": university_name,
                "program": detected_program or existing_program or "Degree Program",
                "intake": f"{'Winter' if winter else ('Summer' if summer else 'Fall')} {target_year}",
                "deadline_date": formatted_date,
                "evidence_text": context_snippet[:400],
                "confidence": "high",
            })

    return {
        "source_updates": {
            "program_context": detected_program or existing_program,
            "intake_year": existing_intake or str(current_year + 1),
            "notes": f"Scraped & extracted {len(extracted_deadlines)} application deadline(s)."
        },
        "deadlines": extracted_deadlines
    }
