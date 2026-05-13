from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid


class WARPMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    wa_message_id: str
    from_number: str
    to_number: str
    author_number: str
    body: str
    message_type: str
    timestamp: datetime
    direction: str
    is_group: bool
    group_id: Optional[str] = None
    group_name: Optional[str] = None
    contact_name: Optional[str] = None
    contact_number: str
    has_media: bool = False
    quoted_message_id: Optional[str] = None
    source: str = "live"
    raw: Optional[dict] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
