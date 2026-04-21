import { Flame, Volume2, Pencil } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  type DailyProgress,
  DAILY_CARD_GOAL,
  DAILY_QUIZ_GOAL,
} from "@/lib/streak";

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
  const quizPct = Math.min(100, Math.round((today.quizAnswered / DAILY_QUIZ_GOAL) * 100));
  const cardsPct = Math.min(
    100,
    Math.round((today.cardsViewed / DAILY_CARD_GOAL) * 100),
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Flame
                className={cn(
                  "size-5",
                  current > 0 ? "text-orange-400" : "text-muted-foreground",
                )}
              />
              {current}-day streak
            </CardTitle>
            <CardDescription>
              {today.completed
                ? "Today is complete — nice work."
                : "Finish both goals today to keep the streak alive."}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Longest (60d)</div>
            <div className="text-2xl font-bold">{longest}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-3">
          <Goal
            icon={<Pencil className="size-4" />}
            label="Quiz questions"
            current={today.quizAnswered}
            goal={DAILY_QUIZ_GOAL}
            pct={quizPct}
          />
          <Goal
            icon={<Volume2 className="size-4" />}
            label="Cards listened/viewed"
            current={today.cardsViewed}
            goal={DAILY_CARD_GOAL}
            pct={cardsPct}
          />
        </div>

        <div>
          <div className="mb-2 text-xs text-muted-foreground">
            Last 30 days
          </div>
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: "repeat(15, minmax(0, 1fr))" }}
          >
            {last30.map((d) => (
              <div
                key={d.day}
                title={`${d.day}: ${d.quizAnswered} answered, ${d.cardsViewed} cards${
                  d.completed ? " — complete" : ""
                }`}
                className={cn(
                  "h-6 rounded-sm border",
                  d.completed
                    ? "border-orange-400/40 bg-orange-400/70"
                    : d.quizAnswered > 0 || d.cardsViewed > 0
                      ? "border-orange-400/20 bg-orange-400/20"
                      : "border-border bg-muted/40",
                )}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Goal({
  icon,
  label,
  current,
  goal,
  pct,
}: {
  icon: React.ReactNode;
  label: string;
  current: number;
  goal: number;
  pct: number;
}) {
  const done = current >= goal;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-muted-foreground">
          {icon}
          {label}
        </span>
        <span
          className={cn(
            "font-medium",
            done ? "text-emerald-400" : "text-foreground",
          )}
        >
          {current} / {goal}
          {done ? " ✓" : ""}
        </span>
      </div>
      <Progress value={pct} />
    </div>
  );
}
