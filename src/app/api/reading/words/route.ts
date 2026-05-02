import { NextResponse } from "next/server";

import { requireUserId } from "@/lib/auth-utils";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  isReadingSet,
  isReadingStage,
  ReadingDeckError,
  type ReadingSet,
  type ReadingStage,
} from "@/lib/reading";
import { getReadingWordsForStageAndSet } from "@/lib/reading-server";
import { getUserTimezone } from "@/lib/time";

export const runtime = "nodejs";

// Returns the 50-word deck for the requested Reading mode (stage,
// set?) tuple. On weekdays the `set` query param is ignored and the
// server derives it from the user's local weekday; on weekends `set`
// (1..5) is required. The response is server-shuffled so the play
// loop can hand it straight to the runner. See README §Quiz engine
// → Reading mode for the full UX contract.
export async function GET(req: Request) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const limited = await enforceRateLimit("read", userId);
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const stageNum = Number(searchParams.get("stage"));
  if (!isReadingStage(stageNum)) {
    return NextResponse.json(
      { error: "stage must be 1, 2, 3, or 4" },
      { status: 400 },
    );
  }

  const setRaw = searchParams.get("set");
  let set: ReadingSet | undefined;
  if (setRaw !== null && setRaw !== "") {
    const setNum = Number(setRaw);
    if (!isReadingSet(setNum)) {
      return NextResponse.json(
        { error: "set must be 1, 2, 3, 4, or 5" },
        { status: 400 },
      );
    }
    set = setNum;
  }

  const tz = await getUserTimezone(userId);

  try {
    const deck = await getReadingWordsForStageAndSet({
      stage: stageNum as ReadingStage,
      set,
      now: new Date(),
      tz,
    });
    return NextResponse.json(deck);
  } catch (err) {
    if (err instanceof ReadingDeckError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 400 },
      );
    }
    throw err;
  }
}
