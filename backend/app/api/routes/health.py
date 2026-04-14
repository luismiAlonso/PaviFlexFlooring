from fastapi import APIRouter, Request
from app.models.schemas import HealthResponse
from app.core.config import settings

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health(request: Request):
    seg_loaded = hasattr(request.app.state, "segmentation") and request.app.state.segmentation._mask_generator is not None
    depth_loaded = hasattr(request.app.state, "depth") and request.app.state.depth._pipe is not None
    return HealthResponse(
        status="ok",
        models_loaded=seg_loaded and depth_loaded,
        device=settings.MODEL_DEVICE,
    )
