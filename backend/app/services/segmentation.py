"""
SAM 2 floor segmentation service.

SAM 2 (Segment Anything Model 2) by Meta — Apache 2.0 license.
Repo: https://github.com/facebookresearch/segment-anything-2

Strategy:
  - Use automatic mask generation to get all segments
  - Score each segment by "floor likelihood":
      * Large area
      * Low vertical position in image (bottom half)
      * Roughly horizontal (wide, not tall)
  - Return the best scoring mask as the floor mask
"""

import numpy as np
import torch
from PIL import Image

from app.core.config import settings


class SegmentationService:
    def __init__(self):
        self.device = torch.device(settings.MODEL_DEVICE)
        self._model = None
        self._mask_generator = None
        self._load_model()

    def _load_model(self):
        try:
            from sam2.build_sam import build_sam2
            from sam2.automatic_mask_generator import SAM2AutomaticMaskGenerator

            # Model checkpoint is auto-downloaded to ~/.cache/torch/hub on first run
            model_cfg = f"configs/sam2.1/{settings.SAM2_MODEL}.yaml"
            checkpoint = f"https://dl.fbaipublicfiles.com/segment_anything_2/092824/{settings.SAM2_MODEL}.pt"

            self._model = build_sam2(model_cfg, checkpoint, device=self.device)
            self._mask_generator = SAM2AutomaticMaskGenerator(
                model=self._model,
                points_per_side=16,       # lower = faster, good enough for floors
                pred_iou_thresh=0.86,
                stability_score_thresh=0.92,
                min_mask_region_area=5000,
            )
            print(f"SAM 2 loaded on {self.device}")
        except ImportError:
            print("SAM 2 not installed. Using mock segmentation for development.")
            self._mask_generator = None

    def segment_floor(self, image_array: np.ndarray) -> np.ndarray:
        """
        Given an RGB numpy array (H, W, 3), returns a binary floor mask (H, W) bool.
        """
        if self._mask_generator is None:
            return self._mock_floor_mask(image_array)

        masks = self._mask_generator.generate(image_array)
        return self._select_floor_mask(masks, image_array.shape)

    def _select_floor_mask(self, masks: list, shape: tuple) -> np.ndarray:
        """Score each SAM mask and return the one most likely to be the floor."""
        h, w = shape[:2]
        best_score = -1
        best_mask = np.zeros((h, w), dtype=bool)

        for m in masks:
            seg = m["segmentation"]  # bool (H, W)
            area = seg.sum()
            if area < 0.02 * h * w:  # skip tiny masks
                continue

            # Find bounding box
            rows = np.where(seg.any(axis=1))[0]
            cols = np.where(seg.any(axis=0))[0]
            if len(rows) == 0 or len(cols) == 0:
                continue

            bbox_h = rows[-1] - rows[0]
            bbox_w = cols[-1] - cols[0]
            centroid_y = rows.mean() / h  # 0=top, 1=bottom

            # Floor heuristics:
            # 1. Centroid should be in the lower 60% of the image
            vertical_score = max(0, centroid_y - 0.2)
            # 2. Should be wide relative to height (floor is horizontal)
            aspect_score = min(bbox_w / (bbox_h + 1), 3.0) / 3.0
            # 3. Large area
            area_score = min(area / (0.4 * h * w), 1.0)

            score = vertical_score * 0.4 + aspect_score * 0.3 + area_score * 0.3

            if score > best_score:
                best_score = score
                best_mask = seg

        return best_mask

    def _mock_floor_mask(self, image_array: np.ndarray) -> np.ndarray:
        """Development mock: bottom 40% of the image as 'floor'."""
        h, w = image_array.shape[:2]
        mask = np.zeros((h, w), dtype=bool)
        mask[int(h * 0.6):, :] = True
        return mask
