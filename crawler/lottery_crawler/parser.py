"""Markdown parser — extracts structured lottery data from crawled markdown."""

import re
from datetime import datetime, timezone

from lottery_crawler.sections import LOTTERY_SECTIONS


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _parse_frequency_table(
    lines: list[str], digit_positions: list[str]
) -> dict | None:
    """Parse a frequency-by-digit markdown table.

    Rows look like::

        สิบ | 97 | 84 | 79 | 74 | 87 | 92 | 92 | 91 | 78 | 90
        _รวม_ | 173 | 177 | 170 | 165 | 192 | 172 | 180 | 198 | 157 | 144
    """
    keywords = digit_positions + ["_รวม_", "รวม"]
    rows: list[dict] = []
    seen_positions: set[str] = set()

    for line in lines:
        stripped = line.strip()
        if not stripped or "|" not in stripped:
            continue

        cells = [c.strip() for c in stripped.split("|") if c.strip()]
        if len(cells) < 2:
            continue

        first_cell = cells[0]
        normalised = first_cell.replace("_", "")  # _รวม_ → รวม

        valid_names = digit_positions + ["รวม"]
        if first_cell not in keywords and normalised not in valid_names:
            continue

        position_name = normalised if normalised in valid_names else first_cell
        if position_name in seen_positions:
            continue

        values = [int(c) for c in cells[1:] if c.isdigit()]
        if len(values) >= 10:
            rows.append({"position": position_name, "values": values[:10]})
            seen_positions.add(position_name)

    if not rows:
        return None

    return {
        "headers": ["หลัก"] + [f"เลข {i}" for i in range(10)],
        "rows": rows,
    }


def _parse_ranked_frequency(lines: list[str]) -> list[dict] | None:
    """Parse a ranked frequency table.

    Lines look like::

        16 ครั้ง | 67 77
        15 ครั้ง | 72
    """
    pattern = re.compile(r"^\s*(\d+)\s*ครั้ง\s*\|\s*(.+?)(?:\s*$)")
    results: list[dict] = []

    for line in lines:
        m = pattern.match(line.strip())
        if m:
            count = int(m.group(1))
            numbers = [n for n in re.split(r"\s+", m.group(2).strip()) if n]
            if numbers:
                results.append({"count": count, "numbers": numbers})

    return results or None


def _parse_never_drawn(lines: list[str]) -> list[str] | None:
    """Parse the 'never drawn' list (ไม่เคยออก)."""
    for line in lines:
        if "ไม่เคยออก" in line and "|" in line:
            parts = line.split("|", 1)
            if len(parts) == 2:
                numbers = [n for n in re.split(r"\s+", parts[1].strip()) if n]
                if numbers:
                    return numbers
    return None


def _split_into_section_chunks(
    markdown: str,
) -> list[tuple[dict, list[str]]]:
    """Split raw markdown into per-section line chunks using markers."""
    all_lines = markdown.splitlines()
    section_starts: list[tuple[str, int, dict]] = []

    for section in LOTTERY_SECTIONS:
        marker = section["marker"]
        for i, line in enumerate(all_lines):
            if marker in line:
                section_starts.append((section["name"], i, section))
                break

    section_starts.sort(key=lambda x: x[1])

    chunks: list[tuple[dict, list[str]]] = []
    for idx, (_, start_line, section_def) in enumerate(section_starts):
        end_line = (
            section_starts[idx + 1][1]
            if idx + 1 < len(section_starts)
            else len(all_lines)
        )
        chunks.append((section_def, all_lines[start_line:end_line]))

    return chunks


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def parse_markdown_stats(markdown: str) -> list[dict]:
    """Parse crawled markdown and return structured data for every section."""
    chunks = _split_into_section_chunks(markdown)
    sections_data: list[dict] = []

    for section_def, lines in chunks:
        result = {
            "name": section_def["name"],
            "description": section_def["description"],
            "frequency_by_digit": _parse_frequency_table(
                lines, section_def["digit_positions"]
            ),
            "ranked_frequency": _parse_ranked_frequency(lines),
            "never_drawn": _parse_never_drawn(lines),
        }
        sections_data.append(result)

    return sections_data


def extract_metadata(markdown: str, url: str) -> dict:
    """Extract page-level metadata (draw count, period) from markdown."""
    total_draws = None
    period = None

    m = re.search(r"รวม\s+(\d+)\s*งวด", markdown)
    if m:
        total_draws = int(m.group(1))

    m = re.search(r"ย้อนหลังถึง\s+พ\.ศ\.(\d{4})", markdown)
    if m:
        period = f"พ.ศ.{m.group(1)} - ปัจจุบัน"

    return {
        "url": url,
        "total_draws": total_draws,
        "period": period,
        "crawled_at": datetime.now(timezone.utc).isoformat(),
    }
