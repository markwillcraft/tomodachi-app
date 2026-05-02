import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import {
  generateQuestions,
  type QuizMode,
  type GenerateOptions,
} from "@/lib/quiz";
import { getWordsWithStats, attachWordStats } from "@/lib/stats";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth-utils";
import { getKanaForGroups, type KanaScript } from "@/lib/kana";
import { N5_KANJI } from "@/lib/kanji";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const VALID_MODES: QuizMode[] = [
  "vocab",
  "hiragana",
  "katakana",
  "mixed",
  "kanji",
];

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  // Read-shaped but POST so it lives in the `read` bucket — generous
  // limit covers a real user opening multiple quiz sessions in a row.
  const limited = await enforceRateLimit("read", userId);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { count, mode, kanaScript, kanaGroups, kanjiChars, vocabFilter } =
    (body ?? {}) as {
      count?: number;
      mode?: QuizMode;
      kanaScript?: KanaScript;
      kanaGroups?: string[];
      kanjiChars?: string[];
      vocabFilter?: {
        batchIds?: number[];
        includeImported?: boolean;
      };
    };

  if (typeof count !== "number" || count < 1 || count > 200) {
    return NextResponse.json(
      { error: "count must be a number between 1 and 200" },
      { status: 400 },
    );
  }
  if (!mode || !VALID_MODES.includes(mode)) {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  const parsedFilter = parseVocabFilter(vocabFilter);
  if (parsedFilter === "invalid") {
    return NextResponse.json({ error: "Invalid vocabFilter" }, { status: 400 });
  }

  // Vocab pool — defaults to the user's full library, but a `vocabFilter`
  // narrows it to one or more category batches and/or the user's
  // imported (non-catalog) words. We do the filter inline (rather than
  // extending `getWordsWithStats`) so the helper stays focused; the
  // per-word stats roll-up is applied separately via `attachWordStats`
  // so weighted sampling still favours missed words within the
  // filtered pool.
  const words = await loadVocabPool(userId, mode, parsedFilter);
  if (mode === "vocab" && words.length === 0) {
    return NextResponse.json(
      {
        error: parsedFilter
          ? "No words available for the selected category."
          : "No vocabulary words imported yet. Import some first.",
      },
      { status: 400 },
    );
  }

  const options: GenerateOptions = {};

  // Apply kana group filter when the request asks for hiragana/katakana
  // and provides specific row groups (a, k, s, ...).
  if ((mode === "hiragana" || mode === "katakana") && Array.isArray(kanaGroups) && kanaGroups.length > 0) {
    const script: KanaScript =
      kanaScript === "both"
        ? "both"
        : mode === "hiragana"
          ? "hiragana"
          : "katakana";
    const subset = getKanaForGroups(kanaGroups, script);
    if (subset.length === 0) {
      return NextResponse.json(
        { error: "Selected kana groups produced an empty set" },
        { status: 400 },
      );
    }
    if (script === "hiragana") {
      options.hiraganaSubset = subset;
    } else if (script === "katakana") {
      options.katakanaSubset = subset;
    } else {
      // "both" — split by script so both kinds of questions are produced.
      options.hiraganaSubset = subset.filter(
        (p) =>
          p.kana >= "ぁ" && p.kana <= "ゖ", // hiragana unicode block
      );
      options.katakanaSubset = subset.filter(
        (p) => p.kana >= "ァ" && p.kana <= "ヺ", // katakana unicode block
      );
    }
  }

  // Apply kanji subset filter (lets users limit to a small group later).
  if (mode === "kanji" && Array.isArray(kanjiChars) && kanjiChars.length > 0) {
    options.kanjiSubset = N5_KANJI.filter((k) => kanjiChars.includes(k.char));
    if (options.kanjiSubset.length === 0) {
      return NextResponse.json(
        { error: "Selected kanji produced an empty set" },
        { status: 400 },
      );
    }
  }

  // Cap the requested count to the available pool for vocab so a
  // 12-word category never has to pad/repeat just because the user
  // asked for 50 questions. Other modes rely on their kana/kanji
  // subsets and tolerate the requested count as-is.
  const effectiveCount =
    mode === "vocab" ? Math.min(count, words.length) : count;
  const questions = generateQuestions(effectiveCount, mode, words, options);
  return NextResponse.json({ questions, effectiveCount });
}

type ParsedVocabFilter = {
  batchIds: number[];
  includeImported: boolean;
};

// Validate + normalise the inbound `vocabFilter`. Returns:
//  - `null` when no filter was supplied (or filter is empty → treat as "all"),
//  - `"invalid"` for a malformed shape (caller maps to 400),
//  - a normalised `ParsedVocabFilter` otherwise.
function parseVocabFilter(
  raw: { batchIds?: number[]; includeImported?: boolean } | undefined,
): ParsedVocabFilter | null | "invalid" {
  if (raw === undefined) return null;
  if (raw === null || typeof raw !== "object") return "invalid";

  const { batchIds, includeImported } = raw;

  let cleanIds: number[] = [];
  if (batchIds !== undefined) {
    if (!Array.isArray(batchIds)) return "invalid";
    if (!batchIds.every((id) => Number.isInteger(id) && id > 0)) {
      return "invalid";
    }
    cleanIds = Array.from(new Set(batchIds));
  }

  let cleanImported = false;
  if (includeImported !== undefined) {
    if (typeof includeImported !== "boolean") return "invalid";
    cleanImported = includeImported;
  }

  if (cleanIds.length === 0 && !cleanImported) return null;
  return { batchIds: cleanIds, includeImported: cleanImported };
}

async function loadVocabPool(
  userId: string,
  mode: QuizMode,
  vocabFilter: ParsedVocabFilter | null,
) {
  if (mode !== "vocab" || vocabFilter === null) {
    return getWordsWithStats(userId);
  }

  // Defensive ownership check. Drop any batch ids the user doesn't own
  // before they reach the `where` so an attacker probing ids can't peek
  // into another tenant's data, and so a stale id from the client (e.g.
  // a batch deleted in another tab) just narrows the pool instead of
  // failing the whole request.
  let ownedBatchIds: number[] = [];
  if (vocabFilter.batchIds.length > 0) {
    const owned = await prisma.importBatch.findMany({
      where: { userId, id: { in: vocabFilter.batchIds } },
      select: { id: true },
    });
    ownedBatchIds = owned.map((b) => b.id);
    if (ownedBatchIds.length !== vocabFilter.batchIds.length) {
      console.warn(
        `[quiz/generate] dropped ${
          vocabFilter.batchIds.length - ownedBatchIds.length
        } unowned batchId(s) for user ${userId}`,
      );
    }
  }

  const or: Prisma.WordWhereInput[] = [];
  if (ownedBatchIds.length > 0) {
    or.push({ batchId: { in: ownedBatchIds } });
  }
  if (vocabFilter.includeImported) {
    // Mirror the inverse rule used on `/study/vocab`: any word that
    // isn't part of a `source: "category"` batch — covers manual
    // imports plus pre-feature orphans (`batchId IS NULL`).
    or.push({ batchId: null });
    or.push({ batch: { source: { not: "category" } } });
  }
  if (or.length === 0) return [];

  const rows = await prisma.word.findMany({
    where: { userId, OR: or },
    orderBy: { createdAt: "desc" },
  });
  return attachWordStats(userId, rows);
}
