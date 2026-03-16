import { GardenDetailsPage } from "@/features/gardens/garden-details-page"

export default async function GardenDetailsRoute({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return <GardenDetailsPage gardenId={id} />
}
