import io
from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from PIL import Image

from app.models.schemas import SegmentationResponse
from app.core.pipeline import run_pipeline

router = APIRouter()


@router.post("/segment", response_model=SegmentationResponse)
async def segment_floor(request: Request, file: UploadFile = File(...)):
    """
    Upload a room photo and receive floor segmentation data.

    Returns:
    - Floor mask (RLE encoded)
    - 4 corner points of the floor quad
    - Homography matrix for perspective texture projection
    - Depth map (downsampled)
    """
    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(
            status_code=415,
            detail="Only JPEG, PNG and WebP images are supported",
        )

    contents = await file.read()
    if len(contents) > 20 * 1024 * 1024:  # 20 MB limit
        raise HTTPException(status_code=413, detail="Image too large (max 20 MB)")

    try:
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Could not decode image")

    try:
        result = run_pipeline(image, request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline error: {str(e)}")

    return result
