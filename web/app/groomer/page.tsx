import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  getGroomerDayBoard,
  getGroomerProfile,
} from "@/app/actions/groomer"
import GroomerDashboard from "@/components/groomer/GroomerDashboard"

export const dynamic = "force-dynamic"

export default async function GroomerPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect("/?callbackUrl=/groomer")
  }

  const profile = await getGroomerProfile()
  if (!profile) {
    redirect("/")
  }

  const board = await getGroomerDayBoard()

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-surface text-sm text-ink-muted">
          Loading schedule…
        </div>
      }
    >
      <GroomerDashboard initialBoard={board} />
    </Suspense>
  )
}
