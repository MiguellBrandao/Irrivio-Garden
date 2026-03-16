import { GardenIrrigationPage } from "@/features/gardens/garden-irrigation-page"

export default async function GardenIrrigationRoute({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return <GardenIrrigationPage gardenId={id} />
}
