from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
from app.models.message import WARPMessage


async def normalize_event(db: AsyncIOMotorDatabase, payload: dict) -> dict:
    event_type = payload.get("type")

    if event_type in ("message.received", "message.sent"):
        msg_data = payload.get("payload", {})
        return await ingest_message(db, msg_data, source="live")

    if event_type == "session.ready":
        return {"action": "session_ready_logged"}

    return {"action": "ignored", "type": event_type}


async def ingest_message(db: AsyncIOMotorDatabase, raw: dict, source: str = "live") -> dict:
    existing = await db.messages.find_one({"wa_message_id": raw.get("wa_message_id")})
    if existing:
        return {"action": "deduped", "wa_message_id": raw["wa_message_id"]}

    msg = WARPMessage(
        wa_message_id=raw["wa_message_id"],
        from_number=raw["from"],
        to_number=raw["to"],
        author_number=raw.get("author", raw["from"]),
        body=raw.get("body", ""),
        message_type=raw.get("type", "text"),
        timestamp=datetime.utcfromtimestamp(raw["timestamp"]),
        direction=raw.get("direction", "inbound"),
        is_group=raw.get("is_group", False),
        group_id=raw.get("group_id"),
        group_name=raw.get("group_name"),
        contact_name=raw.get("contact_name"),
        contact_number=raw["contact_number"],
        has_media=raw.get("has_media", False),
        quoted_message_id=raw.get("quoted_message_id"),
        source=source,
        raw=raw,
    )

    await db.messages.insert_one(msg.model_dump())

    await upsert_contact(db, msg)
    await update_edge(db, msg)

    _track_ingestion(source, msg)

    return {"action": "inserted", "wa_message_id": msg.wa_message_id}


async def upsert_contact(db: AsyncIOMotorDatabase, msg: WARPMessage):
    number = msg.contact_number
    now = datetime.utcnow()

    update = {
        "$set": {"last_seen": now, "updated_at": now},
        "$setOnInsert": {"first_seen": now, "number": number},
        "$inc": {"message_count": 1},
        "$addToSet": {},
    }

    if msg.contact_name:
        update["$addToSet"]["display_names"] = msg.contact_name

    if msg.is_group and msg.group_id:
        update["$addToSet"]["groups"] = msg.group_id

    if not update["$addToSet"]:
        del update["$addToSet"]

    await db.contacts.update_one(
        {"number": number},
        update,
        upsert=True,
    )


async def update_edge(db: AsyncIOMotorDatabase, msg: WARPMessage):
    now = datetime.utcnow()
    from_n = msg.author_number
    to_n = msg.to_number if not msg.is_group else msg.group_id

    if not from_n or not to_n or from_n == to_n:
        return

    inc_field = "messages_received" if msg.direction == "inbound" else "messages_sent"

    await db.edges.update_one(
        {"from_number": from_n, "to_number": to_n},
        {
            "$inc": {inc_field: 1},
            "$set": {"last_interaction": now, "updated_at": now},
            "$setOnInsert": {
                "from_number": from_n,
                "to_number": to_n,
                "first_interaction": now,
                "created_at": now,
            },
        },
        upsert=True,
    )


def _track_ingestion(source: str, msg: WARPMessage):
    try:
        import posthog
        from app.config import settings
        if settings.POSTHOG_API_KEY:
            posthog.capture("warp-system", "message.ingested", {
                "source": source,
                "is_group": msg.is_group,
                "direction": msg.direction,
            })
    except Exception:
        pass
