"""JSON exporter — saves extracted lottery data to disk."""

import json
from pathlib import Path


def save_results(data: dict, output_dir: str) -> Path:
    """Write extracted lottery data as a UTF-8 JSON file.

    Returns the path to the saved file.
    """
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    json_file = out_path / "lottery_stats.json"
    with open(json_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"💾 Saved: {json_file}")
    return json_file
