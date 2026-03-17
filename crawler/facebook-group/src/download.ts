import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { loadConfig } from "./config";

function main(): void {
  const config = loadConfig();

  const urlFilePath = path.resolve(config.outputDir, config.outputFile);

  if (!fs.existsSync(urlFilePath)) {
    console.error(
      `❌ URL file not found: ${urlFilePath}\n` +
        `   Run "npm run crawl" first to collect video URLs.`
    );
    process.exit(1);
  }

  if (!fs.existsSync(config.ytdlpCookiesPath)) {
    console.error(
      `❌ Netscape cookies file not found: ${config.ytdlpCookiesPath}\n` +
        `   Run "npm run convert-cookies" first to generate it.`
    );
    process.exit(1);
  }

  // Ensure download directory exists
  if (!fs.existsSync(config.downloadDir)) {
    fs.mkdirSync(config.downloadDir, { recursive: true });
  }

  // Filter out URLs whose videos are already downloaded
  const urls = fs
    .readFileSync(urlFilePath, "utf-8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const existingFiles = fs.existsSync(config.downloadDir)
    ? fs.readdirSync(config.downloadDir)
    : [];

  const pendingUrls = urls.filter((url) => {
    const match = url.match(/[?&]v=(\d+)/);
    if (!match) return true;
    return !existingFiles.some((f) => f.includes(match[1]));
  });

  if (pendingUrls.length === 0) {
    console.log("✅ All videos already downloaded. Nothing to do.");
    return;
  }

  console.log(
    `📊 ${urls.length} total URLs, ${urls.length - pendingUrls.length} already downloaded, ${pendingUrls.length} remaining`
  );

  // Write filtered URLs to a temp batch file
  const tempBatchFile = path.resolve(config.outputDir, "pending-urls.txt");
  fs.writeFileSync(tempBatchFile, pendingUrls.join("\n") + "\n", "utf-8");

  const outputTemplate = path.join(
    config.downloadDir,
    config.ytdlpOutputTemplate
  );

  const args = [
    "--batch-file",
    tempBatchFile,
    "--cookies",
    config.ytdlpCookiesPath,
    "-o",
    outputTemplate,
    "--no-overwrites",
    "--continue",
    "--ignore-errors",
    "--progress",
    "--restrict-filenames",
  ];

  console.log("🎬 Starting yt-dlp batch download...");
  console.log(`   URL file:  ${urlFilePath}`);
  console.log(`   Cookies:   ${config.ytdlpCookiesPath}`);
  console.log(`   Output to: ${config.downloadDir}`);
  console.log(`   Command:   yt-dlp ${args.join(" ")}\n`);

  // Prefer local yt-dlp.exe, fall back to system PATH
  const localYtdlp = path.resolve(__dirname, "..", "yt-dlp.exe");
  const ytdlpBin = fs.existsSync(localYtdlp) ? localYtdlp : "yt-dlp";

  const proc = spawn(ytdlpBin, args, {
    stdio: "inherit",
  });

  proc.on("close", (code) => {
    if (code === 0) {
      console.log("\n✅ Download complete!");
    } else {
      console.error(`\n⚠️ yt-dlp exited with code ${code}`);
    }
  });

  proc.on("error", (err) => {
    console.error(
      `❌ Failed to start yt-dlp: ${err.message}\n` +
        `   Make sure yt-dlp is installed: https://github.com/yt-dlp/yt-dlp#installation`
    );
    process.exit(1);
  });
}

main();
