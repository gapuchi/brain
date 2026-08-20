export interface IncomingMessage {
  id: string;
  content: string;
  authorId: string;
  authorTag: string;
  isBot: boolean;
  isDm: boolean;
  guildId?: string;
  channelId: string;
  mentionedBot: boolean;
  attachmentUrls: string[];
}

export interface HandleDecision {
  handle: boolean;
  reason?: string;
}

export function decideHandleMessage(
  message: IncomingMessage,
  opts: {
    botUserId: string;
    allowedGuildIds: string[];
    allowedUserIds: string[];
    allowedChannelIds: string[];
    requireMention: boolean;
    hasSession: boolean;
  },
): HandleDecision {
  if (message.isBot) return { handle: false, reason: "bot-author" };
  if (message.authorId === opts.botUserId) {
    return { handle: false, reason: "self" };
  }
  if (
    opts.allowedUserIds.length > 0 &&
    !opts.allowedUserIds.includes(message.authorId)
  ) {
    return { handle: false, reason: "user-allowlist" };
  }
  if (!message.isDm) {
    if (
      opts.allowedGuildIds.length > 0 &&
      (!message.guildId || !opts.allowedGuildIds.includes(message.guildId))
    ) {
      return { handle: false, reason: "guild-allowlist" };
    }
    if (
      opts.allowedChannelIds.length > 0 &&
      !opts.allowedChannelIds.includes(message.channelId)
    ) {
      return { handle: false, reason: "channel-allowlist" };
    }
  }
  if (message.isDm || message.mentionedBot) {
    return { handle: true };
  }
  if (!opts.requireMention && opts.hasSession) {
    return { handle: true };
  }
  return { handle: false, reason: "not-addressed" };
}

export function stripBotMention(content: string, botUserId: string): string {
  return content
    .replaceAll(`<@${botUserId}>`, "")
    .replaceAll(`<@!${botUserId}>`, "")
    .trim();
}

export function buildCursorPrompt(message: IncomingMessage, botUserId: string): string {
  const text = stripBotMention(message.content, botUserId);
  const lines = [
    "You are a coding agent talking through Discord.",
    "Keep replies concise and Discord-markdown friendly.",
    `Author: ${message.authorTag} (${message.authorId})`,
    `Channel: ${message.channelId}`,
    `Message ID: ${message.id}`,
  ];
  if (message.guildId) lines.push(`Guild: ${message.guildId}`);
  if (message.attachmentUrls.length) {
    lines.push("Attachments:");
    for (const url of message.attachmentUrls) lines.push(`- ${url}`);
  }
  lines.push("", "User message:", text || "(no text)");
  return lines.join("\n");
}
