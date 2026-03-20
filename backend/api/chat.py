"""AI Chat API."""
import logging
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter()

SYSTEM = """Ти — AI-асистент промислового каталогу TI-Katalog. 
Допомагаєш знайти гідравлічні компоненти, манометри, шланги, фітинги, насоси, ущільнення.
Відповідай коротко і по суті українською мовою. Якщо запитують конкретний товар — рекомендуй пошук."""


class ChatRequest(BaseModel):
    message: str
    history: list = []


@router.post("/")
async def chat(req: ChatRequest):
    key = os.getenv("ANTHROPIC_API_KEY", "")
    if not key:
        raise HTTPException(503, "API key not configured")
    try:
        import httpx
        messages = req.history[-6:] + [{"role": "user", "content": req.message}]
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.post(
                "https://api.anthropic.com/v1/messages",
                headers={"x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
                json={"model": "claude-haiku-4-5-20251001", "max_tokens": 400,
                      "system": SYSTEM, "messages": messages},
            )
            r.raise_for_status()
        reply = r.json()["content"][0]["text"]
        return {"reply": reply}
    except Exception as e:
        raise HTTPException(500, str(e))
