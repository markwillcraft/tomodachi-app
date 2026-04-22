import { Volume2, Pencil, Trophy, CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type DailyProgress,
  DAILY_CARD_GOAL,
  DAILY_QUIZ_GOAL,
} from "@/lib/streak";

const WEEKDAY_SHORT = ["S", "M", "T", "W", "T", "F", "S"];
const RANGE_DAYS = 14;

type CalendarCellData = {
  day: string;
  data: DailyProgress | null;
  isFuture: boolean;
};

function buildCalendarWindow(last30: DailyProgress[]): CalendarCellData[] {
  if (last30.length === 0) return [];
  const todayIdx = last30.length - 1;
  const todayKey = last30[todayIdx].day;
  // Anchor the window to the user's *first day with activity* so we don't
  // show a sea of empty pre-history cells. If they've practiced for two
  // weeks or more, slide a normal trailing 14-day window instead.
  let firstActiveIdx = last30.findIndex(
    (d) => d.quizAnswered > 0 || d.cardsViewed > 0,
  );
  if (firstActiveIdx === -1) firstActiveIdx = todayIdx;
  const historySpan = todayIdx - firstActiveIdx + 1;

  if (historySpan >= RANGE_DAYS) {
    return last30
      .slice(-RANGE_DAYS)
      .map((d) => ({ day: d.day, data: d, isFuture: false }));
  }

  // Pad forward with future placeholder slots so the strip always renders
  // as a tidy 2 × 7 grid.
  const start = new Date(last30[firstActiveIdx].day + "T00:00:00Z");
  const known = new Map(last30.map((d) => [d.day, d]));
  const out: CalendarCellData[] = [];
  for (let i = 0; i < RANGE_DAYS; i++) {
    const dt = new Date(start);
    dt.setUTCDate(dt.getUTCDate() + i);
    const key = dt.toISOString().slice(0, 10);
    const data = known.get(key) ?? null;
    out.push({ day: key, data, isFuture: key > todayKey });
  }
  return out;
}

export function StreakWidget({
  current,
  longest,
  today,
  last30,
}: {
  current: number;
  longest: number;
  today: DailyProgress;
  last30: DailyProgress[];
}) {
  const quizPct = Math.min(
    100,
    Math.round((today.quizAnswered / DAILY_QUIZ_GOAL) * 100),
  );
  const cardsPct = Math.min(
    100,
    Math.round((today.cardsViewed / DAILY_CARD_GOAL) * 100),
  );
  const overallPct = Math.round((quizPct + cardsPct) / 2);
  const calendar = buildCalendarWindow(last30);
  const realDays = calendar.filter(
    (c): c is CalendarCellData & { data: DailyProgress } =>
      c.data !== null && !c.isFuture,
  );
  const completedDays = realDays.filter((c) => c.data.completed).length;
  const activeDays = realDays.filter(
    (c) => c.data.quizAnswered > 0 || c.data.cardsViewed > 0,
  ).length;
  const todayKey = last30[last30.length - 1]?.day;

  return (
    <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-orange-500/10 via-background to-background shadow-sm">
      <div
        aria-hidden
        className="jp pointer-events-none absolute -right-6 -top-10 select-none text-[10rem] font-bold leading-none text-orange-500/5 sm:text-[14rem]"
      >
        続
      </div>

      <div className="relative flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <StreakHero
            current={current}
            longest={longest}
            todayDone={today.completed}
            overallPct={overallPct}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-xl border bg-card/70 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Today's goals
              </div>
              <div
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-medium",
                  today.completed
                    ? "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
                    : "bg-orange-500/15 text-orange-700 dark:bg-orange-500/20 dark:text-orange-200",
                )}
              >
                {today.completed ? "Day complete" : `${overallPct}% there`}
              </div>
            </div>
            <Goal
              icon={<Pencil className="size-3.5" />}
              label="Quiz questions"
              current={today.quizAnswered}
              goal={DAILY_QUIZ_GOAL}
              pct={quizPct}
              tone="violet"
            />
            <Goal
              icon={<Volume2 className="size-3.5" />}
              label="Cards viewed"
              current={today.cardsViewed}
              goal={DAILY_CARD_GOAL}
              pct={cardsPct}
              tone="amber"
            />
          </div>

          <div className="flex flex-col gap-3 rounded-xl border bg-card/70 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <CalendarRange className="size-3.5" />
                {realDays.length === 0
                  ? "Your calendar"
                  : `${realDays.length} day${realDays.length === 1 ? "" : "s"} in`}
              </div>
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
                  {completedDays} complete
                </span>
                <span className="rounded-full bg-orange-500/15 px-2 py-0.5 font-medium text-orange-700 dark:bg-orange-500/20 dark:text-orange-200">
                  {activeDays} active
                </span>
              </div>
            </div>

            <CalendarGrid cells={calendar} todayKey={todayKey} />
          </div>
        </div>
      </div>
    </section>
  );
}

