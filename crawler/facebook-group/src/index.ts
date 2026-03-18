import * as fs from "fs";
import * as path from "path";
import { loadConfig } from "./config";
import { crawl, type CrawlResult, type VideoInfo } from "./crawler";

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
  const result: CrawlResult = await crawl(config);
  const { posts, totalVideos } = result;

  // Ensure output directory exists
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }

  // Collect all unique video URLs for the batch file
  const allVideos = posts.flatMap((p) => p.videos);
  const seenUrls = new Set<string>();
  const uniqueVideos: VideoInfo[] = [];
  for (const v of allVideos) {
    if (!seenUrls.has(v.url)) {
      seenUrls.add(v.url);
      uniqueVideos.push(v);
    }
  }
  const okPosts = posts.filter((p) => p.status === "ok");
  const skippedPosts = posts.filter((p) => p.status !== "ok");

  // Write crawl summary report (per-post breakdown)
  const summaryPath = path.join(config.outputDir, "crawl-summary.txt");
  const summaryLines: string[] = [
    `=== Crawl Summary ===`,
    `Date:           ${new Date().toISOString()}`,
    `Group URL:      ${config.groupUrl}`,
    `Total posts:    ${posts.length}`,
    `Posts with video: ${okPosts.length}`,
    `Posts skipped:  ${skippedPosts.length}`,
    `Unique videos:  ${totalVideos} (deduplicated across all posts)`,
    ``,
    `Note: Each post page loads all videos in its category sidebar,`,
    `      so the same video may appear under multiple posts.`,
    ``,
    `=== Per-Post Breakdown ===`,
    ``,
  ];

  posts.forEach((post, i) => {
    summaryLines.push(`Post ${i + 1}: ${post.postUrl}`);
    if (post.postTitle) {
      summaryLines.push(`  Title: ${post.postTitle}`);
    }
    if (post.status === "ok") {
      summaryLines.push(`  Status: ✅ OK (${post.videos.length} video(s))`);
      post.videos.forEach((v, j) => {
        const label = v.title ? ` — ${v.title}` : '';
        summaryLines.push(`    ${j + 1}. ${v.url}${label}`);
      });
    } else if (post.status === "no-video") {
      summaryLines.push(`  Status: ⚠️ No video found`);
    } else {
      summaryLines.push(`  Status: ❌ Error`);
      summaryLines.push(`  Reason: ${post.error}`);
    }
    summaryLines.push(``);
  });

  fs.writeFileSync(summaryPath, summaryLines.join("\n") + "\n", "utf-8");
  console.log(`\n📊 Crawl summary saved to: ${summaryPath}`);

  if (uniqueVideos.length === 0) {
    console.log("\n⚠️ No video URLs found. The group might have no video content in guides.");
    return;
  }

  // Write URLs to file (one per line, yt-dlp --batch-file compatible)
  const outputPath = path.join(config.outputDir, config.outputFile);
  fs.writeFileSync(outputPath, uniqueVideos.map((v) => v.url).join("\n") + "\n", "utf-8");

  console.log(`📁 Saved ${uniqueVideos.length} video URL(s) to: ${outputPath}`);
  console.log("\nNext steps:");
  console.log("  1. Review the URL list: " + outputPath);
  console.log("  2. Review per-post summary: " + summaryPath);
  console.log("  3. Convert cookies:     npm run convert-cookies");
  console.log("  4. Download videos:     npm run download");
}

main().catch((err) => {
  console.error(`\n❌ Fatal error: ${err.message}`);
  process.exit(1);
});
