import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";
import { LoginSkeleton } from "@/components/login-skeleton";
import { APP_NAME } from "@/lib/app-identity";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold tracking-tight">{APP_NAME}</h1>
      <p className="mb-8 text-muted-foreground">No password. We&apos;ll email you a code and a link.</p>
      {/* The form reads the URL (?error=...), which only exists per request. */}
      <Suspense fallback={<LoginSkeleton />}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
