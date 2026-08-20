import { loadConfig } from "./config.ts";
import { CursorDispatcher } from "./cursor/dispatcher.ts";
import { startDiscordBot } from "./discord/bot.ts";
import { FileSessionStore } from "./sessions/file-store.ts";

const config = loadConfig();
const sessions = new FileSessionStore(config.dataDir);
const dispatcher = new CursorDispatcher(config, sessions);

startDiscordBot({ config, dispatcher, sessions });

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    process.exit(0);
  });
}
