import { ServiceVerticalPage } from "@/components/booking/ServiceVerticalPage"
import { getActiveStore } from "@/lib/store"
import { loadVerticalPageData } from "@/lib/service-vertical-page"

export const dynamic = "force-dynamic"

const GROOMING_VIDEO = "/videos/groom.mp4"
const GROOMING_POSTER = "/images/grooming-bg.png"

export default async function GroomingPage() {
  const store = await getActiveStore()
  const data = store
    ? await loadVerticalPageData(store.id, "GROOMING")
    : { services: [], staff: [], timeFrames: [] }

  return (
    <ServiceVerticalPage
      title="Grooming"
      heroImage={GROOMING_POSTER}
      pageBackgroundVideo={GROOMING_VIDEO}
      pageBackgroundImage={GROOMING_POSTER}
      pageBackgroundOpacity={0.3}
      heroSupport="Baths, trims, and calm spa care — book a slot that fits your pet."
      ctaLabel="See services"
      subtitle="Choose a service, then a day and groomer. We’ll hold the time for you."
      emptyHint="Grooming services will show up here soon."
      staffHeading="Your groomers"
      staffSubtitle="Gentle hands, breed-aware trims, and a quiet pace for first-timers."
      personLabel="groomer"
      services={data.services}
      staff={data.staff}
      timeFrames={data.timeFrames}
    />
  )
}
