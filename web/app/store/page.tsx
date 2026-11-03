import { Suspense } from "react"
import type { Metadata } from "next"
import { redirect } from "next/navigation"
import {
  getStoreLiveBoard,
  getStoreStaffProfile,
} from "@/app/actions/store-dashboard"
import StoreLiveDashboard from "@/components/store/StoreLiveDashboard"
import { getStoreMembership } from "@/lib/store"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Store dashboard — namma pets Club",
  description: "Live in-store order request board.",
}

export default async function StoreDashboardPage() {
  const profile = await getStoreStaffProfile()
  if (!profile) {
    redirect("/?callbackUrl=/store")
  }

  // Floor staff (groomer/doctor) keep SELLER platform role but must not
  // see customer PII on the live board — send them to their dashboard.
  if (!profile.canUpdateStatus) {
    const membership = await getStoreMembership(profile.id)
    const dest =
      membership?.role === "GROOMER"
        ? "/groomer"
        : membership?.role === "DOCTOR"
          ? "/doctor"
          : "/"
    redirect(dest)
  }

  const board = await getStoreLiveBoard()

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-surface text-sm text-ink-muted">
          Loading store board…
        </div>
      }
    >
      <StoreLiveDashboard profile={profile} initialBoard={board} />
    </Suspense>
  )
}
