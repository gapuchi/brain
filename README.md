# Discord Cursor Agent

TypeScript bot that listens on Discord, sends work to a Cursor agent via `@cursor/sdk`, and posts the result back.

```text
Discord Gateway
  → mention / DM / thread follow-up
  → CursorDispatcher (create or resume)
  → Cursor SDK run
  → Discord reply (thread)
```

Each Discord thread (or DM channel) maps 1:1 to a durable Cursor agent. Follow-ups resume the same agent.

## Setup

1. Create a Discord application and bot at the [Discord Developer Portal](https://discord.com/developers/applications). Enable the **Message Content Intent**. Invite the bot with `bot` + `Send Messages`, `Read Message History`, `Create Public Threads`, and `Send Messages in Threads`.
2. Create a Cursor API key at [Cursor Dashboard → API Keys](https://cursor.com/dashboard/api).
3. Install Node.js 22.13+ and dependencies:

```bash
npm install
cp .env.example .env
```

4. Fill in `.env`:

| Variable | Purpose |
|---|---|
| `DISCORD_TOKEN` | Discord bot token |
| `CURSOR_API_KEY` | Cursor user or service-account key |
| `CURSOR_RUNTIME` | `cloud` (default) or `local` |
| `CURSOR_REPO_URL` | GitHub repo for cloud agents. Omit for a no-repo cloud agent |
| `CURSOR_REPO_REF` | Starting git ref (default `main`) |
| `CURSOR_AUTO_CREATE_PR` | `true` to open a PR when a cloud run finishes |
| `CURSOR_LOCAL_CWD` | Working tree for local runtime |
| `DISCORD_ALLOWED_GUILD_IDS` | Optional comma-separated server allowlist |
| `DISCORD_ALLOWED_USER_IDS` | Optional user allowlist |
| `DISCORD_ALLOWED_CHANNEL_IDS` | Optional channel allowlist |

```bash
npm start
```

## Usage

- Mention the bot in a channel: it starts a thread, creates a Cursor agent, and replies there.
- Replies in that thread continue the same agent (`Agent.resume`).
- DMs use the DM channel as the session.

## Layout

- `src/discord/bot.ts` — Gateway listener, ack, thread creation, replies
- `src/discord/policy.ts` — who to listen to and how to package prompts
- `src/cursor/dispatcher.ts` — `Agent.create` / `Agent.resume`, one run at a time per session
- `src/sessions/file-store.ts` — `data/sessions.json` map of Discord channel → Cursor agent id

## Notes

- Runs are serialized per thread so Discord spam cannot overlap Cursor's single-active-run limit.
- Set allowlists before exposing the bot past a private server.
- Cloud SDK sessions show up in Cursor under **Filter > Source > SDK**.
