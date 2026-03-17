# Facebook Group Video Crawler & Downloader

Crawl all video links from a Facebook Group's **Learning Content** tab and batch download them using **yt-dlp**.

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- A Facebook account with access to the target group
- Chrome browser (for exporting cookies)

## Step-by-Step Guide

### 1. Export Facebook Cookies

This tool needs your Facebook session cookies to authenticate. We use the **Get cookies.txt locally** Chrome extension to export them.

1. Install the extension from Chrome Web Store:
   [Get cookies.txt locally](https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc)

2. Log in to [facebook.com](https://www.facebook.com) in Chrome

3. Click the **Get cookies.txt locally** extension icon in the toolbar

4. Select **Export as JSON** (not the Netscape `.txt` format)

5. Save the exported file as `cookies.json` in the project root:
   ```
   crawler/facebook-group/cookies.json
   ```

> **Note:** `cookies.json` is gitignored and will never be committed. It contains your session tokens — keep it private.

### 2. Install Dependencies

```bash
cd crawler/facebook-group
npm install
npx playwright install chromium
```

### 3. Configure

Edit `config.json` to point to your Facebook Group:

```json
{
    "groupUrl": "https://www.facebook.com/groups/YOUR_GROUP_ID/learning_content",
    "cookiesPath": "./cookies.json",
    "outputDir": "./output",
    "outputFile": "video-urls.txt",
    "scrollDelayMs": 2000,
    "scrollTimeoutMs": 10000,
    "headless": false,
    "ytdlpCookiesPath": "./output/cookies.txt",
    "ytdlpOutputTemplate": "%(title)s_%(id)s.%(ext)s",
    "downloadDir": "./downloads"
}
```

| Option | Description | Default |
|---|---|---|
| `groupUrl` | **(Required)** Full URL to the group's Learning Content page | — |
| `cookiesPath` | Path to the exported JSON cookies file | `./cookies.json` |
| `outputDir` | Directory for crawl output files | `./output` |
| `outputFile` | Filename for the list of discovered video URLs | `video-urls.txt` |
| `scrollDelayMs` | Delay (ms) between scroll actions during infinite scroll | `2000` |
| `scrollTimeoutMs` | Max wait (ms) before giving up on finding new content | `10000` |
| `headless` | Run the browser in headless mode (`true`/`false`) | `false` |
| `ytdlpCookiesPath` | Output path for the Netscape-format cookies file (for yt-dlp) | `./output/cookies.txt` |
| `ytdlpOutputTemplate` | yt-dlp output filename template | `%(title)s_%(id)s.%(ext)s` |
| `downloadDir` | Directory where downloaded videos are saved | `./downloads` |

### 4. Crawl Video URLs

Run the crawler to discover all video URLs from the group's Learning Content:

```bash
npm run crawl
```

This will:
1. Launch a Chromium browser with your cookies
2. Navigate to the Learning Content page
3. Scroll to discover all categories and posts
4. Visit each post and extract video URLs via network interception
5. Save the list to `output/video-urls.txt`

> **Tip:** Set `"headless": false` in config to watch the browser — useful for debugging. Set to `true` for unattended runs.

### 5. Download yt-dlp

Download the latest `yt-dlp.exe` binary into the project directory:

```powershell
# PowerShell
.\download-ytdlp.ps1
```

Or download manually from [yt-dlp releases](https://github.com/yt-dlp/yt-dlp/releases) and place `yt-dlp.exe` in the project root.

> On macOS/Linux, install via `brew install yt-dlp` or `pip install yt-dlp` instead.

### 6. Convert Cookies for yt-dlp

Convert the JSON cookies to Netscape format (required by yt-dlp):

```bash
npm run convert-cookies
```

This writes `output/cookies.txt` in the Netscape HTTP Cookie File format.

### 7. Download Videos

```bash
npm run download
```

This will:
1. Read the URL list from `output/video-urls.txt`
2. Check `downloads/` for already-downloaded videos and skip them
3. Download remaining videos using yt-dlp with your Facebook cookies
4. Save videos to the `downloads/` directory

Re-running the command is safe — it skips videos that have already been downloaded.

## Full Workflow (Quick Reference)

```bash
# 1. Install
npm install && npx playwright install chromium

# 2. Place your cookies.json (exported from the Chrome extension)

# 3. Crawl
npm run crawl

# 4. Get yt-dlp (first time only)
powershell -File .\download-ytdlp.ps1

# 5. Convert cookies for yt-dlp
npm run convert-cookies

# 6. Download all videos
npm run download
```

## Troubleshooting

### Crawler finds 0 videos
- Make sure your `cookies.json` is fresh — Facebook sessions expire. Re-export from the extension.
- Ensure the `groupUrl` ends with `/learning_content`.
- Try with `"headless": false` to see what the browser is doing.

### yt-dlp says "Cannot parse data" for a URL
- The video may have been deleted or the ID is invalid. The downloader uses `--ignore-errors` to skip these automatically.

### All files named "Video.mp4"
- Facebook returns a generic "Video" title. The default template `%(title)s_%(id)s.%(ext)s` appends the video ID to ensure unique filenames.

### Cookie expiration
- Facebook cookies typically expire after a few months. If crawling or downloading fails with auth errors, re-export fresh cookies from the Chrome extension.

## Project Structure

```
crawler/facebook-group/
├── config.json              # Configuration (edit this)
├── cookies.json             # Your Facebook cookies (gitignored)
├── cookies.example.json     # Example cookie format
├── download-ytdlp.ps1      # Script to download yt-dlp.exe
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts             # Main entry — runs the crawler
│   ├── crawler.ts           # Playwright crawler logic
│   ├── config.ts            # Config loading & cookie parsing
│   ├── convert-cookies.ts   # JSON → Netscape cookie converter
│   ├── download.ts          # yt-dlp batch downloader
│   ├── debug.ts             # Debug utility — dump page DOM
│   └── debug-post.ts        # Debug utility — inspect a single post
├── output/                  # Crawl outputs (gitignored)
│   ├── video-urls.txt       # Discovered video URLs
│   └── cookies.txt          # Netscape-format cookies for yt-dlp
└── downloads/               # Downloaded videos (gitignored)
```
