import { afterEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { UnrecognizedActionError } from "next/dist/client/components/unrecognized-action-error";
import {
  UPDATED_MESSAGE,
  failureMessage,
  keepOnFailure,
  refreshIfReachable,
  tapAgain,
} from "./action-call";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const logIt = tapAgain("log it", "Log it", "Check Today");
const save = tapAgain("save", "Save changes");

describe("failureMessage", () => {
  it("offline: says it never left, and which button to tap again", () => {
    expect(failureMessage(save, false)).toBe(
      "Couldn't save: no connection. Check your connection, then tap Save changes again.",
    );
    expect(failureMessage(logIt, false)).toBe(
      "Couldn't log it: no connection. Check your connection, then tap Log it again.",
    );
  });

  it("dropped on the way, safe to repeat: just try again", () => {
    expect(failureMessage(save, true)).toBe(
      "Couldn't save: the connection dropped. Please tap Save changes again.",
    );
  });

  it("dropped on the way, adds something: look first, it may be there already", () => {
    expect(failureMessage(logIt, true)).toBe(
      "The connection dropped, so it may have worked anyway. Check Today before you tap Log it again.",
    );
  });
});

describe("refreshIfReachable", () => {
  it("refreshes once the server answers", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 200 })));
    const refresh = vi.fn();
    await refreshIfReachable(refresh);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("leaves the page alone while the connection is still dead", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    const refresh = vi.fn();
    await refreshIfReachable(refresh);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("leaves the page alone when the server answers with an error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 503 })));
    const refresh = vi.fn();
    await refreshIfReachable(refresh);
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("keepOnFailure", () => {
  it("passes the arguments through and gives back the action's own result", async () => {
    const action = vi.fn(async (a: number, b: string) => ({ ok: true, message: `${a}${b}` }));
    const safe = keepOnFailure(action, save);
    await expect(safe(1, "x")).resolves.toEqual({ ok: true, message: "1x" });
    expect(action).toHaveBeenCalledWith(1, "x");
  });

  it("keeps the action's own failure message (from the server)", async () => {
    const safe = keepOnFailure(async () => ({ ok: false, message: "Couldn't log it." }), logIt);
    await expect(safe()).resolves.toEqual({ ok: false, message: "Couldn't log it." });
  });

  it("offline: a message instead of throwing, and nothing to reload", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("navigator", { onLine: false });
    const afterDrop = vi.fn();
    const safe = keepOnFailure(
      async (): Promise<{ ok: boolean; message?: string }> => {
        throw new TypeError("Failed to fetch");
      },
      logIt,
      afterDrop,
    );
    await expect(safe()).resolves.toEqual({ ok: false, message: failureMessage(logIt, false) });
    expect(afterDrop).not.toHaveBeenCalled();
  });

  it("dropped while online: the 'look first' message, and afterDrop runs", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("navigator", { onLine: true });
    const afterDrop = vi.fn();
    const safe = keepOnFailure(
      async (): Promise<{ ok: boolean; message?: string }> => {
        throw new TypeError("Failed to fetch");
      },
      logIt,
      afterDrop,
    );
    await expect(safe()).resolves.toEqual({ ok: false, message: failureMessage(logIt, true) });
    expect(afterDrop).toHaveBeenCalledOnce();
  });

  it("an app older than the server says to reopen it, not to check the connection", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const safe = keepOnFailure(async (): Promise<{ ok: boolean; message?: string }> => {
      throw new UnrecognizedActionError("Server Action not found");
    }, save);
    await expect(safe()).resolves.toEqual({ ok: false, message: UPDATED_MESSAGE });
  });

  it("lets Next's redirects through, so logging in still moves on", async () => {
    const safe = keepOnFailure(async (): Promise<{ ok: boolean }> => {
      redirect("/");
    }, save);
    await expect(safe()).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_REDIRECT") });
  });
});
