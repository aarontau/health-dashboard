from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import engine
from .routers import auth, consultations, dashboard, patients, referrals, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()


app = FastAPI(
    title="Health Consultation Dashboard API",
    description="Real-time health consultation data for clinic staff through to national level.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(consultations.router)
app.include_router(referrals.router)
app.include_router(dashboard.router)
app.include_router(users.router)


@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok"}
