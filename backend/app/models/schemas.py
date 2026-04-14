from pydantic import BaseModel
from typing import List, Optional


class ImageSize(BaseModel):
    width: int
    height: int


class MaskRLE(BaseModel):
    start_value: int
    runs: List[int]
    shape: List[int]


class SegmentationResponse(BaseModel):
    image_size: ImageSize
    floor_mask_rle: MaskRLE
    floor_corners: List[List[float]]         # [[x,y], ...] 4 corners
    homography_matrix: List[List[float]]     # 3x3 matrix
    depth_map: List[List[int]]               # downsampled uint8 depth

    class Config:
        json_schema_extra = {
            "example": {
                "image_size": {"width": 800, "height": 600},
                "floor_corners": [[100, 300], [700, 300], [800, 600], [0, 600]],
                "homography_matrix": [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
            }
        }


class HealthResponse(BaseModel):
    status: str
    models_loaded: bool
    device: str
