"""
Thai Lottery Statistics Crawler — entry point.

Usage:
    python -m lottery_crawler
"""

import asyncio

from lottery_crawler import (
    load_config,
    scrape_lottery_stats,
    save_results,
    analyze_with_llm,
)


async def async_main():
    config = load_config()

    print("=" * 60)
    print("  Thai Lottery Statistics Crawler")
    print("  สถิติหวยออกย้อนหลัง 36 ปี")
    print("=" * 60)
    print()

    # Step 1: Crawl and extract
    data = await scrape_lottery_stats(config["crawl_url"])

    # Step 2: Save JSON output
    json_file = save_results(data, config["output_dir"])

    # Step 3: Optional LLM analysis
    if config["llm_provider"] and config["llm_api_key"]:
        print()
        await analyze_with_llm(
            data,
            config["llm_provider"],
            config["llm_api_key"],
            config["output_dir"],
        )
    else:
        print()
        print(
            "ℹ️  No LLM configured. Set LLM_PROVIDER and LLM_API_KEY in .env for analysis."
        )

    print()
    print("✅ Done!")
    return json_file


def main():
    return asyncio.run(async_main())


if __name__ == "__main__":
    main()
