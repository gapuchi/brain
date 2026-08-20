export const DISCORD_CONTENT_LIMIT = 2000;

export function chunkDiscordContent(
  text: string,
  limit = DISCORD_CONTENT_LIMIT,
): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const chunks: string[] = [];
  let remaining = trimmed;
  while (remaining.length > limit) {
    const window = remaining.slice(0, limit);
    const breakAt = Math.max(
      window.lastIndexOf("\n\n"),
      window.lastIndexOf("\n"),
      window.lastIndexOf(" "),
    );
    const splitAt = breakAt > limit * 0.5 ? breakAt : limit;
    chunks.push(remaining.slice(0, splitAt).trimEnd());
    remaining = remaining.slice(splitAt).trimStart();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

export function threadNameFromPrompt(prompt: string): string {
  const cleaned = prompt.replace(/\s+/g, " ").trim().slice(0, 80);
  return cleaned ? `cursor: ${cleaned}` : "cursor agent";
}

export function formatRunReply(input: {
  text?: string;
  error?: string;
  prUrls?: string[];
  agentId?: string;
}): string {
  if (input.error) {
    return `Cursor run failed: ${input.error}`;
  }

  const parts: string[] = [];
  if (input.text?.trim()) parts.push(input.text.trim());
  if (input.prUrls?.length) {
    parts.push(input.prUrls.map((url) => `PR: ${url}`).join("\n"));
  }
  if (!parts.length && input.agentId) {
    parts.push(`Done. Agent \`${input.agentId}\`.`);
  }
  return parts.join("\n\n") || "Done.";
}
