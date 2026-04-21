# Japanese Quiz

A multi-tenant Next.js app that turns your own list of romaji into personalized
Japanese quizzes. Sign in with Clerk (Google, email, or any other social
provider you enable), build vocab from JLPT N5 categories or imported text,
then drill yourself with multiple-choice questions while the app tracks
accuracy **and** time-per-question for every word.

## Features

- **Clerk authentication** — Google sign-in, email, magic links — whatever you
  toggle on in the Clerk dashboard. Each user has their own vocabulary
  library, quiz history, and progress.
- **Three ways to build vocab**:
  1. JLPT N5 categories (Greetings, Numbers, Days & Time, Family, Colors,
     Food & Drink, Places, Verbs, Adjectives, Pronouns) — pick one or click
     "Add all".
  2. Bulk import (paste or upload `.txt`) with auto-enrichment for hiragana,
     katakana, and English meaning via Google Gemini.
  3. Inline edits to your library.
- **Quiz modes**: Vocabulary, Hiragana, Katakana, Mixed.
- **Per-question timing**: every answer is timestamped so you can see which
  words you know correctly but still hesitate on.
- **Progress dashboard**:
  - Accuracy over time (line chart)
  - Accuracy by mode
  - Weakest words (lowest accuracy)
  - Slowest words (longest avg recall time)
  - AI study tips from Gemini
- Smart sampling weights weak words more heavily in vocab/mixed mode.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui (Radix primitives, lucide-react icons)
- **Clerk** (`@clerk/nextjs` v6) for auth
- **Prisma + Postgres** (Neon recommended for free serverless)
- `wanakana` for romaji ↔ kana
- `@google/generative-ai` (model: `gemini-flash-latest`)
- `recharts` for charts

## Local setup

You need three free things:

1. **Postgres database**. Easiest: [Neon](https://neon.tech) → create a
   project → copy the pooled connection string. Or run a local Postgres.
2. **Clerk app**. Sign up at [dashboard.clerk.com](https://dashboard.clerk.com),
   create an application, enable the sign-in methods you want (Google is one
   click). Copy the **Publishable key** and **Secret key** from the API Keys
   page.
3. **Gemini API key** at
   [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).

Then:

```bash
npm install
cp .env.example .env
# Fill in DATABASE_URL, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY,
# GEMINI_API_KEY
npx prisma migrate dev --name init
npm run dev
```

Open <http://localhost:3000>, click **Sign up**, and you're in.

## Deploy to Vercel (free)

1. Push this repo to GitHub.
2. In **Vercel** → New Project → import the repo.
3. Add these environment variables in the Vercel project settings:
   - `DATABASE_URL` — your Neon Postgres connection string.
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`.
   - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`,
     `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`,
     `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard`,
     `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard`.
   - `GEMINI_API_KEY`.
4. In the **Clerk dashboard** → Domains, add your Vercel domain (e.g.
   `your-app.vercel.app`). For production sign-in with Google, also add the
   prod domain to the Google OAuth consent screen if you customized it.
5. The first deploy will run `prisma generate` automatically (via the
   `postinstall` script). Run migrations against the production DB once with:

   ```bash
   DATABASE_URL="<your-neon-url>" npx prisma migrate deploy
   ```

That's it — sign up on the deployed site and your data is private to your
account.

## Notes

- All data models (`Word`, `QuizAttempt`, `QuestionResult`) are scoped by
  `userId` (a Clerk user id like `user_2abc...`). API routes enforce this via
  `requireUserId()` in `src/lib/auth-utils.ts`.
- The N5 catalog is static TypeScript data in `src/lib/categories.ts` so no
  separate seed step is needed in production.
- Optional: hook up a Clerk webhook at `/api/webhooks/clerk` to delete a
  user's `Word`/`QuizAttempt` rows when the user is deleted in Clerk. Without
  this, deleted-user data lingers in Postgres but is unreachable.
