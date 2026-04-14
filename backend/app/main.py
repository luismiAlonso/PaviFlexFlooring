from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.api.routes import segmentation, health


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm up models on startup so first request is fast
    from app.services.segmentation import SegmentationService
    from app.services.depth import DepthService
    app.state.segmentation = SegmentationService()
    app.state.depth = DepthService()
    yield
    # Cleanup on shutdown
    del app.state.segmentation
    del app.state.depth


app = FastAPI(
    title="PaviFlexFlooring API",
    description="Floor segmentation and texture visualization API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(segmentation.router, prefix="/api", tags=["segmentation"])
