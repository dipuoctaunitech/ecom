import { revalidatePath } from "next/cache"

/** Keep customer, staff, and store booking views + public slot pages in sync. */
export function revalidateBookingPaths() {
  revalidatePath("/account")
  revalidatePath("/grooming")
  revalidatePath("/clinic")
  revalidatePath("/seller")
  revalidatePath("/manager")
  revalidatePath("/groomer")
  revalidatePath("/doctor")
}
