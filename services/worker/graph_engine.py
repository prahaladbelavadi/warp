"""
P1 Graph Engine — runs on schedule, enriches edges and contacts.

Decay score formula:
  silence_days 0–7   → decay 0.0–0.1   (active)
  silence_days 7–14  → decay 0.1–0.4   (cooling)
  silence_days 14–30 → decay 0.4–0.7   (at risk)
  silence_days 30–60 → decay 0.7–0.9   (dormant)
  silence_days 60+   → decay 0.9–1.0   (lost)

Tier assignment (per contact, looking at strongest edge to self):
  Tier A: last_interaction < 14 days AND reciprocity 0.3–0.7 AND 30d msg count > 10
  Tier B: last_interaction < 45 days AND some reciprocity
  Tier C: everything else
"""
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timedelta
import math


async def recompute_all_edges(db: AsyncIOMotorDatabase) -> dict:
    now = datetime.utcnow()
    updated = 0

    async for edge in db.edges.find({}):
        updates = compute_edge_metrics(edge, now)
        await db.edges.update_one(
            {"_id": edge["_id"]},
            {"$set": {**updates, "updated_at": now}},
        )
        updated += 1

    return {"edges_updated": updated}


def compute_edge_metrics(edge: dict, now: datetime) -> dict:
    last = edge.get("last_interaction") or edge.get("created_at") or now
    if isinstance(last, str):
        last = datetime.fromisoformat(last)

    silence_days = (now - last).days

    sent = edge.get("messages_sent", 0)
    received = edge.get("messages_received", 0)
    total = sent + received

    reciprocity = sent / total if total > 0 else 0.0
    decay = _decay_score(silence_days)

    return {
        "silence_days": silence_days,
        "decay_score": round(decay, 4),
        "reciprocity_ratio": round(reciprocity, 4),
        "last_30d_active": silence_days <= 30,
    }


def _decay_score(days: int) -> float:
    if days <= 0:
        return 0.0
    return round(1 / (1 + math.exp(-0.08 * (days - 25))), 4)


async def assign_contact_tiers(db: AsyncIOMotorDatabase, self_number: str) -> dict:
    now = datetime.utcnow()
    updated = 0

    async for contact in db.contacts.find({"is_self": False}):
        number = contact["number"]

        edge = await db.edges.find_one({
            "$or": [
                {"from_number": self_number, "to_number": number},
                {"from_number": number, "to_number": self_number},
            ]
        })

        if not edge:
            tier = "C"
        else:
            silence = edge.get("silence_days", 999)
            recip = edge.get("reciprocity_ratio", 0)
            msg_30d = edge.get("messages_sent_30d", 0) + edge.get("messages_received_30d", 0)

            if silence < 14 and 0.25 <= recip <= 0.75 and msg_30d >= 5:
                tier = "A"
            elif silence < 45 and (recip > 0.1 or msg_30d > 2):
                tier = "B"
            else:
                tier = "C"

        await db.contacts.update_one(
            {"_id": contact["_id"]},
            {"$set": {"tier": tier, "updated_at": now}},
        )
        updated += 1

    return {"contacts_tiered": updated}


async def compute_30d_rolling(db: AsyncIOMotorDatabase) -> dict:
    now = datetime.utcnow()
    cutoff = now - timedelta(days=30)
    updated = 0

    async for edge in db.edges.find({}):
        from_n = edge["from_number"]
        to_n = edge["to_number"]

        sent_30d = await db.messages.count_documents({
            "author_number": from_n,
            "to_number": to_n,
            "timestamp": {"$gte": cutoff},
        })
        recv_30d = await db.messages.count_documents({
            "author_number": to_n,
            "to_number": from_n,
            "timestamp": {"$gte": cutoff},
        })

        await db.edges.update_one(
            {"_id": edge["_id"]},
            {"$set": {
                "messages_sent_30d": sent_30d,
                "messages_received_30d": recv_30d,
                "updated_at": now,
            }},
        )
        updated += 1

    return {"edges_30d_updated": updated}
