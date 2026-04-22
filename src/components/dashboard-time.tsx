"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"

type TimeContext = {
  dateLabel: string
  partOfDay: string
  greeting: string
}

function buildTimeContext(now: Date): TimeContext {
  const hour = now.getHours()
  const greeting =
    hour < 5 || hour >= 22
      ? "Burning the midnight oil"
      : hour < 12
        ? "Good morning"
        : hour < 17
          ? "Good afternoon"
          : "Good evening"

  const partOfDay =
    hour < 5 || hour >= 22
      ? "Late night"
      : hour < 12
        ? "Morning"
        : hour < 17
          ? "Afternoon"
          : "Evening"

  const dateLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(now)

  return { dateLabel, partOfDay, greeting }
}

function useLocalTimeContext() {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    const tick = () => setNow(new Date())
    tick()
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [])

  return useMemo(() => (now ? buildTimeContext(now) : null), [now])
}

export function DashboardMetaTime() {
  const ctx = useLocalTimeContext()

  if (!ctx) {
    return <span className="text-muted-foreground">Today</span>
  }

  return (
    <span className="truncate text-muted-foreground">
      <span className="font-medium text-foreground/80">{ctx.dateLabel}</span>
      <span className="mx-1.5 text-muted-foreground/60">·</span>
      <span>{ctx.partOfDay}</span>
    </span>
  )
}

export function DashboardGreeting({ firstName }: { firstName: string }) {
  const ctx = useLocalTimeContext()

  return (
    <h1 className={cn("text-2xl font-bold tracking-tight sm:text-3xl")}>
      {ctx ? ctx.greeting : "Welcome back"},{" "}
      <span className="text-primary">{firstName}</span>
      <span className="text-foreground/70">.</span>
    </h1>
  )
}