function StreakHero({
  current,
  longest,
  todayDone,
  overallPct,
}: {
  current: number;
  longest: number;
  todayDone: boolean;
  overallPct: number;
}) {
  const ringActive = todayDone || current > 0;
  return (
    <div className="flex items-center gap-4">
      <RingFlame current={current} pct={todayDone ? 100 : overallPct} active={ringActive} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1">
          <div className="text-4xl font-bold tabular-nums leading-none">
            {current}
          </div>
          <div className="text-sm text-muted-foreground">
            day{current === 1 ? "" : "s"}
          </div>
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          {todayDone
            ? "Today is complete — nice work."
            : "Finish both goals today to keep the streak alive."}
        </div>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-500/20 dark:text-amber-200">
          <Trophy className="size-3" />
          Longest (60d): <span className="tabular-nums">{longest}</span>
        </div>
      </div>
    </div>
  );
}

function RingFlame({
  current,
  pct,
  active,
}: {
  current: number;
  pct: number;
  active: boolean;
}) {
  const SIZE = 92;
  const STROKE = 8;
  const r = (SIZE - STROKE) / 2;
  const c = 2 * Math.PI * r;
  const safePct = Math.max(0, Math.min(100, pct));
  const dash = (safePct / 100) * c;
  const showActiveArc = safePct > 0;
  return (
    <div
      className="relative shrink-0"
      style={{ width: SIZE, height: SIZE }}
    >
      {/* Soft halo behind everything so the flame feels warm */}
      {active && (
        <div
          aria-hidden
          className="absolute inset-0 rounded-full bg-orange-500/35 blur-2xl dark:bg-orange-500/40"
        />
      )}

      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="absolute inset-0 -rotate-90"
      >
        <defs>
          <linearGradient id="streak-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="55%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
        </defs>
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={r}
          stroke="currentColor"
          className="text-orange-200/70 dark:text-orange-500/15"
          strokeWidth={STROKE}
          fill="none"
        />
        {showActiveArc && (
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={r}
            stroke="url(#streak-ring)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${dash} ${c}`}
            className="transition-[stroke-dasharray] duration-500"
          />
        )}
      </svg>

      {/* Hand-rolled flame with a yellow → orange → red gradient fill so it
          actually looks like fire instead of a flat orange sticker. */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          viewBox="0 0 24 24"
          width={44}
          height={44}
          className={cn(
            "drop-shadow-[0_0_10px_rgba(251,146,60,0.55)]",
            !active && "opacity-50 saturate-50",
          )}
        >
          <defs>
            <linearGradient id="flame-fill" x1="0.5" y1="1" x2="0.5" y2="0">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="40%" stopColor="#fb923c" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
            <linearGradient id="flame-core" x1="0.5" y1="1" x2="0.5" y2="0">
              <stop offset="0%" stopColor="#fef9c3" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
            fill="url(#flame-fill)"
            stroke="#b91c1c"
            strokeWidth="0.4"
            strokeLinejoin="round"
          />
          <ellipse
            cx="12"
            cy="16"
            rx="3.2"
            ry="4.2"
            fill="url(#flame-core)"
          />
        </svg>
      </div>

      {current > 0 && (
        <div className="absolute -bottom-1 -right-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-rose-600 px-1.5 text-[11px] font-bold text-white shadow-md ring-2 ring-background tabular-nums">
          {current}
        </div>
      )}
    </div>
  );
}

function Goal({
  icon,
  label,
  current,
  goal,
  pct,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  current: number;
  goal: number;
  pct: number;
  tone: "violet" | "amber";
}) {
  const done = current >= goal;
  const TONE = {
    violet: {
      iconWrap: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
      bar: "from-violet-500 to-indigo-500",
      text: "text-violet-600 dark:text-violet-300",
    },
    amber: {
      iconWrap: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
      bar: "from-amber-400 to-orange-500",
      text: "text-amber-600 dark:text-amber-300",
    },
  } as const;
  const t = TONE[tone];
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-muted-foreground">
          <span
            className={cn(
              "inline-flex size-6 items-center justify-center rounded-md",
              t.iconWrap,
            )}
          >
            {icon}
          </span>
          {label}
        </span>
        <span
          className={cn(
            "font-semibold tabular-nums",
            done ? "text-emerald-500" : "text-foreground",
          )}
        >
          {current} / {goal}
          {done && " ✓"}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r transition-[width] duration-500",
            done ? "from-emerald-500 to-emerald-400" : t.bar,
          )}
          style={{ width: `${Math.max(2, pct)}%` }}
        />
      </div>
    </div>
  );
}

