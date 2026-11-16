"use client";

// After "Email me a login link" (or "I already have a code"): tap the link
// in the email, or type the code from the same email here. In the app on
// an iPhone's home screen, typing the code is the way that works
// (lib/login-code.ts says why).

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verifyLoginCode } from "@/lib/auth-actions";

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
  const [state, formAction, pending] = useActionState(verifyLoginCode, { ok: false });
  // Kept here so a typo doesn't wipe all the digits: React empties a form's
  // fields after its action runs, even when it comes back with an error.
  const [code, setCode] = useState("");
  const error = state.fieldErrors?.code;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {/* break-words: a long address still fits a narrow phone. */}
      <p id="code-hint" className="break-words">
        {sent ? `Check ${email} for a login link.` : `Type the code we sent to ${email}.`}
      </p>
      {/* Which email the code was sent to: the server needs it to check. */}
      <input type="hidden" name="email" value={email} />
      <div className="space-y-1.5">
        <Label htmlFor="code">{sent ? "Or type the code from the email" : "Code from the email"}</Label>
        <Input
          id="code"
          name="code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          // The step before is gone, so start here. Screen readers also read
          // the "Check ... for a login link" line with it (aria-describedby).
          autoFocus
          // A number pad on phones, without the arrows of type="number"
          // (which would also drop leading zeros).
          inputMode="numeric"
          // Lets iPhones offer the code above the keyboard when it arrives
          // in Apple's Mail app. (Gmail's app doesn't share it.)
          autoComplete="one-time-code"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          // Room for a pasted "1234 5678"; the server keeps only the digits.
          maxLength={16}
          className="h-11 text-lg tracking-widest tabular-nums"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "code-hint code-error" : "code-hint"}
        />
        {error && (
          <p id="code-error" role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <Button type="submit" disabled={pending} className="h-11 w-full">
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
        className="h-11 w-full aria-disabled:opacity-50"
      >
        Start over (new email or new code)
      </Button>
    </form>
  );
}
