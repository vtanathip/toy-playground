"""Web scraper — uses crawl4ai to fetch and extract lottery statistics."""

from typing import Any, cast

from lottery_crawler.parser import parse_markdown_stats, extract_metadata, parse_draw_history
from lottery_crawler.sections import LOTTERY_SECTIONS


async def scrape_lottery_stats(url: str) -> dict:
    """Crawl the target URL and return structured lottery statistics.

    Uses crawl4ai's AsyncWebCrawler with JS injection to reveal all
    hidden sections before extracting the page markdown.
    """
    from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode, CrawlResult

    js_reveal_hidden = """
    (async () => {
        document.querySelectorAll('[id^="div_freq_"]').forEach(el => {
            el.style.display = 'block';
        });
        await new Promise(r => setTimeout(r, 500));
    })();
    """

    browser_cfg = BrowserConfig(headless=True, verbose=False)
    run_cfg = CrawlerRunConfig(
        js_code=js_reveal_hidden,
        wait_until="domcontentloaded",
        cache_mode=CacheMode.BYPASS,
    )

    print(f"🔍 Crawling: {url}")
    print("   (this may take a moment on first run...)")

    async with AsyncWebCrawler(config=browser_cfg) as crawler:
        result: Any = cast(Any, await crawler.arun(url=url, config=run_cfg))

    if not result.success:
        raise RuntimeError(
            f"Crawl failed: {result.error_message or 'Unknown error'}"
        )

    markdown = str(result.markdown or "")
    print(f"✅ Page crawled successfully ({len(markdown)} chars of markdown)")

    # Parse
    metadata = extract_metadata(markdown, url)
    sections = parse_markdown_stats(markdown)
    draw_history = parse_draw_history(markdown)

    freq_count = sum(1 for s in sections if s["frequency_by_digit"])
    rank_count = sum(1 for s in sections if s["ranked_frequency"])
    print(f"📊 Extracted {freq_count}/{len(LOTTERY_SECTIONS)} frequency tables")
    print(
        f"📊 Extracted {rank_count}/{len(LOTTERY_SECTIONS)} ranked frequency lists")
    print(f"📊 Extracted {len(draw_history)} draw history records")

    return {"metadata": metadata, "sections": sections, "draw_history": draw_history}
