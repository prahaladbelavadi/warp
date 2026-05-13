from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings

_client: AsyncIOMotorClient | None = None


async def get_db() -> AsyncIOMotorDatabase:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(settings.MONGODB_URI)
    return _client[settings.MONGODB_DB]


async def ensure_indexes(db: AsyncIOMotorDatabase):
    """Called on startup. Idempotent."""
    # Messages
    await db.messages.create_index("wa_message_id", unique=True)
    await db.messages.create_index("timestamp")
    await db.messages.create_index("contact_number")
    await db.messages.create_index("from_number")
    await db.messages.create_index("direction")
    await db.messages.create_index([("contact_number", 1), ("timestamp", -1)])
    await db.messages.create_index("group_id")

    # Contacts
    await db.contacts.create_index("number", unique=True)
    await db.contacts.create_index("tier")
    await db.contacts.create_index("last_seen")

    # Edges
    await db.edges.create_index(
        [("from_number", 1), ("to_number", 1)],
        unique=True,
    )
    await db.edges.create_index("last_interaction")
    await db.edges.create_index("decay_score")
