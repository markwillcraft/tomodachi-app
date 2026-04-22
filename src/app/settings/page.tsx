import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Settings as SettingsIcon } from "lucide-react";
import { getUserPreferences } from "@/lib/time";
import { getFreezeInventory } from "@/lib/streak-freeze";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [prefs, inv] = await Promise.all([
    getUserPreferences(userId),
    getFreezeInventory(userId),
  ]);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-500/15 via-background to-background p-6 sm:p-8">
        <div
          aria-hidden
          className="jp pointer-events-none absolute -right-6 -top-10 select-none text-[10rem] font-bold leading-none text-slate-500/10 sm:text-[14rem]"
        >
          設
        </div>
        <div className="relative flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <SettingsIcon className="size-3.5" />
            Settings
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Preferences
          </h1>
          <p className="max-w-2xl text-muted-foreground sm:text-lg">
            Tune how Tomodachi handles your streak, timezone, and reward
            mechanics. Changes save instantly.
          </p>
        </div>
      </section>

      <SettingsForm
        initialAutoFreeze={prefs.autoFreezeStreak}
        initialTimezone={prefs.timezone}
        freezesAvailable={inv.available}
      />
    </div>
  );
}
