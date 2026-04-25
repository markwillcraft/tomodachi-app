import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { getNotifications } from "@/lib/notify"
import { NotificationsClient } from "./notifications-client"

export const dynamic = "force-dynamic"

export default async function NotificationsPage() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const initial = await getNotifications(userId, 50)

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground">
          Everything that&apos;s happened in your account — quizzes finished,
          achievements unlocked, daily quests claimed. The latest 50 are shown
          here.
        </p>
      </header>

      <NotificationsClient initial={initial} />
    </div>
  )
}
