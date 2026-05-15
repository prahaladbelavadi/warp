from fastapi import APIRouter
from app.db import get_db
import httpx
import os

router = APIRouter(prefix="/status", tags=["status"])

WA_LISTENER_URL = os.getenv("WA_LISTENER_URL", "http://warp-wa-listener.railway.internal:3000")


@router.get("")
async def get_status():
    db = await get_db()

    message_count = await db.messages.count_documents({})
    contact_count = await db.contacts.count_documents({})
    edge_count = await db.edges.count_documents({})

    backfill_count = await db.messages.count_documents({"source": "backfill"})
    live_count = await db.messages.count_documents({"source": "live"})

    wa_status = await _fetch_wa_status()

    return {
        "archive": {
            "messages": message_count,
            "contacts": contact_count,
            "edges": edge_count,
            "backfill_messages": backfill_count,
            "live_messages": live_count,
        },
        "wa": wa_status,
    }


async def _fetch_wa_status() -> dict:
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.get(f"{WA_LISTENER_URL}/status")
            return r.json()
    except Exception:
        return {
            "sessionStatus": "unknown",
            "loadingPercent": 0,
            "loadingMessage": "",
            "ready": False,
            "connectedAt": None,
        }
