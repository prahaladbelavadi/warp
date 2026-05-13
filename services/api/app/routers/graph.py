from fastapi import APIRouter, Query
from app.db import get_db
from typing import Optional

router = APIRouter(prefix="/graph", tags=["graph"])


@router.get("/summary")
async def graph_summary(tier: Optional[str] = None):
    db = await get_db()

    tier_counts = {}
    for t in ["A", "B", "C"]:
        tier_counts[t] = await db.contacts.count_documents({"tier": t})

    decay_risk = await db.edges.find(
        {"decay_score": {"$gt": 0.4}},
        sort=[("decay_score", -1)],
        limit=10,
    ).to_list(10)

    active = await db.edges.find(
        {"last_30d_active": True},
        sort=[("messages_sent_30d", -1)],
        limit=10,
    ).to_list(10)

    return {
        "tier_counts": tier_counts,
        "decay_risk": decay_risk,
        "most_active_30d": active,
    }


@router.get("/contact/{number}")
async def contact_graph(number: str):
    db = await get_db()

    contact = await db.contacts.find_one({"number": number})
    if not contact:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Contact not found")

    edges = await db.edges.find({
        "$or": [
            {"from_number": number},
            {"to_number": number},
        ]
    }).to_list(100)

    recent_messages = await db.messages.find(
        {"contact_number": number},
        sort=[("timestamp", -1)],
        limit=20,
    ).to_list(20)

    return {
        "contact": contact,
        "edges": edges,
        "recent_messages": recent_messages,
    }


@router.get("/decay-leaderboard")
async def decay_leaderboard(limit: int = Query(20, le=100)):
    db = await get_db()

    pipeline = [
        {"$lookup": {
            "from": "contacts",
            "localField": "from_number",
            "foreignField": "number",
            "as": "contact_info",
        }},
        {"$unwind": {"path": "$contact_info", "preserveNullAndEmptyArrays": True}},
        {"$sort": {"decay_score": -1}},
        {"$limit": limit},
        {"$project": {
            "from_number": 1,
            "to_number": 1,
            "decay_score": 1,
            "silence_days": 1,
            "reciprocity_ratio": 1,
            "last_interaction": 1,
            "contact_info.name": 1,
            "contact_info.tier": 1,
            "contact_info.display_names": 1,
        }},
    ]

    results = await db.edges.aggregate(pipeline).to_list(limit)
    return {"leaderboard": results}
