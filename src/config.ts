import { config as loadEnv } from "dotenv";

loadEnv();

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

function optional(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function csv(name: string): string[] {
  const value = optional(name);
  if (!value) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function bool(name: string, fallback: boolean): boolean {
  const value = optional(name);
  if (value === undefined) return fallback;
  return value === "1" || value.toLowerCase() === "true";
}

export type CursorRuntime = "cloud" | "local";

export interface AppConfig {
  discordToken: string;
  cursorApiKey: string;
  cursorRuntime: CursorRuntime;
  cursorModel: string;
  cursorRepoUrl?: string;
  cursorRepoRef: string;
  cursorAutoCreatePr: boolean;
  cursorLocalCwd: string;
  allowedGuildIds: string[];
  allowedUserIds: string[];
  allowedChannelIds: string[];
  requireMention: boolean;
  dataDir: string;
}

export function loadConfig(): AppConfig {
  const runtime = (optional("CURSOR_RUNTIME") ?? "cloud").toLowerCase();
  if (runtime !== "cloud" && runtime !== "local") {
    throw new Error("CURSOR_RUNTIME must be 'cloud' or 'local'");
  }

  return {
    discordToken: required("DISCORD_TOKEN"),
    cursorApiKey: required("CURSOR_API_KEY"),
    cursorRuntime: runtime,
    cursorModel: optional("CURSOR_MODEL") ?? "composer-2.5",
    cursorRepoUrl: optional("CURSOR_REPO_URL"),
    cursorRepoRef: optional("CURSOR_REPO_REF") ?? "main",
    cursorAutoCreatePr: bool("CURSOR_AUTO_CREATE_PR", false),
    cursorLocalCwd: optional("CURSOR_LOCAL_CWD") ?? process.cwd(),
    allowedGuildIds: csv("DISCORD_ALLOWED_GUILD_IDS"),
    allowedUserIds: csv("DISCORD_ALLOWED_USER_IDS"),
    allowedChannelIds: csv("DISCORD_ALLOWED_CHANNEL_IDS"),
    requireMention: bool("DISCORD_REQUIRE_MENTION", false),
    dataDir: optional("DATA_DIR") ?? "./data",
  };
}
