import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDoctorDayBoard, getDoctorProfile } from "@/app/actions/doctor"
import DoctorDashboard from "@/components/doctor/DoctorDashboard"

export const dynamic = "force-dynamic"

export default async function DoctorPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect("/?callbackUrl=/doctor")
  }

  const profile = await getDoctorProfile()
  if (!profile) {
    redirect("/")
  }

  const board = await getDoctorDayBoard()

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-surface text-sm text-ink-muted">
          Loading schedule…
        </div>
      }
    >
      <DoctorDashboard initialBoard={board} />
    </Suspense>
  )
}
