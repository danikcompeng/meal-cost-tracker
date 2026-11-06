"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendMagicLink } from "@/lib/auth-actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(sendMagicLink, { ok: false });
  const linkFailed = useSearchParams().get("error") === "link";

  if (state.ok) {
    return <p className="text-center">{state.message}</p>;
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
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
          placeholder="you@example.com"
          className="h-11"
          aria-invalid={Boolean(state.fieldErrors?.email)}
        />
        {state.fieldErrors?.email && (
          <p className="text-sm text-destructive">{state.fieldErrors.email}</p>
        )}
      </div>
      {state.message && <p className="text-sm text-destructive">{state.message}</p>}
      <Button type="submit" disabled={pending} className="h-11 w-full">
        {pending ? "Sending…" : "Email me a login link"}
      </Button>
    </form>
  );
}
