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
  PanelLeftClose,
  PanelLeftOpen,
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

const COLLAPSED_KEY = "tomodachi_sidebar_collapsed";

export function AppShell({
  isSignedIn,
  children,
}: {
  isSignedIn: boolean;
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  // Rehydrate the persisted collapse state on mount so desktop users keep
  // their preference across sessions.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(COLLAPSED_KEY);
      if (raw === "1") setCollapsed(true);
    } catch {
      // ignore storage errors (private mode, etc.)
    }
  }, []);

  // Persist collapse state whenever it changes.
  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      // ignore
    }
  }, [collapsed]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

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

  const sidebarWidthClass = collapsed ? "lg:w-16" : "lg:w-64";
  const mainOffsetClass = collapsed ? "lg:pl-16" : "lg:pl-64";

  return (
    <div className="min-h-screen">
      <DesktopSidebar
        pathname={pathname}
        collapsed={collapsed}
        widthClass={sidebarWidthClass}
      />

      {/* Mobile drawer */}
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
        <NavList items={NAV_ITEMS} pathname={pathname} collapsed={false} />
        <div className="mt-6 border-t pt-4 text-xs text-muted-foreground">
          <Sparkles className="mr-1 inline size-3" /> Tomodachi · ともだち
        </div>
      </aside>

      <div className={cn("min-h-screen transition-[padding] duration-200", mainOffsetClass)}>
        <TopBar
          collapsed={collapsed}
          onToggleSidebar={() => setCollapsed((c) => !c)}
          onOpenDrawer={() => setDrawerOpen(true)}
        />
        <main>
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function TopBar({
  collapsed,
  onToggleSidebar,
  onOpenDrawer,
}: {
  collapsed: boolean;
  onToggleSidebar: () => void;
  onOpenDrawer: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b bg-background/80 px-3 py-2 backdrop-blur sm:px-6 sm:py-3">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="size-9 p-0 lg:hidden"
          aria-label="Open menu"
          onClick={onOpenDrawer}
        >
          <Menu className="size-5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="hidden size-9 p-0 lg:inline-flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={onToggleSidebar}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-5" />
          ) : (
            <PanelLeftClose className="size-5" />
          )}
        </Button>
        <Logo small className="lg:hidden" />
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        <Button asChild size="sm" variant="outline" className="gap-1.5">
          <Link href="/import">
            <Upload className="size-4" />
            <span className="hidden sm:inline">Import</span>
          </Link>
        </Button>
        <ThemeToggle />
        <UserButton appearance={{ elements: { avatarBox: "size-7" } }} />
      </div>
    </header>
  );
}

function DesktopSidebar({
  pathname,
  collapsed,
  widthClass,
}: {
  pathname: string;
  collapsed: boolean;
  widthClass: string;
}) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden flex-col border-r bg-card p-3 transition-[width] duration-200 lg:flex",
        widthClass,
      )}
    >
      <div className={cn("mb-6", collapsed ? "flex justify-center" : "")}>
        <Logo small={collapsed} compact={collapsed} />
      </div>
      <NavList items={NAV_ITEMS} pathname={pathname} collapsed={collapsed} />
    </aside>
  );
}

function NavList({
  items,
  pathname,
  collapsed,
}: {
  items: NavItem[];
  pathname: string;
  collapsed: boolean;
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
            title={collapsed ? item.label : undefined}
            className={cn(
              "flex items-center rounded-md text-sm transition-colors",
              collapsed
                ? "size-10 justify-center"
                : "gap-2 px-3 py-2",
              active
                ? "bg-primary/10 text-foreground font-medium"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )}
          >
            {item.icon}
            {!collapsed && <span>{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

function Logo({
  small = false,
  compact = false,
  className,
}: {
  small?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link
      href="/dashboard"
      className={cn(
        "flex items-center gap-2 font-bold",
        small ? "text-base" : "text-lg",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-flex items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-amber-400 text-white shadow-sm",
          small ? "size-8" : "size-9",
        )}
      >
        <span className="jp font-bold">友</span>
      </span>
      {!compact && (
        <span className="flex flex-col leading-tight">
          Tomodachi
          <span className="text-[10px] font-normal text-muted-foreground jp">
            ともだち
          </span>
        </span>
      )}
    </Link>
  );
}
