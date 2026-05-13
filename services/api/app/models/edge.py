from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid


class WARPEdge(BaseModel):
    """
    Directed edge between two contacts.
    One edge per ordered pair (from_number, to_number).
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    from_number: str
    to_number: str

    messages_sent: int = 0
    messages_received: int = 0

    first_interaction: datetime = Field(default_factory=datetime.utcnow)
    last_interaction: datetime = Field(default_factory=datetime.utcnow)
    last_initiated_by: Optional[str] = None

    reciprocity_ratio: float = 0.0
    avg_response_latency_seconds: Optional[float] = None
    initiation_count_self: int = 0
    initiation_count_them: int = 0

    messages_sent_30d: int = 0
    messages_received_30d: int = 0
    last_30d_active: bool = False

    silence_days: int = 0
    decay_score: float = 0.0

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
