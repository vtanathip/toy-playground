import { chromium, type BrowserContext, type Page } from "playwright";
import { Config, loadCookies } from "./config";

/** External video embed patterns to detect in iframes */
const EXTERNAL_VIDEO_PATTERNS = [
  /youtu\.be\//,
  /youtube\.com\/watch/,
  /youtube\.com\/shorts/,
  /vimeo\.com\//,
  /dailymotion\.com\//,
  /tiktok\.com\//,
];

async function autoScroll(
  page: Page,
  scrollDelayMs: number,
  scrollTimeoutMs: number
): Promise<void> {
  let lastHeight = 0;
  let stableTime = 0;

  while (stableTime < scrollTimeoutMs) {
    const currentHeight = await page.evaluate(() => document.body.scrollHeight);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(scrollDelayMs);

    if (currentHeight === lastHeight) {
      stableTime += scrollDelayMs;
    } else {
      stableTime = 0;
      console.log(`  📄 Page height: ${lastHeight} → ${currentHeight}`);
    }

    lastHeight = currentHeight;
  }
}

/**
 * Collect category filter links and individual post links from the Learning Content page.
 * Facebook Learning Content structure:
 *   - Categories: /learning_content/?filter=<categoryId>
 *   - Posts:      /learning_content/?filter=<categoryId>&post=<postId>
 */
async function collectLearningContentLinks(page: Page): Promise<{
  categoryLinks: string[];
  postLinks: string[];
}> {
  const allLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("a[href]"))
      .map((a) => (a as HTMLAnchorElement).href)
      .filter((href) => href.includes("/learning_content/"));
  });

  const categoryLinks = new Set<string>();
  const postLinks = new Set<string>();

  for (const link of allLinks) {
    try {
      const url = new URL(link);
      if (url.searchParams.has("post")) {
        postLinks.add(link);
      } else if (url.searchParams.has("filter")) {
        categoryLinks.add(link);
      }
    } catch {
      // ignore malformed URLs
    }
  }

  return {
    categoryLinks: [...categoryLinks],
    postLinks: [...postLinks],
  };
}

/**
 * Extract video URLs from a Facebook Learning Content post by intercepting
 * network requests. Facebook uses DASH streaming — video segments are fetched
 * as .mp4 from CDN with an `efg` query parameter containing base64-encoded
 * JSON with the video_id. We convert those to facebook.com/watch URLs for yt-dlp.
 *
 * Also detects external video embeds (YouTube, Vimeo, etc.) in iframes.
 */
interface PostExtraction {
  videos: VideoInfo[];
  postTitle?: string;
}

async function extractVideoUrlsFromPost(
  page: Page,
  postUrl: string
): Promise<PostExtraction> {
  const videoIds = new Set<string>();
  const externalUrls = new Set<string>();
  let postTitle: string | undefined;
  let videoTitleMap: Record<string, string> = {};

  // Listen for network requests to capture Facebook video IDs from CDN URLs
  const handler = (request: { url: () => string }) => {
    const url = request.url();
    if (!url.includes(".mp4") || !url.includes("efg=")) return;
    try {
      const efg = new URL(url).searchParams.get("efg");
      if (!efg) return;
      const decoded = JSON.parse(Buffer.from(efg, "base64").toString("utf-8"));
      if (decoded.video_id) {
        videoIds.add(String(decoded.video_id));
      }
    } catch {
      // ignore parse errors
    }
  };

  page.on("request", handler);

  try {
    await page.goto(postUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForTimeout(3000);

    // If video didn't auto-play, try clicking the play button
    if (videoIds.size === 0) {
      try {
        const playBtn = page.locator('[aria-label="Play video"]').first();
        if (await playBtn.isVisible({ timeout: 2000 })) {
          await playBtn.click();
          await page.waitForTimeout(5000);
        }
      } catch {
        // play button not found or not clickable
      }
    }

    // Extract the post title from the page
    postTitle = await page.evaluate(() => {
      // Try the main heading or strong text in the post content area
      const heading = document.querySelector('h2, [role="heading"]');
      if (heading?.textContent?.trim()) return heading.textContent.trim();
      // Fallback: page title
      return document.title?.trim() || undefined;
    }) || undefined;

    // Try to extract video titles visible on the page
    videoTitleMap = await page.evaluate(() => {
      const titles: Record<string, string> = {};
      // Facebook video players often have aria-label or nearby text with the title
      const videoLinks = Array.from(document.querySelectorAll('a[href*="/watch/"], a[href*="/videos/"], a[href*="/reel/"]'));
      for (const link of videoLinks) {
        const href = (link as HTMLAnchorElement).href;
        const vidMatch = href.match(/[?&]v=(\d+)|\/(\d{10,16})/);
        const vid = vidMatch?.[1] || vidMatch?.[2];
        if (vid) {
          const titleText = link.getAttribute('aria-label') || link.textContent?.trim();
          if (titleText) titles[vid] = titleText;
        }
      }
      return titles;
    });

    // Check for external video embeds in iframes
    const iframeSrcs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("iframe[src]"))
        .map((el) => el.getAttribute("src") || "")
        .filter(Boolean);
    });

    for (const src of iframeSrcs) {
      if (EXTERNAL_VIDEO_PATTERNS.some((p) => p.test(src))) {
        externalUrls.add(src);
      }
    }
  } finally {
    page.off("request", handler);
  }

  const results: VideoInfo[] = [];

  // Convert Facebook video IDs to yt-dlp compatible watch URLs
  // Valid Facebook video IDs are numeric and typically 15-16 digits
  for (const id of videoIds) {
    if (/^\d{10,16}$/.test(id)) {
      results.push({
        url: `https://www.facebook.com/watch/?v=${id}`,
        title: videoTitleMap[id],
      });
    } else {
      console.log(`⚠️  Skipping suspicious video ID: ${id}`);
    }
  }

  // Add external embed URLs
  for (const url of externalUrls) {
    results.push({ url });
  }

  return { videos: results, postTitle };
}

