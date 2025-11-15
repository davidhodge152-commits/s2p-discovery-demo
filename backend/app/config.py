from __future__ import annotations

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Information Integrity Observatory Demo"
    minhash_num_perm: int = 64
    paraphrase_threshold: float = 0.45
    near_duplicate_threshold: float = 0.8
    summary_threshold: float = 0.35
    jaccard_threshold: float = 0.25
    quote_overlap_threshold: float = 0.7
    summary_length_ratio: float = 0.6
    seed_data_dir: str = "data"
    websocket_path: str = "/ws"

    class Config:
        env_prefix = "IIO_"


settings = Settings()
