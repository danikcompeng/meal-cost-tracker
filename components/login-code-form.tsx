"use client";

// After "Email me a login code" (or "I already have a code"): tap the link
// in the email, or type the code from the same email here. In the app on
// an iPhone's home screen, typing the code is the way that works
// (lib/login-code.ts says why).

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { keepOnFailure, tapAgain } from "@/lib/action-call";
import { verifyLoginCode } from "@/lib/auth-actions";
import { errorId } from "./form-field";

export function LoginCodeForm({
  email,
  sent,
  onStartOver,
}: {
  email: string;
  /** True when we just sent the email; false for "I already have a code". */
  sent: boolean;
  onStartOver: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    // Offline: a message here instead of the error page. A right code
    // still moves on: its redirect goes through.
    // A dropped connection may have logged you in already (and used the
    // code up), so it says to reload first: logged in, that opens Today.
    keepOnFailure(verifyLoginCode, tapAgain("log in", "Log in", "Reload the page (or reopen the app)")),
    { ok: false },
  );
  // Kept here so a typo doesn't wipe all the digits: React empties a form's
  // fields after its action runs, even when it comes back with an error.
  const [code, setCode] = useState("");
  const error = state.fieldErrors?.code;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {/* break-words: a long address still fits a narrow phone. */}
      <p id="code-hint" className="break-words">
        {sent ? `Check ${email} for your login code.` : `Type the code we sent to ${email}.`}
      </p>
      {/* Which email the code was sent to: the server needs it to check. */}
      <input type="hidden" name="email" value={email} />
      <div className="space-y-1.5">
        <Label htmlFor="code">Code from the email</Label>
        <Input
          id="code"
          name="code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          // The step before is gone, so start here. Screen readers also read
          // the "Check ... for your login code" line with it (aria-describedby).
          autoFocus
          // A number pad on phones, without the arrows of type="number"
          // (which would also drop leading zeros).
          inputMode="numeric"
          // Lets iPhones offer the code above the keyboard when it arrives
          // in Apple's Mail app. (Gmail's app doesn't share it.)
          autoComplete="one-time-code"
          // The keyboard's Return key says "Go": it logs you in.
          enterKeyHint="go"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          // Room for a pasted "1234 5678"; the server keeps only the digits.
          maxLength={16}
          className="h-11 text-lg tracking-widest tabular-nums"
          aria-invalid={Boolean(error)}
          aria-describedby={!pending && error ? `code-hint ${errorId("code")}` : "code-hint"}
        />
        {!pending && error && (
          <p id={errorId("code")} role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      {/* Not about the code itself: no connection, or Supabase down.
          Hidden while trying again, so a second failure with the same
          words still shows up and is read out. */}
      {!pending && state.message && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
      {/* Keeps keyboard focus while it works. */}
      <Button type="submit" disabled={pending} focusableWhenDisabled className="press-wide h-11 w-full">
        {pending ? "Logging in…" : "Log in"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        // While a code is being checked, starting over would leave you
        // logged in to the email you just left if that code was right.
        // aria-disabled, not disabled: disabled can push keyboard focus off
        // the button (same as the Undo button in undo-toast.tsx).
        aria-disabled={pending}
        onClick={() => {
          if (!pending) onStartOver();
        }}
        // Greyed with a colour, not faded, so its focus ring stays solid.
        data-unavailable={pending || undefined}
        className="press-wide h-11 w-full"
      >
        Start over (new email or new code)
      </Button>
    </form>
  );
}
