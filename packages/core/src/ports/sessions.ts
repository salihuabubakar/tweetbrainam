export type SessionStore = {
  create(userId: string, ttlSeconds: number): Promise<string>;
  getUserId(sessionId: string): Promise<string | null>;
  destroy(sessionId: string): Promise<void>;
};

export type OAuthStateStore = {
  save(state: string, codeVerifier: string, ttlSeconds: number): Promise<void>;
  consume(state: string): Promise<string | null>;
};
