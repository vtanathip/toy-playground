"""Configuration loader — reads settings from .env file."""

import os

from dotenv import load_dotenv


def load_config() -> dict:
    """Load configuration from .env file.

    Returns a dict with keys:
        crawl_url   – target page URL
        llm_provider – LLM provider/model string (optional)
        llm_api_key  – API key for the LLM provider (optional)
        output_dir   – directory for output files
    """
    load_dotenv()
    return {
        "crawl_url": os.getenv(
            "CRAWL_URL",
            "https://www.myhora.com/lottery/stats.aspx?mx=09&vx=36",
        ),
        "llm_provider": os.getenv("LLM_PROVIDER", ""),
        "llm_api_key": os.getenv("LLM_API_KEY", ""),
        "output_dir": os.getenv("OUTPUT_DIR", "./output"),
    }
