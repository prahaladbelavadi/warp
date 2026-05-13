"""
Parse WhatsApp .txt chat export and ingest into archive.

Handles Android/iOS export formats, multi-line messages, and media markers.
"""
import re
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.services.normalizer import ingest_message

TS_PATTERN = re.compile(
    r'^\[?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[APap][Mm])?)\]?\s*[-–]?\s*'
)
LINE_PATTERN = re.compile(
    r'^\[?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[APap][Mm])?)\]?\s*[-–]?\s*([^:]+):\s*(.*)'
)

SKIP_PATTERNS = [
    "Messages and calls are end-to-end encrypted",
    "created group",
    "added",
    "removed",
    "left",
    "changed the subject",
    "changed this group",
    "Your security code",
    "deleted this message",
    "<Media omitted>",
]


def parse_datetime(date_str: str, time_str: str) -> datetime:
    combined = f"{date_str} {time_str}".strip()
    formats = [
        "%d/%m/%Y %H:%M:%S",
        "%d/%m/%Y %H:%M",
        "%m/%d/%y %H:%M:%S",
        "%m/%d/%y %I:%M %p",
        "%m/%d/%y %I:%M:%S %p",
        "%d/%m/%y %H:%M:%S",
        "%d/%m/%y %H:%M",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(combined, fmt)
        except ValueError:
            continue
    raise ValueError(f"Cannot parse datetime: {combined}")


async def parse_and_ingest(db: AsyncIOMotorDatabase, text: str, self_name: str = None) -> int:
    lines = text.splitlines()
    messages = []
    current = None

    for line in lines:
        match = LINE_PATTERN.match(line)
        if match:
            if current:
                messages.append(current)
            date_s, time_s, sender, body = match.groups()
            try:
                ts = parse_datetime(date_s, time_s)
            except ValueError:
                continue

            if any(p in body for p in SKIP_PATTERNS):
                current = None
                continue

            current = {
                "date_str": date_s,
                "time_str": time_s,
                "sender": sender.strip(),
                "body": body.strip(),
                "timestamp_dt": ts,
            }
        else:
            if current and line.strip() and not TS_PATTERN.match(line):
                current["body"] += "\n" + line.strip()

    if current:
        messages.append(current)

    count = 0
    for m in messages:
        sender_number = m["sender"]
        is_self = (self_name and m["sender"] == self_name)
        fake_ts = int(m["timestamp_dt"].timestamp())

        raw = {
            "wa_message_id": f"backfill_{fake_ts}_{hash(m['body'][:50])}",
            "from": sender_number,
            "to": "self",
            "author": sender_number,
            "body": m["body"],
            "type": "text",
            "timestamp": fake_ts,
            "direction": "outbound" if is_self else "inbound",
            "is_group": False,
            "group_id": None,
            "group_name": None,
            "contact_name": m["sender"],
            "contact_number": sender_number,
            "has_media": "<Media omitted>" in m["body"],
            "quoted_message_id": None,
        }

        result = await ingest_message(db, raw, source="backfill")
        if result.get("action") == "inserted":
            count += 1

    return count
