"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiErrorMessage, apiFetch } from "@/lib/api-client";

// Tiny overlay button placed inside an eligible calendar cell when the
// user has the manual-freeze preference on. Calling the API fires a
// `router.refresh()` so the next render shows the day as frozen and
// the inventory in the sidebar / hero card decrements correctly.
export function FreezeCellButton({
  dayKey,
  remainingHint,
}: {
  dayKey: string;
  // Local count of remaining freezes — used purely as a UI hint so we
  // can disable the button after the user spends the last one without
  // waiting on the round-trip refresh.
  remainingHint: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function applyFreeze() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const data = await apiFetch<{ ok?: boolean; error?: string }>(
        "/api/streak/freeze/use",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ day: dayKey }),
        },
      );
      // The server returns 200 with `{ok:false,error:...}` for the
      // "no freezes available" case (vs. a hard 4xx). Preserve that
      // soft-fail surface — `apiFetch` only throws on non-2xx.
      if (!data?.ok) {
        setError(data?.error ?? "Could not apply freeze");
        setBusy(false);
        return;
      }
      router.refresh();
    } catch (e) {
      setError(apiErrorMessage(e, "Network error"));
      setBusy(false);
    }
  }

  const disabled = busy || remainingHint <= 0;
  return (
    <button
      type="button"
      onClick={applyFreeze}
      disabled={disabled}
      title={
        error ??
        `Spend a freeze on ${dayKey} to save your streak (${remainingHint} left)`
      }
      aria-label={`Use a freeze credit on ${dayKey}`}
      className={cn(
        "absolute inset-0 z-20 flex items-center justify-center rounded-md backdrop-blur-[1px] transition-all",
        "bg-sky-500/0 opacity-0 hover:bg-sky-500/15 hover:opacity-100",
        "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
        busy && "opacity-100 bg-sky-500/15",
        disabled && "cursor-not-allowed",
      )}
    >
      <span
        className={cn(
          "flex size-6 items-center justify-center rounded-full bg-sky-500 text-white shadow ring-2 ring-background",
          error && "bg-destructive",
        )}
      >
        {busy ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Shield className="size-3.5" strokeWidth={2.5} />
        )}
      </span>
    </button>
  );
}