export interface VideoInfo {
  url: string;
  title?: string;
}

export interface PostResult {
  postUrl: string;
  postTitle?: string;
  videos: VideoInfo[];
  status: "ok" | "no-video" | "error";
  error?: string;
}

export interface CrawlResult {
  posts: PostResult[];
  totalVideos: number;
}

export async function crawl(config: Config): Promise<CrawlResult> {
  const cookies = loadCookies(config.cookiesPath);

  console.log("🚀 Launching browser...");
  const browser = await chromium.launch({
    headless: config.headless,
  });

  const context: BrowserContext = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: "en-US",
  });

  await context.addCookies(cookies);

  const page: Page = await context.newPage();

  try {
    console.log(`🌐 Navigating to: ${config.groupUrl}`);
    await page.goto(config.groupUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForTimeout(5000);

    // Check if we landed on a login page (cookies might be expired)
    const currentUrl = page.url();
    if (
      currentUrl.includes("/login") ||
      currentUrl.includes("checkpoint")
    ) {
      throw new Error(
        "Redirected to login/checkpoint page. Your cookies may be expired.\n" +
          "Please re-export cookies from your browser and update cookies.json."
      );
    }

    console.log(`✅ Page loaded: ${currentUrl}`);

    // Phase 1: Scroll through main page to load all categories
    console.log("\n📜 Phase 1: Scrolling main page to discover all categories...");
    await autoScroll(page, config.scrollDelayMs, config.scrollTimeoutMs);

    // Phase 2: Collect category and post links from the main page
    console.log("\n🔍 Phase 2: Collecting category and post links...");
    const allPostLinks = new Set<string>();
    let { categoryLinks, postLinks } = await collectLearningContentLinks(page);
    postLinks.forEach((l) => allPostLinks.add(l));
    console.log(`  Found ${categoryLinks.length} categories, ${postLinks.length} posts on main page`);

    // Phase 3: Visit each category to discover more posts (some may not be visible on main page)
    console.log("\n📂 Phase 3: Visiting each category to discover all posts...");
    for (let i = 0; i < categoryLinks.length; i++) {
      const catLink = categoryLinks[i];
      console.log(`  📁 Category ${i + 1}/${categoryLinks.length}: ${catLink}`);

      try {
        await page.goto(catLink, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(3000);
        await autoScroll(page, config.scrollDelayMs, config.scrollTimeoutMs);

        const catResult = await collectLearningContentLinks(page);
        const newPosts = catResult.postLinks.filter((l) => !allPostLinks.has(l));
        catResult.postLinks.forEach((l) => allPostLinks.add(l));

        if (newPosts.length > 0) {
          console.log(`    +${newPosts.length} new post(s) discovered`);
        }
      } catch (err) {
        console.warn(
          `    ⚠️ Failed: ${err instanceof Error ? err.message : err}`
        );
      }
    }

    console.log(`\n📊 Total unique posts to visit: ${allPostLinks.size}`);

    // Phase 4: Visit each post page and extract video URLs
    console.log("\n🎬 Phase 4: Extracting video URLs from each post...");
    const allVideoUrls = new Set<string>();
    const postArray = [...allPostLinks];
    const postResults: PostResult[] = [];

    for (let i = 0; i < postArray.length; i++) {
      const postLink = postArray[i];
      console.log(`  📝 Post ${i + 1}/${postArray.length}: ${postLink}`);

      try {
        const { videos, postTitle } = await extractVideoUrlsFromPost(page, postLink);
        videos.forEach((v) => allVideoUrls.add(v.url));

        if (videos.length > 0) {
          console.log(`    📌 Title: ${postTitle || '(untitled)'}`);
          console.log(`    🎬 Found ${videos.length} video(s):`);
          videos.forEach((v) => console.log(`       - ${v.url}${v.title ? ` [${v.title}]` : ''}`));
          postResults.push({ postUrl: postLink, postTitle, videos, status: "ok" });
        } else {
          console.log(`    📌 Title: ${postTitle || '(untitled)'}`);
          console.log(`    ℹ️ No video found`);
          postResults.push({ postUrl: postLink, postTitle, videos: [], status: "no-video" });
        }
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        console.warn(`    ⚠️ Failed: ${reason}`);
        postResults.push({ postUrl: postLink, videos: [], status: "error", error: reason });
      }
    }

    const skippedPosts = postResults.filter((p) => p.status !== "ok");
    console.log(`\n🏁 Total unique video URLs collected: ${allVideoUrls.size}`);

    if (skippedPosts.length > 0) {
      console.log(`\n⚠️  ${skippedPosts.length} post(s) had no video (check manually):`);
      for (const { postUrl, error } of skippedPosts) {
        console.log(`   - ${postUrl}`);
        if (error) console.log(`     Reason: ${error}`);
      }
    }
    return {
      posts: postResults,
      totalVideos: allVideoUrls.size,
    };
  } finally {
    await browser.close();
  }
}
