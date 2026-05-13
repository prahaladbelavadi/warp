from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid


class WARPContact(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    number: str
    name: Optional[str] = None
    display_names: List[str] = []
    first_seen: datetime = Field(default_factory=datetime.utcnow)
    last_seen: datetime = Field(default_factory=datetime.utcnow)
    message_count: int = 0
    groups: List[str] = []
    tier: Optional[str] = None
    is_self: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
