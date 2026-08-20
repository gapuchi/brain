import { describe, expect, it } from "vitest";
import {
  buildCursorPrompt,
  decideHandleMessage,
  stripBotMention,
  type IncomingMessage,
} from "../src/discord/policy.ts";

const base: IncomingMessage = {
  id: "m1",
  content: "hello",
  authorId: "user-1",
  authorTag: "user#0001",
  isBot: false,
  isDm: false,
  guildId: "guild-1",
  channelId: "channel-1",
  mentionedBot: false,
  attachmentUrls: [],
};

const allow = {
  botUserId: "bot-1",
  allowedGuildIds: [] as string[],
  allowedUserIds: [] as string[],
  allowedChannelIds: [] as string[],
  requireMention: false,
  hasSession: false,
};

describe("decideHandleMessage", () => {
  it("ignores other bots", () => {
    expect(
      decideHandleMessage({ ...base, isBot: true }, allow).handle,
    ).toBe(false);
  });

  it("handles DMs", () => {
    expect(decideHandleMessage({ ...base, isDm: true }, allow).handle).toBe(
      true,
    );
  });

  it("handles mentions", () => {
    expect(
      decideHandleMessage({ ...base, mentionedBot: true }, allow).handle,
    ).toBe(true);
  });

  it("handles thread follow-ups when a session exists", () => {
    expect(
      decideHandleMessage(base, { ...allow, hasSession: true }).handle,
    ).toBe(true);
  });

  it("ignores ambient channel chatter", () => {
    expect(decideHandleMessage(base, allow).reason).toBe("not-addressed");
  });

  it("enforces user allowlists", () => {
    expect(
      decideHandleMessage(base, {
        ...allow,
        allowedUserIds: ["someone-else"],
        hasSession: true,
      }).reason,
    ).toBe("user-allowlist");
  });
});

describe("prompt packaging", () => {
  it("strips bot mentions", () => {
    expect(stripBotMention("<@bot-1> fix tests", "bot-1")).toBe("fix tests");
  });

  it("includes author and attachments", () => {
    const prompt = buildCursorPrompt(
      {
        ...base,
        content: "<@bot-1> look",
        attachmentUrls: ["https://cdn.example/file.png"],
      },
      "bot-1",
    );
    expect(prompt).toContain("Author: user#0001 (user-1)");
    expect(prompt).toContain("https://cdn.example/file.png");
    expect(prompt).toContain("look");
  });
});
