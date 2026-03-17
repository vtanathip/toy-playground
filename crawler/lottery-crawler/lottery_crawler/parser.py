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


# ---------------------------------------------------------------------------
# Draw history table parser
# ---------------------------------------------------------------------------

_THAI_MONTHS: dict[str, int] = {
    "มกราคม": 1,
    "กุมภาพันธ์": 2,
    "มีนาคม": 3,
    "เมษายน": 4,
    "พฤษภาคม": 5,
    "มิถุนายน": 6,
    "กรกฎาคม": 7,
    "สิงหาคม": 8,
    "กันยายน": 9,
    "ตุลาคม": 10,
    "พฤศจิกายน": 11,
    "ธันวาคม": 12,
}

_DRAW_HISTORY_MARKER = "สถิติหวยออกย้อนหลัง 36 ปี"


def _parse_three_front_back(raw: str) -> dict[str, list[str]]:
    """Parse combined '3 ตัวหน้า, 3 ตัวล่าง' field.

    The markdown renders front-3 numbers in italics: ``_054_ _479_ 068 837``
    Front numbers are wrapped in underscores, back numbers are plain.
    """
    front: list[str] = []
    back: list[str] = []
    for token in raw.split():
        cleaned = token.strip("_")
        if not cleaned:
            continue
        if token.startswith("_") and token.endswith("_"):
            front.append(cleaned)
        else:
            back.append(cleaned)
    return {"three_front": front, "three_back": back}


def parse_draw_history(markdown: str) -> list[dict]:
    """Parse the draw-by-draw history table from the page markdown.

    Each draw record in the markdown is a repeating block of lines::

        day            (e.g. 1)
        month_name     (e.g. มีนาคม)
        month_abbrev   (e.g. มี.ค.)
        year           (e.g. 2569)
        short_year     (e.g. 69)
        first_prize    (6 or 7 digits)
        two_top        (last 2 of 1st prize)
        three_top      (last 3 of 1st prize)
        two_bottom     (2-digit bottom prize)
        [3_front_back] (combined field, only newer draws)
        [dup_2_bottom] (duplicate, only newer draws)
        [dup_3_field]  (duplicate, only newer draws)

    Returns a list of draw dicts sorted newest-first.
    """
    lines = markdown.splitlines()

    # Locate the table header (after the frequency stats sections)
    start_idx: int | None = None
    for i, line in enumerate(lines):
        if _DRAW_HISTORY_MARKER in line and i > 500:
            start_idx = i
            break

    if start_idx is None:
        return []

    records: list[dict] = []
    i = start_idx + 1

    while i < len(lines) - 5:
        stripped = lines[i].strip()

        # Look for a day number (1-31)
        if not re.match(r"^\d{1,2}$", stripped):
            i += 1
            continue

        day = int(stripped)
        if day < 1 or day > 31:
            i += 1
            continue

        # Next line should be a Thai month name
        if i + 1 >= len(lines):
            break
        month_name = lines[i + 1].strip()
        if month_name not in _THAI_MONTHS:
            i += 1
            continue

        # i+2 = month abbreviation (skip)
        # i+3 = full year (25xx)
        if i + 3 >= len(lines):
            break
        year_str = lines[i + 3].strip()
        if not re.match(r"^25\d{2}$", year_str):
            i += 1
            continue

        # i+4 = short year (skip)
        # i+5 = first prize (6 or 7 digits)
        if i + 5 >= len(lines):
            break
        prize = lines[i + 5].strip()
        if not re.match(r"^\d{6,7}$", prize):
            i += 1
            continue

        # Build draw record
        record: dict = {
            "date": f"{day} {month_name} {year_str}",
            "day": day,
            "month": _THAI_MONTHS[month_name],
            "year": int(year_str),
            "first_prize": prize,
        }

        # i+6 = 2 ตัวบน, i+7 = 3 ตัวบน, i+8 = 2 ตัวล่าง
        offset = i + 6
        if offset < len(lines) and re.match(r"^\d{2}$", lines[offset].strip()):
            record["last_two_top"] = lines[offset].strip()
        offset += 1
        if offset < len(lines) and re.match(r"^\d{3}$", lines[offset].strip()):
            record["last_three_top"] = lines[offset].strip()
        offset += 1
        if offset < len(lines) and re.match(r"^\d{2}$", lines[offset].strip()):
            record["last_two_bottom"] = lines[offset].strip()

        # i+9 = combined 3 ตัวหน้า, 3 ตัวล่าง (only in newer records)
        offset = i + 9
        if offset < len(lines):
            combined_line = lines[offset].strip()
            if "_" in combined_line or len(combined_line.split()) >= 3:
                parsed = _parse_three_front_back(combined_line)
                if parsed["three_front"] or parsed["three_back"]:
                    record["three_front"] = parsed["three_front"]
                    record["three_back"] = parsed["three_back"]
                # Skip the duplicate lines (i+10, i+11)
                i += 12
            else:
                # Older format — no combined field, shorter record
                i += 10
        else:
            i += 10

        records.append(record)
        continue

    return records
