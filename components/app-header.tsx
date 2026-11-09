import { signOut } from "@/lib/auth-actions";

export function AppHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <header className="mb-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-[30px] leading-tight font-semibold">{title}</h1>
        <form action={signOut}>
          <button
            type="submit"
            className="-mr-2 h-11 px-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Log out
          </button>
        </form>
      </div>
      {children}
    </header>
  );
}
