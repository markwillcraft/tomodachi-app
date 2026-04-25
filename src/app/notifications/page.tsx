import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import {
  getNotificationsPage,
  NOTIFICATIONS_PER_PAGE,
} from "@/lib/notify"
import { NotificationsClient } from "./notifications-client"

export const dynamic = "force-dynamic"

// Server Component shell for the full notification history. Each page
// renders only its slice (10 rows by default) so the bundle stays
// small even for users with thousands of rows in the bell history.
// `?page=N` is the source of truth — the client island never mutates
// pagination on its own; pagination links push a new URL and Next.js
// re-renders this component for the new page.
export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const params = await searchParams
  const requested = Number.parseInt(params.page ?? "1", 10)
  const page = Number.isFinite(requested) && requested > 0 ? requested : 1

  const data = await getNotificationsPage(userId, {
    page,
    perPage: NOTIFICATIONS_PER_PAGE,
  })

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground">
          Everything that&apos;s happened in your account — quizzes finished,
          achievements unlocked, daily quests claimed.{" "}
          {data.total > 0 && (
            <>
              {data.total.toLocaleString()} total · {NOTIFICATIONS_PER_PAGE} per
              page.
            </>
          )}
        </p>
      </header>

      <NotificationsClient initial={data} />
    </div>
  )
}
