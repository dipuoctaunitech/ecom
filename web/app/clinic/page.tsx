import { ServiceVerticalPage } from "@/components/booking/ServiceVerticalPage"
import { getActiveStore } from "@/lib/store"
import { loadVerticalPageData } from "@/lib/service-vertical-page"

export const dynamic = "force-dynamic"

const CLINIC_VIDEO = "/videos/clinic.mp4"
const CLINIC_POSTER = "/images/clinic-bg.png"

export default async function ClinicPage() {
  const store = await getActiveStore()
  const data = store
    ? await loadVerticalPageData(store.id, "CLINIC")
    : { services: [], staff: [], timeFrames: [] }

  return (
    <ServiceVerticalPage
      title="Clinic"
      heroImage={CLINIC_POSTER}
      pageBackgroundVideo={CLINIC_VIDEO}
      pageBackgroundImage={CLINIC_POSTER}
      pageBackgroundOpacity={0.3}
      heroSupport="Checkups, vaccines, and everyday care — book a visit with a doctor."
      ctaLabel="See visits"
      subtitle="Choose a visit, then a day and doctor. We’ll hold the time for you."
      emptyHint="Clinic visits will show up here soon."
      staffHeading="Your doctors"
      staffSubtitle="Clear advice, gentle exams, and follow-ups when your pet needs them."
      personLabel="doctor"
      services={data.services}
      staff={data.staff}
      timeFrames={data.timeFrames}
    />
  )
}
