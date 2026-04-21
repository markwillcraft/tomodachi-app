"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  GraduationCap,
  Layers,
  LayoutDashboard,
  Menu,
  Sparkles,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: React.ReactNode };

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="size-4" />,
  },
  { href: "/study", label: "Study", icon: <BookOpen className="size-4" /> },
  {
    href: "/categories",
    label: "N5 Categories",
    icon: <Layers className="size-4" />,
  },
  { href: "/import", label: "Import", icon: <Upload className="size-4" /> },
  {
    href: "/quiz",
    label: "Quiz",
    icon: <GraduationCap className="size-4" />,
  },
  {
    href: "/progress",
    label: "Progress",
    icon: <TrendingUp className="size-4" />,
  },
];

export function AppShell({
  isSignedIn,
  children,
}: {
  isSignedIn: boolean;
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  // Close the mobile drawer whenever the route changes so users don't have
  // to dismiss it manually after tapping a link.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Lock body scroll when the drawer is open on mobile.
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  if (!isSignedIn) {
    return (
      <div className="min-h-screen">
        <header className="border-b">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
            <Logo />
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <SignInButton mode="modal">
                <Button size="sm" variant="ghost">
                  Sign in
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button size="sm">Sign up</Button>
              </SignUpButton>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Sidebar pathname={pathname} />

      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between gap-3 border-b bg-background/80 px-4 py-3 backdrop-blur">
        <Button
          variant="ghost"
          size="sm"
          className="size-9 p-0"
          aria-label="Open menu"
          onClick={() => setDrawerOpen(true)}
        >
          <Menu className="size-5" />
        </Button>
        <Logo small />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <UserButton appearance={{ elements: { avatarBox: "size-7" } }} />
        </div>
      </div>

      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform border-r bg-card p-4 transition-transform lg:hidden",
          drawerOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-6 flex items-center justify-between">
          <Logo small />
          <Button
            variant="ghost"
            size="sm"
            className="size-9 p-0"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
          >
            <X className="size-5" />
          </Button>
        </div>
        <NavList items={NAV_ITEMS} pathname={pathname} />
        <div className="mt-6 border-t pt-4 text-xs text-muted-foreground">
          <Sparkles className="mr-1 inline size-3" /> Tomodachi · ともだち
        </div>
      </aside>

      <main className="lg:pl-64">
        <div className="mx-auto max-w-5xl px-6 py-8 lg:py-10">{children}</div>
      </main>
    </div>
  );
}

function Sidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-card p-4 lg:flex">
      <div className="mb-6">
        <Logo />
      </div>
      <NavList items={NAV_ITEMS} pathname={pathname} />
      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
        <UserButton appearance={{ elements: { avatarBox: "size-8" } }} />
        <ThemeToggle />
      </div>
    </aside>
  );
}

function NavList({
  items,
  pathname,
}: {
  items: NavItem[];
  pathname: string;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-primary/10 text-foreground font-medium"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Logo({ small = false }: { small?: boolean }) {
  return (
    <Link
      href="/dashboard"
      className={cn(
        "flex items-center gap-2 font-bold",
        small ? "text-base" : "text-lg",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-flex items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-amber-400 text-white shadow-sm",
          small ? "size-7" : "size-8",
        )}
      >
        <span className="jp font-bold">友</span>
      </span>
      <span className="flex flex-col leading-tight">
        Tomodachi
        <span className="text-[10px] font-normal text-muted-foreground jp">
          ともだち
        </span>
      </span>
    </Link>
  );
}
