import { chromium } from "playwright";
import * as fs from "fs";
import { loadConfig, loadCookies } from "./config";

/**
 * Debug script: opens the Learning Content page, takes a screenshot,
 * and dumps DOM structure to help understand how to target guide entries.
 */
async function main(): Promise<void> {
  const config = loadConfig();
  const cookies = loadCookies(config.cookiesPath);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: "en-US",
  });
  await context.addCookies(cookies);
  const page = await context.newPage();

  console.log(`Navigating to: ${config.groupUrl}`);
  await page.goto(config.groupUrl, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(8000);

  // Screenshot
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }
  await page.screenshot({
    path: `${config.outputDir}/debug-screenshot.png`,
    fullPage: true,
  });
  console.log("📸 Screenshot saved to output/debug-screenshot.png");

  // Dump all links with their text
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("a[href]")).map((a) => ({
      href: (a as HTMLAnchorElement).href,
      text: (a as HTMLElement).innerText?.trim().substring(0, 100) || "",
      ariaLabel: a.getAttribute("aria-label") || "",
    }));
  });

  fs.writeFileSync(
    `${config.outputDir}/debug-links.json`,
    JSON.stringify(links, null, 2),
    "utf-8"
  );
  console.log(`🔗 ${links.length} links dumped to output/debug-links.json`);

  // Dump all role="button" and clickable elements that might be guide cards
  const buttons = await page.evaluate(() => {
    return Array.from(
      document.querySelectorAll('[role="button"], [role="link"], [role="listitem"]')
    ).map((el) => ({
      tag: el.tagName,
      role: el.getAttribute("role"),
      text: (el as HTMLElement).innerText?.trim().substring(0, 150) || "",
      ariaLabel: el.getAttribute("aria-label") || "",
      className: el.className?.substring?.(0, 80) || "",
    }));
  });

  fs.writeFileSync(
    `${config.outputDir}/debug-buttons.json`,
    JSON.stringify(buttons, null, 2),
    "utf-8"
  );
  console.log(`🔘 ${buttons.length} interactive elements dumped to output/debug-buttons.json`);

  // Dump high-level DOM structure: first few levels of main content area
  const structure = await page.evaluate(() => {
    function walk(el: Element, depth: number, maxDepth: number): string {
      if (depth > maxDepth) return "";
      const tag = el.tagName.toLowerCase();
      const role = el.getAttribute("role") || "";
      const ariaLabel = el.getAttribute("aria-label") || "";
      const dataType = el.getAttribute("data-type") || "";
      const childCount = el.children.length;
      const text =
        childCount === 0
          ? (el as HTMLElement).innerText?.trim().substring(0, 60) || ""
          : "";
      const indent = "  ".repeat(depth);
      let line = `${indent}<${tag}`;
      if (role) line += ` role="${role}"`;
      if (ariaLabel) line += ` aria-label="${ariaLabel}"`;
      if (dataType) line += ` data-type="${dataType}"`;
      if (childCount > 0) line += ` children=${childCount}`;
      if (text) line += ` text="${text}"`;
      line += ">";
      let result = line + "\n";
      for (const child of Array.from(el.children)) {
        result += walk(child, depth + 1, maxDepth);
      }
      return result;
    }
    // Find main content area
    const main =
      document.querySelector('[role="main"]') || document.body;
    return walk(main, 0, 6);
  });

  fs.writeFileSync(
    `${config.outputDir}/debug-dom-structure.txt`,
    structure,
    "utf-8"
  );
  console.log("🏗️ DOM structure dumped to output/debug-dom-structure.txt");

  // Specifically look for video-related elements
  const videoElements = await page.evaluate(() => {
    const results: string[] = [];
    document.querySelectorAll("video, iframe, [data-video-url]").forEach((el) => {
      results.push(
        `<${el.tagName.toLowerCase()} src="${el.getAttribute("src") || ""}" data-video-url="${el.getAttribute("data-video-url") || ""}">`
      );
    });
    // Also look for elements containing "video" or "watch" in any attribute
    document.querySelectorAll('a[href*="video"], a[href*="watch"], a[href*="reel"]').forEach((a) => {
      results.push(
        `<a href="${(a as HTMLAnchorElement).href}" text="${(a as HTMLElement).innerText?.trim().substring(0, 80)}">`
      );
    });
    return results;
  });

  fs.writeFileSync(
    `${config.outputDir}/debug-video-elements.json`,
    JSON.stringify(videoElements, null, 2),
    "utf-8"
  );
  console.log(`🎬 ${videoElements.length} video-related elements dumped to output/debug-video-elements.json`);

  await browser.close();
  console.log("\n✅ Debug complete. Check the output/ folder for results.");
}

main().catch((err) => {
  console.error(`Fatal: ${err.message}`);
  process.exit(1);
});
