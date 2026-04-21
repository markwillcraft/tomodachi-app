import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
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
        <Link href={userId ? "/dashboard" : "/"} className="text-lg font-bold">
          <span className="jp">日本語</span> Quiz
        </Link>

        {userId && (
          <nav className="hidden md:flex gap-6 text-sm text-muted-foreground">
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

        <div className="flex items-center gap-2">
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
