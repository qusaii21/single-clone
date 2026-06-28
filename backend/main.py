"""
FastAPI application entry point.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database.connection import init_db
from database.seed import seed
from database.connection import AsyncSessionLocal
from routes.auth import router as auth_router
from routes.users import router as users_router
from routes.conversations import router as conversations_router
from routes.messages import router as messages_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up Signal-clone backend…")
    await init_db()
    async with AsyncSessionLocal() as db:
        await seed(db)
    logger.info("Database ready.")
    yield
    logger.info("Shutting down.")


app = FastAPI(
    title="Signal Clone API",
    version="1.0.0",
    description="Backend for a Signal-style secure messaging web app.",
    lifespan=lifespan,
)

# CORS – allow all origins (local dev + Vercel + any deployment)
# allow_credentials must be False when allow_origins=["*"] (browser CORS spec)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(conversations_router, prefix="/api")
app.include_router(messages_router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "signal-clone"}
