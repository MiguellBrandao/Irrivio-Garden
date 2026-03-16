import { GardenProductsPage } from "@/features/gardens/garden-products-page"

export default async function GardenProductsRoute({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return <GardenProductsPage gardenId={id} />
}
