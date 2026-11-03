import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import CustomerSignupForm from "@/components/auth/CustomerSignupForm"
import { authOptions } from "@/lib/auth"
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand"

export const metadata: Metadata = {
  title: `Sign up — ${BRAND_NAME}`,
  description: `Register your pet and parent details with ${BRAND_NAME}. ${BRAND_TAGLINE}.`,
}

export default async function SignupPage() {
  const session = await getServerSession(authOptions)
  if (session?.user) {
    redirect("/account")
  }

  return (
    <main className="min-h-screen bg-[#eef2f7]">
      <CustomerSignupForm />
    </main>
  )
}
