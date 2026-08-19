import { describe, expect, it } from "vitest";
import type { EncryptedTokenSet } from "../domain/identity";
import type { XTokenSet } from "../ports/x-oauth-client";
import { type ResolveXAccessTokenDeps, resolveXAccessToken } from "./resolve-x-access-token";

const now = new Date("2026-08-18T12:00:00Z");
const encode = (value: string) => new TextEncoder().encode(value);

type Options = {
  expiresAt?: Date;
  refresh?: () => Promise<XTokenSet>;
  stored?: EncryptedTokenSet | null;
};

function makeDeps(options: Options = {}) {
  let tokens: EncryptedTokenSet | null =
    options.stored === undefined
      ? {
          accessTokenEnc: encode("old-access"),
          refreshTokenEnc: encode("old-refresh"),
          tokenExpiresAt: options.expiresAt ?? new Date("2026-08-18T13:00:00Z"),
        }
      : options.stored;

  const saved: EncryptedTokenSet[] = [];
  const disconnected: string[] = [];
  let refreshCalls = 0;

  const deps: ResolveXAccessTokenDeps = {
    tokens: {
      findTokens: async () => tokens,
      saveTokens: async (_id, next) => {
        saved.push(next);
        tokens = next;
      },
      markDisconnected: async (id) => {
        disconnected.push(id);
      },
    },
    xOAuth: {
      refreshTokens: async () => {
        refreshCalls += 1;
        if (options.refresh) return options.refresh();
        return { accessToken: "new-access", refreshToken: "new-refresh", expiresInSeconds: 7200 };
      },
    },
    cipher: {
      encrypt: (plain) => encode(plain),
      decrypt: (data) => new TextDecoder().decode(data),
    },
    clock: { now: () => now },
  };

  return { deps, saved, disconnected, getRefreshCalls: () => refreshCalls };
}

describe("resolveXAccessToken", () => {
  it("returns the stored token while it is still good", async () => {
    const { deps, getRefreshCalls } = makeDeps();

    expect(await resolveXAccessToken(deps, "acc-1")).toBe("old-access");
    expect(getRefreshCalls()).toBe(0);
  });

  it("refreshes and persists the rotated pair once the token is spent", async () => {
    const { deps, saved } = makeDeps({ expiresAt: new Date("2026-08-18T11:00:00Z") });

    expect(await resolveXAccessToken(deps, "acc-1")).toBe("new-access");
    expect(saved).toHaveLength(1);
    expect(new TextDecoder().decode(saved[0]?.refreshTokenEnc)).toBe("new-refresh");
    expect(saved[0]?.tokenExpiresAt).toEqual(new Date("2026-08-18T14:00:00Z"));
  });

  it("refreshes just before expiry rather than exactly at it", async () => {
    const { deps, getRefreshCalls } = makeDeps({
      expiresAt: new Date("2026-08-18T12:00:30Z"),
    });

    await resolveXAccessToken(deps, "acc-1");
    expect(getRefreshCalls()).toBe(1);
  });

  it("uses the winner's token when a concurrent refresh already rotated it", async () => {
    const { deps, disconnected } = makeDeps({ expiresAt: new Date("2026-08-18T11:00:00Z") });

    let attempt = 0;
    deps.xOAuth = {
      refreshTokens: async () => {
        attempt += 1;
        // Another worker rotated first, so this refresh token is already dead.
        await deps.tokens.saveTokens("acc-1", {
          accessTokenEnc: encode("winner-access"),
          refreshTokenEnc: encode("winner-refresh"),
          tokenExpiresAt: new Date("2026-08-18T14:00:00Z"),
        });
        throw new Error("invalid_grant");
      },
    };

    expect(await resolveXAccessToken(deps, "acc-1")).toBe("winner-access");
    expect(attempt).toBe(1);
    expect(disconnected).toEqual([]);
  });

  it("marks the connection expired when the refresh token is dead", async () => {
    const { deps, disconnected } = makeDeps({
      expiresAt: new Date("2026-08-18T11:00:00Z"),
      refresh: async () => {
        throw new Error("invalid_grant");
      },
    });

    expect(await resolveXAccessToken(deps, "acc-1")).toBeNull();
    expect(disconnected).toEqual(["acc-1"]);
  });

  it("returns null when the account has no stored tokens", async () => {
    const { deps, disconnected } = makeDeps({ stored: null });

    expect(await resolveXAccessToken(deps, "acc-1")).toBeNull();
    expect(disconnected).toEqual([]);
  });
});
