import * as fs from "fs";
import * as path from "path";
import { loadConfig } from "./config";
import { crawl } from "./crawler";

async function main(): Promise<void> {
  console.log("=== Facebook Group Guides Video Crawler ===\n");

  const config = loadConfig();

  console.log("📋 Configuration:");
  console.log(`   Group URL:     ${config.groupUrl}`);
  console.log(`   Cookies:       ${config.cookiesPath}`);
  console.log(`   Output:        ${path.join(config.outputDir, config.outputFile)}`);
  console.log(`   Headless:      ${config.headless}`);
  console.log(`   Scroll delay:  ${config.scrollDelayMs}ms`);
  console.log(`   Scroll timeout: ${config.scrollTimeoutMs}ms\n`);

  // Run the crawler
  const videoUrls = await crawl(config);

  if (videoUrls.length === 0) {
    console.log("\n⚠️ No video URLs found. The group might have no video content in guides.");
    return;
  }

  // Ensure output directory exists
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }

  // Write URLs to file (one per line, yt-dlp --batch-file compatible)
  const outputPath = path.join(config.outputDir, config.outputFile);
  fs.writeFileSync(outputPath, videoUrls.join("\n") + "\n", "utf-8");

  console.log(`\n📁 Saved ${videoUrls.length} video URL(s) to: ${outputPath}`);
  console.log("\nNext steps:");
  console.log("  1. Review the URL list: " + outputPath);
  console.log("  2. Convert cookies:     npm run convert-cookies");
  console.log("  3. Download videos:     npm run download");
}

main().catch((err) => {
  console.error(`\n❌ Fatal error: ${err.message}`);
  process.exit(1);
});
