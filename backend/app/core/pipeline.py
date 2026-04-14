"""
Main AI pipeline: image -> floor mask -> homography -> response.

Flow:
  1. Resize input image to MAX_IMAGE_SIZE
  2. Run SAM 2 to get floor segment mask
  3. Run Depth Anything v2 to get depth map
  4. Use OpenCV to compute homography / perspective corners from mask
  5. Return mask polygon + homography matrix + depth map
"""

import numpy as np
import cv2
from PIL import Image
from fastapi import Request

from app.core.config import settings
from app.services.homography import compute_floor_homography


def run_pipeline(image: Image.Image, request: Request) -> dict:
    """
    Full V1 pipeline on a PIL image.
    Returns JSON-serializable dict with mask, corners and depth.
    """
    # 1. Resize
    image = _resize(image)
    img_array = np.array(image)

    # 2. Segment floor
    seg_service = request.app.state.segmentation
    mask: np.ndarray = seg_service.segment_floor(img_array)

    # 3. Depth
    depth_service = request.app.state.depth
    depth_map: np.ndarray = depth_service.estimate(img_array)

    # 4. Homography corners from mask
    corners, homography_matrix = compute_floor_homography(mask)

    # 5. Encode results
    mask_rle = _mask_to_rle(mask)
    depth_normalized = _normalize_depth(depth_map)

    return {
        "image_size": {"width": img_array.shape[1], "height": img_array.shape[0]},
        "floor_mask_rle": mask_rle,
        "floor_corners": corners.tolist() if corners is not None else [],
        "homography_matrix": homography_matrix.tolist() if homography_matrix is not None else [],
        "depth_map": depth_normalized.tolist(),
    }


def _resize(image: Image.Image) -> Image.Image:
    max_size = settings.MAX_IMAGE_SIZE
    w, h = image.size
    if max(w, h) <= max_size:
        return image
    scale = max_size / max(w, h)
    return image.resize((int(w * scale), int(h * scale)), Image.LANCZOS)


def _mask_to_rle(mask: np.ndarray) -> dict:
    """Run-length encode a binary mask for compact JSON transfer."""
    flat = mask.flatten().astype(np.uint8)
    runs = []
    current = flat[0]
    count = 1
    for val in flat[1:]:
        if val == current:
            count += 1
        else:
            runs.append(int(count))
            current = val
            count = 1
    runs.append(int(count))
    return {
        "start_value": int(flat[0]),
        "runs": runs,
        "shape": list(mask.shape),
    }


def _normalize_depth(depth: np.ndarray) -> np.ndarray:
    """Normalize depth to 0-255 uint8 for transfer, downsampled 4x."""
    depth_small = cv2.resize(depth, (depth.shape[1] // 4, depth.shape[0] // 4))
    d_min, d_max = depth_small.min(), depth_small.max()
    if d_max == d_min:
        return np.zeros_like(depth_small, dtype=np.uint8)
    normalized = ((depth_small - d_min) / (d_max - d_min) * 255).astype(np.uint8)
    return normalized
