from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.db import get_db, ensure_indexes
from app.routers import ingest, contacts, messages, graph
from app.config import settings
import posthog


@asynccontextmanager
async def lifespan(app: FastAPI):
    db = await get_db()
    await ensure_indexes(db)
    if settings.POSTHOG_API_KEY:
        posthog.project_api_key = settings.POSTHOG_API_KEY
        posthog.host = settings.POSTHOG_HOST
    yield


app = FastAPI(title="WARP API", version="0.1.0", lifespan=lifespan)

app.include_router(ingest.router)
app.include_router(contacts.router)
app.include_router(messages.router)
app.include_router(graph.router)


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}
