# Discord Cursor Agent

A Discord bot that talks to Cursor. Mention it (or DM it) with a task; it runs an agent and replies in Discord.

Each Discord thread or DM is one ongoing Cursor conversation. Follow-ups stay on that same agent.

## Setup

1. Create a Discord bot at the [Discord Developer Portal](https://discord.com/developers/applications). Enable **Message Content Intent**, then invite it with permission to read and send messages, including in threads.
2. Create a Cursor API key at [Cursor Dashboard → API Keys](https://cursor.com/dashboard/api).
3. Copy `.env.example` to `.env` and fill in:

| Variable | Purpose |
|---|---|
| `DISCORD_TOKEN` | Discord bot token |
| `CURSOR_API_KEY` | Cursor API key |
| `CURSOR_RUNTIME` | `cloud` (default) or `local` |
| `CURSOR_REPO_URL` | Repo for cloud agents. Omit for a no-repo agent |
| `CURSOR_REPO_REF` | Starting git ref (default `main`) |
| `CURSOR_AUTO_CREATE_PR` | `true` to open a PR when a cloud run finishes |
| `CURSOR_LOCAL_CWD` | Working tree for local runtime |
| `DISCORD_ALLOWED_GUILD_IDS` | Optional server allowlist |
| `DISCORD_ALLOWED_USER_IDS` | Optional user allowlist |
| `DISCORD_ALLOWED_CHANNEL_IDS` | Optional channel allowlist |

4. Install dependencies and start the bot:

```bash
npm install
npm start
```

Restrict the allowlists before using this outside a private server.

## Usage

- Mention the bot in a channel. It starts a thread and replies there.
- Keep talking in that thread to continue the same agent.
- DMs work the same way, using the DM as the conversation.
