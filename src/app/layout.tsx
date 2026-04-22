import "./globals.css";
import type { Metadata, Viewport } from "next";
import NextTopLoader from "nextjs-toploader";
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
import { evaluateAchievements } from "@/lib/achievements";

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
      // Fire-and-forget achievement eval. We don't block the page on it
      // and we don't surface the unlocks here — the /achievements page
      // is the canonical list and the quiz results screen shows toasts
      // for fresh unlocks earned in that session.
      evaluateAchievements(userId).catch(() => {});
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={cn("min-h-screen antialiased")}
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
