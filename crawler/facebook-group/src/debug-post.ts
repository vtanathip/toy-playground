import { chromium } from "playwright";
import * as fs from "fs";
import { loadConfig, loadCookies } from "./config";

/**
 * Debug a single post page to understand how video content is rendered.
 * Usage: npx ts-node src/debug-post.ts [postUrl]
 */
async function main(): Promise<void> {
  const config = loadConfig();
  const cookies = loadCookies(config.cookiesPath);

  // Use first argument as URL, or default to first post from the group
  const targetUrl =
    process.argv[2] ||
    `${config.groupUrl}?filter=2698106333904702&post=909582098626939`;

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: "en-US",
  });
  await context.addCookies(cookies);
  const page = await context.newPage();

  console.log(`Navigating to: ${targetUrl}`);
  await page.goto(targetUrl, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(8000);

  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }

  // Screenshot
  await page.screenshot({
    path: `${config.outputDir}/debug-post-screenshot.png`,
    fullPage: true,
  });
  console.log("📸 Screenshot saved");

  // All links on the page
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("a[href]")).map((a) => ({
      href: (a as HTMLAnchorElement).href,
      text: (a as HTMLElement).innerText?.trim().substring(0, 100) || "",
    }));
  });
  fs.writeFileSync(
    `${config.outputDir}/debug-post-links.json`,
    JSON.stringify(links, null, 2),
    "utf-8"
  );
  console.log(`🔗 ${links.length} links dumped`);

  // All iframes
  const iframes = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("iframe")).map((f) => ({
      src: f.src,
      width: f.width,
      height: f.height,
      title: f.title,
    }));
  });
  console.log(`📺 Iframes: ${JSON.stringify(iframes, null, 2)}`);

  // All video elements
  const videos = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("video")).map((v) => ({
      src: v.src,
      poster: v.poster,
      sources: Array.from(v.querySelectorAll("source")).map((s) => s.src),
    }));
  });
  console.log(`🎬 Video elements: ${JSON.stringify(videos, null, 2)}`);

  // Check for any aria-label containing "video" or "play"
  const videoRelated = await page.evaluate(() => {
    const results: string[] = [];
    document.querySelectorAll("*").forEach((el) => {
      const aria = el.getAttribute("aria-label") || "";
      const role = el.getAttribute("role") || "";
      if (
        aria.toLowerCase().includes("video") ||
        aria.toLowerCase().includes("play") ||
        role === "video"
      ) {
        results.push(
          `<${el.tagName.toLowerCase()} role="${role}" aria-label="${aria}" class="${(el.className?.toString() || "").substring(0, 60)}">`
        );
      }
    });
    return results;
  });
  console.log(
    `🎮 Video/play related elements:\n${videoRelated.join("\n") || "  (none)"}`
  );

  // Look for the post content text to see what this post actually contains
  const postContent = await page.evaluate(() => {
    // Facebook post content is usually inside a div with dir="auto"
    const contentDivs = Array.from(
      document.querySelectorAll('[data-ad-preview="message"], [dir="auto"]')
    );
    return contentDivs
      .map((d) => (d as HTMLElement).innerText?.trim())
      .filter((t) => t && t.length > 20)
      .slice(0, 5)
      .map((t) => t.substring(0, 300));
  });
  console.log(`📄 Post content snippets:\n${postContent.join("\n---\n") || "  (none)"}`);

  // Intercept network requests to look for video URLs
  console.log("\n⏳ Waiting 10s to monitor network for video requests...");
  const videoNetworkUrls: string[] = [];
  page.on("response", (response) => {
    const url = response.url();
    if (
      url.includes("video") ||
      url.includes(".mp4") ||
      url.includes(".m3u8") ||
      url.includes("playback")
    ) {
      videoNetworkUrls.push(url);
    }
  });

  // Try clicking on any video thumbnail or play button
  const playButton = page.locator(
    '[aria-label*="Play" i], [aria-label*="video" i], [role="button"]:has(svg)'
  );
  const playCount = await playButton.count();
  console.log(`▶️ Found ${playCount} potential play buttons`);

  if (playCount > 0) {
    try {
      await playButton.first().click({ timeout: 5000 });
      console.log("  Clicked first play-like button");
      await page.waitForTimeout(5000);

      // Re-check for video elements after click
      const videosAfterClick = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("video")).map((v) => ({
          src: v.src,
          poster: v.poster,
          currentSrc: v.currentSrc,
        }));
      });
      console.log(
        `  🎬 Video elements after click: ${JSON.stringify(videosAfterClick, null, 2)}`
      );
    } catch {
      console.log("  Could not click play button");
    }
  }

  await page.waitForTimeout(5000);
  console.log(
    `\n🌐 Video-related network URLs:\n${videoNetworkUrls.join("\n") || "  (none)"}`
  );

  await browser.close();
}

main().catch((err) => {
  console.error(`Fatal: ${err.message}`);
  process.exit(1);
});
