import { describe, expect, it } from "vitest";
import {
  chunkDiscordContent,
  formatRunReply,
  threadNameFromPrompt,
} from "../src/discord/format.ts";

describe("chunkDiscordContent", () => {
  it("returns empty for blank text", () => {
    expect(chunkDiscordContent("  ")).toEqual([]);
  });

  it("keeps short text as one chunk", () => {
    expect(chunkDiscordContent("hello")).toEqual(["hello"]);
  });

  it("splits on newlines when possible", () => {
    const text = `${"a".repeat(40)}\n${"b".repeat(40)}`;
    expect(chunkDiscordContent(text, 50)).toEqual([
      "a".repeat(40),
      "b".repeat(40),
    ]);
  });
});

describe("threadNameFromPrompt", () => {
  it("prefixes a truncated prompt", () => {
    expect(threadNameFromPrompt("  fix   auth  ")).toBe("cursor: fix auth");
  });
});

describe("formatRunReply", () => {
  it("prefers errors", () => {
    expect(formatRunReply({ error: "boom", text: "ok" })).toBe(
      "Cursor run failed: boom",
    );
  });

  it("appends PR urls", () => {
    expect(
      formatRunReply({
        text: "Opened a PR.",
        prUrls: ["https://github.com/org/repo/pull/1"],
      }),
    ).toContain("PR: https://github.com/org/repo/pull/1");
  });
});
