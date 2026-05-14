"""
Standalone APScheduler worker — runs graph recompute jobs on schedule.
Deployed as a separate Railway service sharing the same MongoDB.
graph_engine.py is co-located in this directory so no api dependency is needed.
"""
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from graph_engine import (
    recompute_all_edges,
    assign_contact_tiers,
    compute_30d_rolling,
)

MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DB = os.getenv("MONGODB_DB", "warp")
SELF_NUMBER = os.getenv("SELF_NUMBER", "")

client = AsyncIOMotorClient(MONGODB_URI)
db = client[MONGODB_DB]

_loop = asyncio.new_event_loop()


def _run(coro):
    return _loop.run_until_complete(coro)


def job_recompute_edges():
    print("[WARP Worker] Running edge recompute...")
    result = _run(recompute_all_edges(db))
    print(f"[WARP Worker] Done: {result}")


def job_assign_tiers():
    print("[WARP Worker] Assigning contact tiers...")
    result = _run(assign_contact_tiers(db, SELF_NUMBER))
    print(f"[WARP Worker] Done: {result}")


def job_rolling_30d():
    print("[WARP Worker] Computing 30d rolling counts...")
    result = _run(compute_30d_rolling(db))
    print(f"[WARP Worker] Done: {result}")


if __name__ == "__main__":
    scheduler = BlockingScheduler()

    # Every 6 hours: full edge recompute
    scheduler.add_job(job_recompute_edges, CronTrigger(hour="*/6"))
    # After edge recompute: tier assignment
    scheduler.add_job(job_assign_tiers, CronTrigger(hour="*/6", minute=10))
    # Every 6 hours: rolling 30d window
    scheduler.add_job(job_rolling_30d, CronTrigger(hour="*/6", minute=20))

    print("[WARP Worker] Scheduler started.")
    scheduler.start()
