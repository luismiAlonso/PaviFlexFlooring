"""
Depth Anything v2 — monocular depth estimation service.

Depth Anything v2 by HuggingFace/depth-anything — Apache 2.0 license.
Repo: https://github.com/DepthAnything/Depth-Anything-V2

The depth map is used to:
  - Validate/refine the floor mask (floor pixels should have consistent depth)
  - Provide the Three.js frontend with depth cues for realistic texture scaling
"""

import numpy as np
import torch
from PIL import Image

from app.core.config import settings


_MODEL_IDS = {
    "Small": "depth-anything/Depth-Anything-V2-Small-hf",
    "Base": "depth-anything/Depth-Anything-V2-Base-hf",
    "Large": "depth-anything/Depth-Anything-V2-Large-hf",
}


class DepthService:
    def __init__(self):
        self.device = torch.device(settings.MODEL_DEVICE)
        self._pipe = None
        self._load_model()

    def _load_model(self):
        try:
            from transformers import pipeline as hf_pipeline

            model_id = _MODEL_IDS[settings.DEPTH_MODEL]
            self._pipe = hf_pipeline(
                task="depth-estimation",
                model=model_id,
                device=0 if settings.MODEL_DEVICE == "cuda" else -1,
            )
            print(f"Depth Anything v2 ({settings.DEPTH_MODEL}) loaded")
        except ImportError:
            print("transformers not installed. Using mock depth for development.")
            self._pipe = None

    def estimate(self, image_array: np.ndarray) -> np.ndarray:
        """
        Given RGB numpy array (H, W, 3), returns float32 depth map (H, W).
        Higher values = further away.
        """
        if self._pipe is None:
            return self._mock_depth(image_array)

        pil_image = Image.fromarray(image_array)
        result = self._pipe(pil_image)
        depth = np.array(result["depth"], dtype=np.float32)
        return depth

    def _mock_depth(self, image_array: np.ndarray) -> np.ndarray:
        """Development mock: linear gradient top=far, bottom=near."""
        h, w = image_array.shape[:2]
        depth = np.linspace(1.0, 0.0, h, dtype=np.float32)
        return np.tile(depth[:, None], (1, w))
