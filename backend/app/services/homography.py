"""
Homography and perspective transform utilities.

Given a binary floor mask, this module:
  1. Finds the convex hull / approximate quadrilateral of the floor region
  2. Computes a homography matrix mapping the floor quad to a rectangle
  3. Returns corners and matrix so the frontend can project textures correctly
"""

import numpy as np
import cv2
from typing import Optional, Tuple


def compute_floor_homography(
    mask: np.ndarray,
) -> Tuple[Optional[np.ndarray], Optional[np.ndarray]]:
    """
    Args:
        mask: Binary (bool or uint8) floor mask, shape (H, W)

    Returns:
        corners: (4, 2) float32 array of floor quad corners [TL, TR, BR, BL]
                 in image pixel coordinates, or None if detection fails
        homography: (3, 3) float64 homography matrix, or None
    """
    mask_u8 = (mask.astype(np.uint8)) * 255
    contours, _ = cv2.findContours(mask_u8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if not contours:
        return None, None

    # Largest contour = floor region
    largest = max(contours, key=cv2.contourArea)

    # Approximate to a polygon (epsilon = 2% of perimeter)
    epsilon = 0.02 * cv2.arcLength(largest, True)
    approx = cv2.approxPolyDP(largest, epsilon, True)

    # Get the 4 extreme corners of the convex hull for a stable quad
    hull = cv2.convexHull(approx).reshape(-1, 2).astype(np.float32)
    corners = _order_quad(hull)

    if corners is None:
        return None, None

    # Destination rectangle (normalized 0-1 space)
    h, w = mask.shape
    width = float(w)
    height = float(h) * 0.5  # floor typically occupies ~half the image height
    dst = np.array([
        [0, 0],
        [width, 0],
        [width, height],
        [0, height],
    ], dtype=np.float32)

    homography, _ = cv2.findHomography(corners, dst, cv2.RANSAC, 5.0)
    return corners, homography


def _order_quad(points: np.ndarray) -> Optional[np.ndarray]:
    """
    From a convex hull, extract 4 corners ordered [TL, TR, BR, BL].
    Uses the 4 extreme points (top, right, bottom, left) of the hull.
    """
    if len(points) < 4:
        return None

    # Find the 4 extreme points
    top = points[points[:, 1].argmin()]
    bottom = points[points[:, 1].argmax()]
    left = points[points[:, 0].argmin()]
    right = points[points[:, 0].argmax()]

    ordered = np.array([
        top,    # TL approximation
        right,  # TR approximation
        bottom, # BR approximation
        left,   # BL approximation
    ], dtype=np.float32)

    return ordered
