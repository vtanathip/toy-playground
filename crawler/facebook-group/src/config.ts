import * as fs from "fs";
import * as path from "path";

export interface Config {
  groupUrl: string;
  cookiesPath: string;
  outputDir: string;
  outputFile: string;
  scrollDelayMs: number;
  scrollTimeoutMs: number;
  headless: boolean;
  ytdlpCookiesPath: string;
  ytdlpOutputTemplate: string;
  downloadDir: string;
}

const DEFAULTS: Omit<Config, "groupUrl"> = {
  cookiesPath: "./cookies.json",
  outputDir: "./output",
  outputFile: "video-urls.txt",
  scrollDelayMs: 2000,
  scrollTimeoutMs: 10000,
  headless: false,
  ytdlpCookiesPath: "./output/cookies.txt",
  ytdlpOutputTemplate: "%(title)s_%(id)s.%(ext)s",
  downloadDir: "./downloads",
};

export function loadConfig(configPath?: string): Config {
  const resolvedPath = path.resolve(configPath ?? "./config.json");

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(
      `Config file not found: ${resolvedPath}\n` +
        `Create a config.json based on the provided template.`
    );
  }

  const raw = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));

  if (!raw.groupUrl || typeof raw.groupUrl !== "string") {
    throw new Error(
      `"groupUrl" is required in config.json and must be a string.\n` +
        `Example: "https://www.facebook.com/groups/YOUR_GROUP_ID/guides/"`
    );
  }

  const config: Config = {
    groupUrl: raw.groupUrl,
    cookiesPath: raw.cookiesPath ?? DEFAULTS.cookiesPath,
    outputDir: raw.outputDir ?? DEFAULTS.outputDir,
    outputFile: raw.outputFile ?? DEFAULTS.outputFile,
    scrollDelayMs: raw.scrollDelayMs ?? DEFAULTS.scrollDelayMs,
    scrollTimeoutMs: raw.scrollTimeoutMs ?? DEFAULTS.scrollTimeoutMs,
    headless: raw.headless ?? DEFAULTS.headless,
    ytdlpCookiesPath: raw.ytdlpCookiesPath ?? DEFAULTS.ytdlpCookiesPath,
    ytdlpOutputTemplate:
      raw.ytdlpOutputTemplate ?? DEFAULTS.ytdlpOutputTemplate,
    downloadDir: raw.downloadDir ?? DEFAULTS.downloadDir,
  };

  // Resolve relative paths against the config file's directory
  const baseDir = path.dirname(resolvedPath);
  config.cookiesPath = path.resolve(baseDir, config.cookiesPath);
  config.outputDir = path.resolve(baseDir, config.outputDir);
  config.ytdlpCookiesPath = path.resolve(baseDir, config.ytdlpCookiesPath);
  config.downloadDir = path.resolve(baseDir, config.downloadDir);

  return config;
}

/** Map browser export sameSite values to Playwright's expected format */
function normalizeSameSite(value: string): "Strict" | "Lax" | "None" {
  switch (value.toLowerCase()) {
    case "strict":
      return "Strict";
    case "lax":
      return "Lax";
    case "none":
    case "no_restriction":
      return "None";
    case "unspecified":
    default:
      return "Lax";
  }
}

export function loadCookies(
  cookiesPath: string
): Array<{
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "Strict" | "Lax" | "None";
}> {
  if (!fs.existsSync(cookiesPath)) {
    throw new Error(
      `Cookies file not found: ${cookiesPath}\n` +
        `Export cookies from your browser and save them as JSON.\n` +
        `See cookies.example.json for the expected format.`
    );
  }

  const cookies = JSON.parse(fs.readFileSync(cookiesPath, "utf-8"));

  if (!Array.isArray(cookies)) {
    throw new Error(
      `Cookies file must contain a JSON array. See cookies.example.json for format.`
    );
  }

  return cookies.map((c: Record<string, unknown>) => ({
    name: String(c.name ?? ""),
    value: String(c.value ?? ""),
    domain: String(c.domain ?? ".facebook.com"),
    path: String(c.path ?? "/"),
    expires: Number(c.expires ?? c.expirationDate ?? -1),
    httpOnly: Boolean(c.httpOnly),
    secure: Boolean(c.secure ?? true),
    sameSite: normalizeSameSite(String(c.sameSite ?? "")),
  }));
}
