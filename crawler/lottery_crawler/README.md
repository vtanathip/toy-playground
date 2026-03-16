# lottery_crawler

Extracts **36-year Thai lottery statistics** (สถิติหวยออกย้อนหลัง 36 ปี) from [myhora.com](https://www.myhora.com/lottery/stats.aspx) using [crawl4ai](https://github.com/unclecode/crawl4ai).

## How it works

### 1. Browser crawling (`scraper.py`)

The crawler uses **crawl4ai** with a headless Chromium browser (via Playwright) to load the target page. Before extracting content, it injects JavaScript to reveal hidden `<div>` sections that the page keeps collapsed by default:

```javascript
document.querySelectorAll('[id^="div_freq_"]').forEach(el => {
    el.style.display = 'block';
});
```

crawl4ai then converts the fully-rendered HTML into **markdown**, which is much easier to parse than raw HTML.

### 2. Frequency stats parsing (`parser.py` + `sections.py`)

The markdown is split into 6 statistical sections by searching for known Thai marker strings (defined in `sections.py`). Each section is then parsed for:

- **Frequency-by-digit table** — pipe-separated rows like `สิบ | 97 | 84 | 79 | ...` showing how often each digit (0-9) appears at each position (หน่วย, สิบ, ร้อย)
- **Ranked frequency list** — lines like `16 ครั้ง | 67 77` listing numbers ranked by draw count
- **Never-drawn list** — numbers that have never appeared (3-digit sections only)

| Section | Description |
| --- | --- |
| เลข 2 ตัวบน | Last 2 digits of 1st prize (top) |
| เลขท้าย 2 ตัว | Last 2 digits (bottom) |
| เลข 3 ตัวบน (เลขท้าย) | Last 3 digits of 1st prize |
| เลข 3 ตัวบน (เลขหน้า) | First 3 digits of 1st prize |
| เลขท้าย 3 ตัว | Last 3 digits (bottom) |
| เลขหน้า 3 ตัว | Front 3 digits (bottom) |

### 3. Draw history parsing (`parser.py`)

Below the frequency stats, the page contains a full draw-by-draw history table (864 draws). The parser reads repeating line blocks — each draw spans ~10-12 lines in the markdown:

```
day         → 1
month       → มีนาคม
abbrev      → มี.ค.
year        → 2569
short_year  → 69
first_prize → 820866
two_top     → 66
three_top   → 866
two_bottom  → 06
combined    → _054_ _479_ 068 837   (italic = front-3, plain = back-3)
...
```

Older draws (pre-2558) use 7-digit prize numbers and lack the "3 ตัวหน้า / 3 ตัวล่าง" field.

### 4. Export (`exporter.py`)

All structured data is written to `output/lottery_stats.json`.

### 5. Optional LLM analysis (`analyzer.py`)

If `LLM_PROVIDER` and `LLM_API_KEY` are set in `.env`, the extracted data is sent to an LLM (via [litellm](https://github.com/BerriAI/litellm)) for trend analysis. The analysis is saved as `output/lottery_analysis.md`.

## Pipeline flow

```
.env (config)
    │
    ▼
scraper.py ──crawl4ai──► raw markdown
    │
    ▼
parser.py
    ├── parse_markdown_stats()  → 6 frequency sections
    ├── parse_draw_history()    → 864 draw records
    └── extract_metadata()      → period, draw count
    │
    ▼
exporter.py ──► output/lottery_stats.json
    │
    ▼ (optional)
analyzer.py ──litellm──► output/lottery_analysis.md
```

## Setup

```bash
# Install dependencies (using uv)
uv pip install -e .

# Install Playwright Chromium (required by crawl4ai)
python -m playwright install chromium
```

## Configuration

Copy `.env.example` to `.env`:

```env
CRAWL_URL=https://www.myhora.com/lottery/stats.aspx?mx=09&vx=36
LLM_PROVIDER=                 # e.g. openai/gpt-4o-mini, anthropic/claude-3-5-sonnet-20240620
LLM_API_KEY=                  # your API key
OUTPUT_DIR=./output
```

## Usage

```bash
python -m lottery_crawler
```

## Sample output

### Metadata

```json
{
  "metadata": {
    "url": "https://www.myhora.com/lottery/stats.aspx?mx=09&vx=36",
    "total_draws": 864,
    "period": "พ.ศ.2533 - ปัจจุบัน",
    "crawled_at": "2026-03-16T05:15:11.251144+00:00"
  }
}
```

### Frequency section (เลข 2 ตัวบน)

```json
{
  "name": "เลข 2 ตัวบน",
  "description": "Last 2 digits of 1st prize (top)",
  "frequency_by_digit": {
    "headers": ["หลัก", "เลข 0", "เลข 1", "...", "เลข 9"],
    "rows": [
      { "position": "สิบ", "values": [97, 84, 79, 74, 87, 92, 92, 91, 78, 90] },
      { "position": "หน่วย", "values": [76, 93, 91, 91, 105, 80, 88, 107, 79, 54] },
      { "position": "รวม", "values": [173, 177, 170, 165, 192, 172, 180, 198, 157, 144] }
    ]
  },
  "ranked_frequency": [
    { "count": 16, "numbers": ["67", "77"] },
    { "count": 15, "numbers": ["72"] }
  ],
  "never_drawn": null
}
```

### Draw history record (newer, with 3 ตัวหน้า/ล่าง)

```json
{
  "date": "1 มีนาคม 2569",
  "day": 1,
  "month": 3,
  "year": 2569,
  "first_prize": "820866",
  "last_two_top": "66",
  "last_three_top": "866",
  "last_two_bottom": "06",
  "three_front": ["054", "479"],
  "three_back": ["068", "837"]
}
```

### Draw history record (older, no 3 ตัวหน้า/ล่าง)

```json
{
  "date": "16 สิงหาคม 2558",
  "day": 16,
  "month": 8,
  "year": 2558,
  "first_prize": "033363",
  "last_two_top": "63",
  "last_three_top": "363",
  "last_two_bottom": "40"
}
```

## Project structure

```
lottery_crawler/
├── __init__.py       # public API exports
├── __main__.py       # entry point (python -m lottery_crawler)
├── config.py         # loads .env configuration
├── sections.py       # 6 frequency section definitions
├── parser.py         # markdown → structured data
├── scraper.py        # crawl4ai browser crawling
├── exporter.py       # JSON output writer
├── analyzer.py       # optional LLM analysis
└── README.md         # this file
```