function CalendarGrid({
  cells,
  todayKey,
}: {
  cells: CalendarCellData[];
  todayKey: string | undefined;
}) {
  if (cells.length === 0) return null;
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {cells.map((c) => (
        <CalendarCell key={c.day} cell={c} isToday={c.day === todayKey} />
      ))}
    </div>
  );
}

function CalendarCell({
  cell,
  isToday,
}: {
  cell: CalendarCellData;
  isToday: boolean;
}) {
  const dt = new Date(cell.day + "T00:00:00Z");
  const dayNum = dt.getUTCDate();
  const weekday = WEEKDAY_SHORT[dt.getUTCDay()];
  const intensity = cell.data ? cellIntensity(cell.data) : 0;
  const isComplete = cell.data?.completed ?? false;
  const isFuture = cell.isFuture;
  const isEmpty = !isFuture && intensity === 0;

  const title = cell.data
    ? `${cell.day}: ${cell.data.quizAnswered} / ${DAILY_QUIZ_GOAL} quiz · ${cell.data.cardsViewed} / ${DAILY_CARD_GOAL} cards${
        isComplete ? " — complete ✓" : ` — ${intensity}% effort`
      }`
    : `${cell.day}${isFuture ? " — upcoming" : " — no activity"}`;

  return (
    <div
      title={title}
      className={cn(
        "relative flex aspect-square flex-col items-center overflow-hidden rounded-md border px-1 pt-1.5 transition-colors",
        isFuture
          ? "border-dashed border-border/60 bg-transparent"
          : isComplete
            ? "border-emerald-500/40 bg-emerald-500/5 dark:border-emerald-400/40 dark:bg-emerald-500/10"
            : intensity > 0
              ? "border-orange-400/40 bg-orange-500/5 dark:border-orange-400/40 dark:bg-orange-500/10"
              : "border-border/70 bg-muted/40",
        isToday &&
          "ring-2 ring-orange-500 ring-offset-1 ring-offset-background",
      )}
    >
      {/* Vertical fill bar — the "bucket" rises from the cell floor in
          proportion to the day's effort, capped a hair below the date so
          the labels stay legible even at 100%. Goal-complete days flip
          to emerald so success reads instantly. */}
      {!isFuture && intensity > 0 && (
        <span
          aria-hidden
          className={cn(
            "absolute inset-x-0 bottom-0 transition-[height] duration-500",
            isComplete
              ? "bg-gradient-to-t from-emerald-500 to-emerald-400"
              : "bg-gradient-to-t from-orange-500 to-orange-300",
          )}
          style={{ height: `${Math.max(8, intensity * 0.6)}%` }}
        />
      )}

      {isComplete && (
        <span
          aria-hidden
          className="absolute right-0.5 top-0.5 inline-flex size-3 items-center justify-center rounded-full bg-emerald-500 text-[8px] font-bold leading-none text-white"
        >
          ✓
        </span>
      )}

      <span
        className={cn(
          "relative z-10 text-[9px] font-medium uppercase leading-none",
          isFuture ? "text-muted-foreground/60" : "text-muted-foreground",
        )}
      >
        {weekday}
      </span>
      <span
        className={cn(
          "relative z-10 mt-0.5 text-sm font-semibold leading-tight tabular-nums",
          isFuture
            ? "text-muted-foreground/60"
            : isEmpty
              ? "text-foreground/70"
              : "text-foreground",
        )}
      >
        {dayNum}
      </span>
    </div>
  );
}

function cellIntensity(d: DailyProgress): number {
  if (d.completed) return 100;
  const quizFrac = Math.min(1, d.quizAnswered / DAILY_QUIZ_GOAL);
  const cardFrac = Math.min(1, d.cardsViewed / DAILY_CARD_GOAL);
  return Math.round(((quizFrac + cardFrac) / 2) * 100);
}
