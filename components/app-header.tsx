import { signOut } from "@/lib/auth-actions";

export function AppHeader({ title }: { title: string }) {
  return (
    <header className="mb-8 flex items-baseline justify-between">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <form action={signOut}>
        <button type="submit" className="text-sm text-muted-foreground hover:text-foreground">
          Log out
        </button>
      </form>
    </header>
  );
}
