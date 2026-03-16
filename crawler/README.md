# Thai Lottery Statistics Crawler

Extracts **36-year lottery statistics** (สถิติหวยออกย้อนหลัง 36 ปี) from [myhora.com](https://www.myhora.com/lottery/stats.aspx) using [crawl4ai](https://github.com/unclecode/crawl4ai).

## What it extracts

| Section | Description |
| --------- | ------------- |
| เลข 2 ตัวบน | Last 2 digits of 1st prize (top) |
| เลขท้าย 2 ตัว | Last 2 digits (bottom) |
| เลข 3 ตัวบน (เลขท้าย) | Last 3 digits of 1st prize |
| เลข 3 ตัวบน (เลขหน้า) | First 3 digits of 1st prize |
| เลขท้าย 3 ตัว | Last 3 digits (bottom) |
| เลขหน้า 3 ตัว | Front 3 digits (bottom) |

Each section includes:

- **Frequency-by-digit table** — how often each digit (0–9) appears at each position
- **Ranked frequency list** — numbers ranked by how many times they've been drawn

## Setup

```bash
# Install dependencies
pip install -e .

# Install Playwright browsers (required by crawl4ai)
crawl4ai-setup
# or: python -m playwright install --with-deps chromium
```

## Configuration

Copy `.env.example` to `.env` and configure:

```env
# Target URL (default already set)
CRAWL_URL=https://www.myhora.com/lottery/stats.aspx?mx=09&vx=36

# Optional: LLM for analysis (openai/gpt-4o-mini, anthropic/claude-3-5-sonnet-20240620, groq/llama3-70b-8192)
LLM_PROVIDER=openai/gpt-4o-mini
LLM_API_KEY=sk-...

# Output directory
OUTPUT_DIR=./output
```

## Usage

```bash
python main.py
```

### Output

- `output/lottery_stats.json` — structured stats data (always generated)
- `output/lottery_analysis.md` — LLM analysis (only if LLM is configured)

### JSON structure

```json
{
  "metadata": {
    "url": "...",
    "total_draws": 864,
    "period": "พ.ศ.2533 - ปัจจุบัน",
    "crawled_at": "2026-03-16T..."
  },
  "sections": [
    {
      "name": "เลข 2 ตัวบน",
      "description": "Last 2 digits of 1st prize (top)",
      "frequency_by_digit": {
        "headers": ["หลัก", "เลข 0", "เลข 1", "...", "เลข 9"],
        "rows": [
          {"position": "สิบ", "values": [97, 84, "..."]},
          {"position": "หน่วย", "values": [76, 93, "..."]},
          {"position": "รวม", "values": [173, 177, "..."]}
        ]
      },
      "ranked_frequency": [
        {"count": 16, "numbers": ["67", "77"]},
        {"count": 15, "numbers": ["72"]}
      ]
    }
  ]
}
```
