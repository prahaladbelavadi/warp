from fastapi import APIRouter, Query
from app.db import get_db
from typing import Optional

router = APIRouter(prefix="/messages", tags=["messages"])


@router.get("")
async def list_messages(
    contact: Optional[str] = Query(None),
    direction: Optional[str] = Query(None),
    limit: int = Query(50, le=500),
    skip: int = Query(0),
):
    db = await get_db()
    query = {}
    if contact:
        query["contact_number"] = contact
    if direction:
        query["direction"] = direction

    messages = await db.messages.find(
        query,
        sort=[("timestamp", -1)],
    ).skip(skip).limit(limit).to_list(limit)

    return {"messages": messages, "limit": limit, "skip": skip}
