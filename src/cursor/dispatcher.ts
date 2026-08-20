import { Agent, type SDKAgent } from "@cursor/sdk";
import type { AppConfig } from "../config.ts";
import type { SessionStore } from "../sessions/store.ts";

export interface CursorRunResult {
  agentId: string;
  status: "finished" | "error" | "cancelled";
  text?: string;
  error?: string;
  prUrls: string[];
}

type AgentFactory = {
  create: typeof Agent.create;
  resume: typeof Agent.resume;
};

export class CursorDispatcher {
  private readonly handles = new Map<string, SDKAgent>();
  private readonly queues = new Map<string, Promise<void>>();

  constructor(
    private readonly config: AppConfig,
    private readonly sessions: SessionStore,
    private readonly agents: AgentFactory = Agent,
  ) {}

  enqueue<T>(sessionKey: string, work: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(sessionKey) ?? Promise.resolve();
    let release!: (value: T) => void;
    let fail!: (error: unknown) => void;
    const result = new Promise<T>((resolve, reject) => {
      release = resolve;
      fail = reject;
    });
    const next = previous
      .catch(() => undefined)
      .then(async () => {
        try {
          release(await work());
        } catch (error) {
          fail(error);
        }
      });
    this.queues.set(sessionKey, next);
    return result;
  }

  async runPrompt(
    sessionKey: string,
    prompt: string,
    name?: string,
  ): Promise<CursorRunResult> {
    return this.enqueue(sessionKey, () => this.runPromptNow(sessionKey, prompt, name));
  }

  private async runPromptNow(
    sessionKey: string,
    prompt: string,
    name?: string,
  ): Promise<CursorRunResult> {
    const agent = await this.getAgent(sessionKey, name);
    const run = await agent.send(prompt);
    const result = await run.wait();
    const prUrls =
      result.git?.branches
        .map((branch) => branch.prUrl)
        .filter((url): url is string => Boolean(url)) ?? [];

    return {
      agentId: agent.agentId,
      status: result.status,
      text: result.result,
      error: result.error?.message,
      prUrls,
    };
  }

  private async getAgent(sessionKey: string, name?: string): Promise<SDKAgent> {
    const cached = this.handles.get(sessionKey);
    if (cached) return cached;

    const saved = await this.sessions.get(sessionKey);
    const agent = saved
      ? await this.agents.resume(saved.agentId, {
          apiKey: this.config.cursorApiKey,
        })
      : await this.agents.create({
          apiKey: this.config.cursorApiKey,
          model: { id: this.config.cursorModel },
          name,
          ...this.runtimeOptions(),
        });

    const now = Date.now();
    await this.sessions.set(sessionKey, {
      agentId: agent.agentId,
      createdAt: saved?.createdAt ?? now,
      updatedAt: now,
    });
    this.handles.set(sessionKey, agent);
    return agent;
  }

  private runtimeOptions() {
    if (this.config.cursorRuntime === "local") {
      return { local: { cwd: this.config.cursorLocalCwd } };
    }
    return {
      cloud: {
        repos: this.config.cursorRepoUrl
          ? [
              {
                url: this.config.cursorRepoUrl,
                startingRef: this.config.cursorRepoRef,
              },
            ]
          : [],
        autoCreatePR: this.config.cursorAutoCreatePr,
      },
    };
  }
}
