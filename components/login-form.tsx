"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoginCodeForm } from "@/components/login-code-form";
import { keepOnFailure, tapAgain } from "@/lib/action-call";
import { sendMagicLink } from "@/lib/auth-actions";

// Two steps: your email, then "check your email", where you can tap the
// link in the email or type its code here.
export function LoginForm() {
  // "Start over" goes back to the email step. A new `key` gives a
  // brand-new form, which also clears what the last attempt sent back.
  const [attempt, setAttempt] = useState(0);
  return (
    <EmailThenCode
      key={attempt}
      restarted={attempt > 0}
      onStartOver={() => setAttempt((n) => n + 1)}
    />
  );
}

function EmailThenCode({ restarted, onStartOver }: { restarted: boolean; onStartOver: () => void }) {
  const [state, formAction, pending] = useActionState(
    // Offline: a message on the form instead of the error page.
    // A dropped connection may have sent it already, and a second email
    // makes the first one's code stop working, so: check first.
    keepOnFailure(sendMagicLink, tapAgain("send the email", "Email me a login code", "Check your inbox")),
    { ok: false },
  );
  // Kept here (not only in the form) so a failed send doesn't wipe what you
  // typed: React empties a form's fields after its action runs.
  const [email, setEmail] = useState("");
  // "I already have a code": e.g. iPhone reloaded the app while you were
  // in Gmail, or you asked for the email a minute ago on another device.
  const [haveCode, setHaveCode] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  // Edited since the last send: the server's "Enter a valid email." is
  // about what you typed before, so hide it while you fix it.
  const [edited, setEdited] = useState(false);
  // An old "?error=link" in the address only applies to the first try.
  const linkFailed = useSearchParams().get("error") === "link" && !restarted;

  if (state.ok && state.email) {
    return <LoginCodeForm email={state.email} sent onStartOver={onStartOver} />;
  }
  if (haveCode) {
    return <LoginCodeForm email={email.trim()} sent={false} onStartOver={onStartOver} />;
  }

  function openCodeStep() {
    if (!email.includes("@")) {
      setEmailError("Enter the email the code was sent to.");
      return;
    }
    setHaveCode(true);
  }

  const error = emailError ?? (edited ? undefined : state.fieldErrors?.email);
  return (
    <form
      action={formAction}
      onSubmit={() => {
        setEmailError(null);
        setEdited(false);
      }}
      className="space-y-4"
      noValidate
    >
      {linkFailed && (
        <p className="text-sm text-destructive">That link expired or was already used. Get a new one.</p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          // The keyboard's Return key says "send", like the button.
          enterKeyHint="send"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setEmailError(null); // you're fixing it, so stop showing it
            setEdited(true);
          }}
          // After "Start over" the button you tapped is gone, so put the
          // cursor (and screen readers) somewhere useful.
          autoFocus={restarted}
          className="h-11"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "email-error" : undefined}
        />
        {error && (
          <p id="email-error" role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      {/* Hidden while trying again, so a second failure with the same
          words still shows up and is read out. */}
      {!pending && state.message && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending} className="h-11 w-full">
        {pending ? "Sending…" : "Email me a login code"}
      </Button>
      <Button type="button" variant="ghost" onClick={openCodeStep} className="h-11 w-full">
        I already have a code
      </Button>
    </form>
  );
}
