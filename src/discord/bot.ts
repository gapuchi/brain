import {
  ChannelType,
  Client,
  GatewayIntentBits,
  Partials,
  type Message,
  type TextBasedChannel,
} from "discord.js";
import type { AppConfig } from "../config.ts";
import type { CursorDispatcher } from "../cursor/dispatcher.ts";
import type { SessionStore } from "../sessions/store.ts";
import { chunkDiscordContent, formatRunReply, threadNameFromPrompt } from "./format.ts";
import {
  buildCursorPrompt,
  decideHandleMessage,
  stripBotMention,
  type IncomingMessage,
} from "./policy.ts";

const processed = new Set<string>();

export function startDiscordBot(opts: {
  config: AppConfig;
  dispatcher: CursorDispatcher;
  sessions: SessionStore;
}): Client {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel],
  });

  client.once("clientReady", () => {
    console.log(`Discord connected as ${client.user?.tag}`);
  });

  client.on("messageCreate", (message) => {
    void handleMessage(message, opts, client);
  });

  void client.login(opts.config.discordToken);
  return client;
}

async function handleMessage(
  message: Message,
  opts: {
    config: AppConfig;
    dispatcher: CursorDispatcher;
    sessions: SessionStore;
  },
  client: Client,
): Promise<void> {
  if (!client.user) return;
  if (processed.has(message.id)) return;
  processed.add(message.id);
  if (processed.size > 10_000) processed.clear();

  const incoming = toIncoming(message, client.user.id);
  const sessionHint = incoming.isDm
    ? incoming.channelId
    : message.channel.isThread()
      ? message.channel.id
      : undefined;
  const hasSession = sessionHint
    ? Boolean(await opts.sessions.get(sessionHint))
    : false;

  const decision = decideHandleMessage(incoming, {
    botUserId: client.user.id,
    allowedGuildIds: opts.config.allowedGuildIds,
    allowedUserIds: opts.config.allowedUserIds,
    allowedChannelIds: opts.config.allowedChannelIds,
    requireMention: opts.config.requireMention,
    hasSession,
  });
  if (!decision.handle) return;

  const promptBody = stripBotMention(incoming.content, client.user.id);
  if (!promptBody && incoming.attachmentUrls.length === 0) return;

  let ack: Message | undefined;
  try {
    const { sessionKey, channel } = await openSession(message, incoming, promptBody);
    ack = channel.isSendable()
      ? await channel.send({ content: "Working…" })
      : undefined;
    const result = await opts.dispatcher.runPrompt(
      sessionKey,
      buildCursorPrompt(incoming, client.user.id),
      threadNameFromPrompt(promptBody),
    );
    const reply = formatRunReply({
      text: result.text,
      error: result.error,
      prUrls: result.prUrls,
      agentId: result.agentId,
    });
    await sendChunks(channel, reply, ack);
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    const reply = formatRunReply({ error: text });
    if (ack) {
      await ack.edit({ content: reply.slice(0, 2000) }).catch(() => undefined);
    } else {
      await message.reply({ content: reply.slice(0, 2000) }).catch(() => undefined);
    }
  }
}

async function openSession(
  message: Message,
  incoming: IncomingMessage,
  promptBody: string,
): Promise<{ sessionKey: string; channel: TextBasedChannel }> {
  if (incoming.isDm) {
    return { sessionKey: incoming.channelId, channel: message.channel };
  }
  if (message.channel.isThread()) {
    return { sessionKey: message.channel.id, channel: message.channel };
  }
  const thread = await message.startThread({
    name: threadNameFromPrompt(promptBody),
    autoArchiveDuration: 1440,
  });
  return { sessionKey: thread.id, channel: thread };
}

function toIncoming(message: Message, botUserId: string): IncomingMessage {
  return {
    id: message.id,
    content: message.content,
    authorId: message.author.id,
    authorTag: message.author.tag,
    isBot: message.author.bot,
    isDm: message.channel.type === ChannelType.DM,
    guildId: message.guildId ?? undefined,
    channelId: message.channel.id,
    mentionedBot: message.mentions.users.has(botUserId),
    attachmentUrls: [...message.attachments.values()].map((file) => file.url),
  };
}

async function sendChunks(
  channel: TextBasedChannel,
  text: string,
  first?: Message,
): Promise<void> {
  const chunks = chunkDiscordContent(text);
  if (!chunks.length) return;
  if (first) {
    await first.edit({ content: chunks[0] });
  } else if (channel.isSendable()) {
    await channel.send({ content: chunks[0] });
  }
  for (const chunk of chunks.slice(1)) {
    if (channel.isSendable()) {
      await channel.send({ content: chunk });
    }
  }
}
