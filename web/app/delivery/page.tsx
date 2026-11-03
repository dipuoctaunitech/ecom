import { Suspense } from "react"
import type { Metadata, Viewport } from "next"
import { redirect } from "next/navigation"
import {
  getDeliveryAssignments,
  getDeliveryProfile,
} from "@/app/actions/delivery"
import DeliveryDashboard from "@/components/delivery/DeliveryDashboard"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Delivery runs — namma pets Club",
  description: "Assigned deliveries, seller QR codes, and payment collection.",
  appleWebApp: {
    capable: true,
    title: "namma pets Delivery",
    statusBarStyle: "default",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef5f0" },
    { media: "(prefers-color-scheme: dark)", color: "#101a15" },
  ],
}

export default async function DeliveryPage() {
  const profile = await getDeliveryProfile()
  if (!profile) {
    redirect("/?callbackUrl=/delivery")
  }

  const assignments = await getDeliveryAssignments()

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-surface px-4 text-sm text-ink-muted">
          Loading deliveries…
        </div>
      }
    >
      <DeliveryDashboard profile={profile} initialAssignments={assignments} />
    </Suspense>
  )
}
