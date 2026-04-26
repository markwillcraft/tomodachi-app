import "./globals.css";
import type { Metadata, Viewport } from "next";
import NextTopLoader from "nextjs-toploader";
import { Noto_Sans_JP } from "next/font/google";
import { auth } from "@clerk/nextjs/server";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { cn } from "@/lib/utils";
import {
  AppShell,
  type SidebarStreak,
  type SidebarCoins,
} from "@/components/app-shell";
import { ThemeProvider } from "@/components/theme-provider";
import { getStreak } from "@/lib/streak";
import { DAILY_QUIZ_GOAL, DAILY_CARD_GOAL } from "@/lib/streak";
import { getCoinSummary, syncTodaysCoins } from "@/lib/coins";
import { reconcileStreakFreezes } from "@/lib/streak-freeze";

export const metadata: Metadata = {
  title: "Tomodachi — Japanese study buddy",
  description:
    "Study Japanese with vocab cards, N5 grammar lessons, kanji stroke order, and AI-powered quizzes.",
};

// `viewportFit: "cover"` lets the page extend into iOS safe areas so
// `env(safe-area-inset-*)` returns real numbers (otherwise it's 0). This is
// required for our quiz floating action bar to clear the iPhone home
// indicator and for content padding to know the bar's true height.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Self-host Noto Sans JP via next/font so we don't pull Google Fonts’
// remote CSS (which injects font preloads that Chrome flags as “not used
// within a few seconds” when weights don’t match the first paint).
const notoSansJP = Noto_Sans_JP({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-noto-sans-jp",
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  // Pull a tiny streak + coin summary so the sidebar/topbar can show the
  // user's current momentum and reward balance — the most important
  // "should I open this app?" signals.
  let streak: SidebarStreak | null = null;
  let coins: SidebarCoins | null = null;
  if (userId) {
    try {
      // Reconcile today's activity against the coin ledger before we read
      // the summary. After the first reconciliation of the day this is a
      // cheap short-circuit (a few counts + a no-op quest claim check).
      // The streak-freeze reconcile grants this week's freeze (if due)
      // and auto-consumes freezes against yesterday's failures before
      // getStreak() runs.
      await Promise.all([
        syncTodaysCoins(userId),
        reconcileStreakFreezes(userId),
      ]);
      const [s, c] = await Promise.all([
        getStreak(userId),
        getCoinSummary(userId),
      ]);
      // Achievement evaluation lives on its two canonical surfaces:
      //   1. POST /api/quiz/submit  — fires fresh unlock toasts on the
      //      results screen for milestones earned via quizzing.
      //   2. /achievements page     — self-heals the catalog when the
      //      user opens the list, so study-only unlocks (like
      //      cards_viewed) materialize there.
      // We deliberately removed the layout-level fire-and-forget eval:
      // it ran ~10 DB queries on EVERY page navigation for unlocks
      // that aren't surfaced anywhere outside those two places.
      const quizPct = Math.min(
        100,
        Math.round((s.today.quizAnswered / DAILY_QUIZ_GOAL) * 100),
      );
      const cardsPct = Math.min(
        100,
        Math.round((s.today.cardsViewed / DAILY_CARD_GOAL) * 100),
      );
      streak = {
        current: s.current,
        todayCompleted: s.today.completed,
        quizDone: s.today.quizAnswered,
        quizGoal: DAILY_QUIZ_GOAL,
        cardsDone: s.today.cardsViewed,
        cardsGoal: DAILY_CARD_GOAL,
        overallPct: Math.round((quizPct + cardsPct) / 2),
        freezesAvailable: s.freezesAvailable,
      };
      coins = { balance: c.balance, earnedToday: c.earnedToday };
    } catch {
      streak = null;
      coins = null;
    }
  }

  return (
    <html
      lang="en"
      className={notoSansJP.variable}
      suppressHydrationWarning
    >
      <body
        className={cn("min-h-screen antialiased", notoSansJP.className)}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <ClerkProvider
            appearance={{
              baseTheme: dark,
              variables: {
                colorPrimary: "hsl(217 91% 60%)",
                borderRadius: "0.5rem",
              },
            }}
          >
            <NextTopLoader
              color="linear-gradient(to right, hsl(217 91% 60%), hsl(330 80% 60%), hsl(38 92% 55%))"
              height={3}
              showSpinner={false}
              shadow="0 0 10px hsl(217 91% 60%), 0 0 5px hsl(217 91% 60%)"
            />
            <AppShell isSignedIn={!!userId} streak={streak} coins={coins}>
              {children}
            </AppShell>
          </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
