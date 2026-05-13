from fastapi import APIRouter, Request, HTTPException, Header
from app.services.normalizer import normalize_event
from app.db import get_db
import os

router = APIRouter(prefix="/ingest", tags=["ingest"])

WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "")


@router.post("/event")
async def receive_event(
    request: Request,
    x_warp_secret: str = Header(alias="X-WARP-Secret"),
):
    if x_warp_secret != WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Invalid webhook secret")

    payload = await request.json()
    db = await get_db()
    result = await normalize_event(db, payload)
    return {"status": "ok", "result": result}


@router.post("/backfill")
async def backfill_export(request: Request):
    """
    Accepts raw WhatsApp .txt chat export body.

    Usage:
      curl -X POST https://warp.belavadi.com/ingest/backfill \\
        -H "Content-Type: text/plain" \\
        --data-binary @exported_chat.txt
    """
    body = await request.body()
    text = body.decode("utf-8", errors="replace")
    db = await get_db()
    from app.services.backfill import parse_and_ingest
    count = await parse_and_ingest(db, text)
    return {"status": "ok", "messages_ingested": count}
