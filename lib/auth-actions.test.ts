import { afterEach, describe, expect, it, vi } from "vitest";

// signOut talks to Supabase and Next, so both are replaced with stand-ins
// that record what they were asked. vi.hoisted: vi.mock runs before the
// imports below, so the stand-in has to exist by then too.
const { signOutMock, logAuthErrorMock } = vi.hoisted(() => ({
  signOutMock: vi.fn(),
  logAuthErrorMock: vi.fn(),
}));

vi.mock("./auth-log", () => ({ logAuthError: logAuthErrorMock }));
// lib/demo.ts is "server-only", which refuses to load outside Next.js.
vi.mock("./demo", () => ({ isDemoEmail: () => false }));

vi.mock("./supabase/server", () => ({
  createClient: async () => ({ auth: { signOut: signOutMock } }),
}));
// Next's real redirect() works by throwing; this one throws too, so the
// test can see where it went.
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));
vi.mock("next/headers", () => ({ headers: vi.fn() }));

import { signOut } from "./auth-actions";

afterEach(() => {
  signOutMock.mockReset();
  logAuthErrorMock.mockReset();
});

describe("signOut", () => {
  it("logs out this device only, then goes to the login screen", async () => {
    signOutMock.mockResolvedValue({ error: null });
    await expect(signOut()).rejects.toThrow("redirect:/login");
    expect(signOutMock).toHaveBeenCalledOnce();
    expect(signOutMock).toHaveBeenCalledWith({ scope: "local" });
    expect(logAuthErrorMock).not.toHaveBeenCalled();
  });

  it("still goes to the login screen when Supabase reports a problem (the cookie is already gone)", async () => {
    const problem = { message: "Failed to fetch", status: 0 };
    signOutMock.mockResolvedValue({ error: problem });
    await expect(signOut()).rejects.toThrow("redirect:/login");
    // Asked once, locally: no second try with another scope.
    expect(signOutMock).toHaveBeenCalledOnce();
    expect(signOutMock).toHaveBeenCalledWith({ scope: "local" });
    expect(logAuthErrorMock).toHaveBeenCalledWith("signOut", problem);
  });
});
