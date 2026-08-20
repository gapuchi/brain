import { describe, expect, it, vi } from "vitest";
import type { AppConfig } from "../src/config.ts";
import { CursorDispatcher } from "../src/cursor/dispatcher.ts";
import type { SessionRecord } from "../src/sessions/store.ts";

const config: AppConfig = {
  discordToken: "discord",
  cursorApiKey: "cursor",
  cursorRuntime: "cloud",
  cursorModel: "composer-2.5",
  cursorRepoUrl: "https://github.com/org/repo",
  cursorRepoRef: "main",
  cursorAutoCreatePr: true,
  cursorLocalCwd: ".",
  allowedGuildIds: [],
  allowedUserIds: [],
  allowedChannelIds: [],
  requireMention: false,
  dataDir: "./data",
};

describe("CursorDispatcher", () => {
  it("creates on first message and resumes afterward", async () => {
    const sessions = new Map<string, SessionRecord>();
    const store = {
      get: async (key: string) => sessions.get(key),
      set: async (key: string, record: SessionRecord) => {
        sessions.set(key, record);
      },
    };

    const send = vi.fn(async () => ({
      wait: async () => ({
        status: "finished" as const,
        result: "ok",
        git: { branches: [{ repoUrl: "https://github.com/org/repo", prUrl: "https://example/pr/1" }] },
      }),
    }));

    const create = vi.fn(async () => ({ agentId: "bc-new", send }));
    const resume = vi.fn(async () => ({ agentId: "bc-new", send }));

    const dispatcher = new CursorDispatcher(config, store, {
      create: create as never,
      resume: resume as never,
    });

    const first = await dispatcher.runPrompt("thread-1", "hello");
    expect(create).toHaveBeenCalledOnce();
    expect(resume).not.toHaveBeenCalled();
    expect(first.prUrls).toEqual(["https://example/pr/1"]);
    expect(sessions.get("thread-1")?.agentId).toBe("bc-new");

    dispatcher["handles"].clear();
    const second = await dispatcher.runPrompt("thread-1", "follow up");
    expect(resume).toHaveBeenCalledWith("bc-new", { apiKey: "cursor" });
    expect(second.text).toBe("ok");
  });

  it("serializes runs for the same session", async () => {
    const order: string[] = [];
    const store = {
      get: async () => undefined,
      set: async () => undefined,
    };
    let releaseFirst!: () => void;
    const firstWait = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const send = vi
      .fn()
      .mockImplementationOnce(async () => ({
        wait: async () => {
          order.push("first-start");
          await firstWait;
          order.push("first-end");
          return { status: "finished" as const, result: "1" };
        },
      }))
      .mockImplementationOnce(async () => ({
        wait: async () => {
          order.push("second");
          return { status: "finished" as const, result: "2" };
        },
      }));

    const dispatcher = new CursorDispatcher(config, store, {
      create: (async () => ({ agentId: "bc-1", send })) as never,
      resume: vi.fn() as never,
    });

    const a = dispatcher.runPrompt("s", "one");
    const b = dispatcher.runPrompt("s", "two");
    await Promise.resolve();
    releaseFirst();
    await Promise.all([a, b]);
    expect(order).toEqual(["first-start", "first-end", "second"]);
  });
});
