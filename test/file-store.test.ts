import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FileSessionStore } from "../src/sessions/file-store.ts";

describe("FileSessionStore", () => {
  it("round-trips a session", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "sessions-"));
    const store = new FileSessionStore(dir);
    await store.set("thread-1", {
      agentId: "bc-abc",
      createdAt: 1,
      updatedAt: 2,
    });
    await expect(store.get("thread-1")).resolves.toEqual({
      agentId: "bc-abc",
      createdAt: 1,
      updatedAt: 2,
    });
    const raw = await readFile(path.join(dir, "sessions.json"), "utf8");
    expect(JSON.parse(raw).sessions["thread-1"].agentId).toBe("bc-abc");
  });
});
