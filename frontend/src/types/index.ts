export interface ImageSize {
  width: number;
  height: number;
}

export interface MaskRLE {
  start_value: number;
  runs: number[];
  shape: number[];
}

export interface SegmentationResult {
  // Added by frontend hook
  photoUrl: string;

  // From backend
  image_size: ImageSize;
  floor_mask_rle: MaskRLE;
  floor_corners: number[][];      // [[x,y], ...]
  homography_matrix: number[][];  // 3x3
  depth_map: number[][];          // downsampled depth
}
