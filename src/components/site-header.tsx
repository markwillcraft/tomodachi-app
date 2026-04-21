import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/study", label: "Study" },
  { href: "/categories", label: "N5 Categories" },
  { href: "/import", label: "Import" },
  { href: "/quiz", label: "Quiz" },
  { href: "/progress", label: "Progress" },
];

export async function SiteHeader() {
  const { userId } = await auth();

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <Link
          href={userId ? "/dashboard" : "/"}
          className="flex items-center gap-2 text-lg font-bold"
        >
          <span
            aria-hidden
            className="inline-flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-amber-400 text-white shadow-sm"
          >
            <span className="jp text-base font-bold">友</span>
          </span>
          <span>
            Tomodachi
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              ともだち
            </span>
          </span>
        </Link>

        {userId && (
          <nav className="hidden md:flex gap-5 text-sm text-muted-foreground">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="hover:text-foreground transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Show when="signed-out">
            <SignInButton mode="modal">
              <Button size="sm" variant="ghost">
                Sign in
              </Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button size="sm">Sign up</Button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <UserButton appearance={{ elements: { avatarBox: "size-8" } }} />
          </Show>
        </div>
      </div>
      {userId && (
        <nav className="md:hidden flex gap-4 overflow-x-auto px-6 pb-3 text-sm text-muted-foreground">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="hover:text-foreground whitespace-nowrap transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
