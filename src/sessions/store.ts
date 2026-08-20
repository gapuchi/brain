export interface SessionRecord {
  agentId: string;
  createdAt: number;
  updatedAt: number;
}

export interface SessionStore {
  get(sessionKey: string): Promise<SessionRecord | undefined>;
  set(sessionKey: string, record: SessionRecord): Promise<void>;
}
