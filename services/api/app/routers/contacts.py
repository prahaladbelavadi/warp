from fastapi import APIRouter, Query
from app.db import get_db
from typing import Optional

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.get("")
async def list_contacts(
    tier: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    skip: int = Query(0),
):
    db = await get_db()
    query = {}
    if tier:
        query["tier"] = tier.upper()

    contacts = await db.contacts.find(
        query,
        sort=[("last_seen", -1)],
    ).skip(skip).limit(limit).to_list(limit)

    return {"contacts": contacts, "limit": limit, "skip": skip}


@router.get("/{number}")
async def get_contact(number: str):
    db = await get_db()
    contact = await db.contacts.find_one({"number": number})
    if not contact:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact
