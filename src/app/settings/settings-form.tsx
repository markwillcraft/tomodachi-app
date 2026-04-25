"use client";

import { useState } from "react";
import { Check, Loader2, Shield, ShieldOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function SettingsForm({
  initialAutoFreeze,
  initialTimezone,
  freezesAvailable,
}: {
  initialAutoFreeze: boolean;
  initialTimezone: string;
  freezesAvailable: number;
}) {
  const [autoFreeze, setAutoFreeze] = useState(initialAutoFreeze);
  const [savingFreeze, setSavingFreeze] = useState<SaveStatus>("idle");
  const [tz, setTz] = useState(initialTimezone);
  const [savingTz, setSavingTz] = useState<SaveStatus>("idle");

  // Detect a tz mismatch with the browser so we can offer a one-click
  // "use my local timezone" fix. We only suggest it; we never auto-flip
  // the user's preference here (they may have a reason for the override).
  const browserTz =
    typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : tz;
  const tzMismatch = browserTz && browserTz !== tz;

  async function toggleAutoFreeze(next: boolean) {
    setAutoFreeze(next);
    setSavingFreeze("saving");
    try {
      await apiFetch("/api/profile/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          autoFreezeStreak: next,
          timezoneHint: browserTz,
        }),
      });
      setSavingFreeze("saved");
      setTimeout(() => setSavingFreeze("idle"), 1500);
    } catch {
      setAutoFreeze(!next);
      setSavingFreeze("error");
    }
  }

  async function adoptBrowserTz() {
    if (!browserTz) return;
    setSavingTz("saving");
    try {
      await apiFetch("/api/profile/timezone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone: browserTz }),
      });
      setTz(browserTz);
      setSavingTz("saved");
      setTimeout(() => setSavingTz("idle"), 1500);
    } catch {
      setSavingTz("error");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-xl space-y-1">
              <h2 className="text-lg font-semibold tracking-tight">
                Streak freeze auto-apply
              </h2>
              <p className="text-sm text-muted-foreground">
                When <strong>on</strong>, your weekly freeze is automatically
                spent on missed days so the streak survives without you
                lifting a finger. When <strong>off</strong>, freezes accrue
                as credits and you decide which day to spend them on from the
                streak calendar.
              </p>
            </div>
            <Toggle
              value={autoFreeze}
              onChange={toggleAutoFreeze}
              labelOn="Auto"
              labelOff="Manual"
              busy={savingFreeze === "saving"}
            />
          </div>

          <div
            className={cn(
              "flex items-start gap-3 rounded-xl border p-4 text-sm",
              autoFreeze
                ? "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-200"
                : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200",
            )}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background/40">
              {autoFreeze ? (
                <Shield className="size-4" />
              ) : (
                <ShieldOff className="size-4" />
              )}
            </span>
            <div className="space-y-1">
              <div className="font-medium">
                {autoFreeze ? "Auto mode" : "Manual mode"}
              </div>
              <div className="text-xs opacity-90">
                {autoFreeze
                  ? "Reconcile spends a freeze on yesterday's miss the next time you open the app."
                  : "Reconcile only grants new freezes — it never spends them. You'll see a 'Use freeze' button on missed calendar cells when credits are available."}
              </div>
              <div className="pt-1 text-xs">
                Available freeze credits:{" "}
                <strong className="tabular-nums">{freezesAvailable}</strong>
              </div>
            </div>
          </div>

          <SaveIndicator status={savingFreeze} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">Timezone</h2>
            <p className="text-sm text-muted-foreground">
              Daily streak rollover, "today's earnings" and the daily quest
              reset all use this zone. Defaults to whatever your browser
              reports.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-lg border bg-muted/40 px-3 py-1.5 text-sm tabular-nums">
              {tz}
            </span>
            {tzMismatch && (
              <button
                type="button"
                onClick={adoptBrowserTz}
                disabled={savingTz === "saving"}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-60"
              >
                {savingTz === "saving" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : null}
                Use my browser timezone ({browserTz})
              </button>
            )}
          </div>

          <SaveIndicator status={savingTz} />
        </CardContent>
      </Card>
    </div>
  );
}

function Toggle({
  value,
  onChange,
  labelOn,
  labelOff,
  busy,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  labelOn: string;
  labelOff: string;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      disabled={busy}
      onClick={() => onChange(!value)}
      className={cn(
        "relative inline-flex h-9 w-32 shrink-0 items-center rounded-full border p-1 transition-colors",
        value
          ? "border-sky-500/50 bg-sky-500/20"
          : "border-amber-500/40 bg-amber-500/10",
        busy && "opacity-60",
      )}
    >
      {/* Track labels — both visible at once so the user reads the
          available state at a glance, not just the current one. */}
      <span
        className={cn(
          "absolute inset-y-0 left-0 flex items-center justify-center pl-3 text-[11px] font-semibold uppercase tracking-wider transition-opacity",
          value ? "text-sky-700 dark:text-sky-200" : "text-muted-foreground/60",
        )}
        style={{ width: "50%" }}
      >
        {labelOn}
      </span>
      <span
        className={cn(
          "absolute inset-y-0 right-0 flex items-center justify-center pr-3 text-[11px] font-semibold uppercase tracking-wider transition-opacity",
          !value ? "text-amber-700 dark:text-amber-200" : "text-muted-foreground/60",
        )}
        style={{ width: "50%" }}
      >
        {labelOff}
      </span>
      <span
        className={cn(
          "relative z-10 flex h-7 w-1/2 items-center justify-center rounded-full bg-background shadow-sm ring-1 ring-inset transition-transform",
          value ? "translate-x-0 ring-sky-500/40" : "translate-x-full ring-amber-500/40",
        )}
      >
        {busy ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : value ? (
          <Shield className="size-3.5 text-sky-600" />
        ) : (
          <ShieldOff className="size-3.5 text-amber-600" />
        )}
      </span>
    </button>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  // Reserve vertical space so toggling doesn't shift layout when the
  // saved indicator appears.
  return (
    <div className="flex h-5 items-center gap-1.5 text-xs text-muted-foreground">
      <SaveIndicatorInner status={status} />
    </div>
  );
}

function SaveIndicatorInner({ status }: { status: SaveStatus }) {
  if (status === "saving") {
    return (
      <>
        <Loader2 className="size-3.5 animate-spin" />
        Saving…
      </>
    );
  }
  if (status === "saved") {
    return (
      <>
        <Check className="size-3.5 text-emerald-500" />
        Saved
      </>
    );
  }
  if (status === "error") {
    return <span className="text-destructive">Could not save — try again.</span>;
  }
  return null;
}
