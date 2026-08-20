import { config as loadEnv } from "dotenv";
import { bool, cleanEnv, makeExactValidator, str } from "envalid";

loadEnv();

const csv = makeExactValidator<string[]>((input) =>
  input
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean),
);

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
  const env = cleanEnv(process.env, {
    DISCORD_TOKEN: str(),
    CURSOR_API_KEY: str(),
    CURSOR_RUNTIME: str({ choices: ["cloud", "local"], default: "cloud" }),
    CURSOR_MODEL: str({ default: "composer-2.5" }),
    CURSOR_REPO_URL: str({ default: "" }),
    CURSOR_REPO_REF: str({ default: "main" }),
    CURSOR_AUTO_CREATE_PR: bool({ default: false }),
    CURSOR_LOCAL_CWD: str({ default: process.cwd() }),
    DISCORD_ALLOWED_GUILD_IDS: csv({ default: [] }),
    DISCORD_ALLOWED_USER_IDS: csv({ default: [] }),
    DISCORD_ALLOWED_CHANNEL_IDS: csv({ default: [] }),
    DISCORD_REQUIRE_MENTION: bool({ default: false }),
    DATA_DIR: str({ default: "./data" }),
  });

  return {
    discordToken: env.DISCORD_TOKEN,
    cursorApiKey: env.CURSOR_API_KEY,
    cursorRuntime: env.CURSOR_RUNTIME,
    cursorModel: env.CURSOR_MODEL,
    cursorRepoUrl: env.CURSOR_REPO_URL || undefined,
    cursorRepoRef: env.CURSOR_REPO_REF,
    cursorAutoCreatePr: env.CURSOR_AUTO_CREATE_PR,
    cursorLocalCwd: env.CURSOR_LOCAL_CWD,
    allowedGuildIds: env.DISCORD_ALLOWED_GUILD_IDS,
    allowedUserIds: env.DISCORD_ALLOWED_USER_IDS,
    allowedChannelIds: env.DISCORD_ALLOWED_CHANNEL_IDS,
    requireMention: env.DISCORD_REQUIRE_MENTION,
    dataDir: env.DATA_DIR,
  };
}
