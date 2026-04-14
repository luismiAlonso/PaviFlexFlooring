from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    ENV: str = "development"

    # CORS - in production restrict to your domain
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # AI model settings
    # "cpu" for development, "cuda" or "mps" for GPU
    MODEL_DEVICE: str = "cpu"

    # SAM 2 model variant: "sam2_hiera_tiny", "sam2_hiera_small",
    # "sam2_hiera_base_plus", "sam2_hiera_large"
    SAM2_MODEL: str = "sam2_hiera_small"

    # Depth Anything v2 variant: "Small", "Base", "Large"
    DEPTH_MODEL: str = "Small"

    # Max image size (pixels on longest side) - resize before inference
    MAX_IMAGE_SIZE: int = 1024

    class Config:
        env_file = ".env"


settings = Settings()
