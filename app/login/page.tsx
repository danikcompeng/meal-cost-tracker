import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Meal Cost Tracker</h1>
      <p className="mb-8 text-muted-foreground">No password. We&apos;ll email you a link.</p>
      {/* The form reads the URL (?error=...), which only exists per request. */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
