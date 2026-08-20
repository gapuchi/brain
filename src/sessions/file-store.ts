import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SessionRecord, SessionStore } from "./store.ts";

interface FileShape {
  sessions: Record<string, SessionRecord>;
}

export class FileSessionStore implements SessionStore {
  private readonly filePath: string;
  private writeChain: Promise<void> = Promise.resolve();

  constructor(dataDir: string) {
    this.filePath = path.join(dataDir, "sessions.json");
  }

  async get(sessionKey: string): Promise<SessionRecord | undefined> {
    const data = await this.read();
    return data.sessions[sessionKey];
  }

  async set(sessionKey: string, record: SessionRecord): Promise<void> {
    this.writeChain = this.writeChain.then(async () => {
      const data = await this.read();
      data.sessions[sessionKey] = record;
      await mkdir(path.dirname(this.filePath), { recursive: true });
      await writeFile(this.filePath, JSON.stringify(data, null, 2));
    });
    await this.writeChain;
  }

  private async read(): Promise<FileShape> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as FileShape;
      return { sessions: parsed.sessions ?? {} };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { sessions: {} };
      }
      throw error;
    }
  }
}
