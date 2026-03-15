import { GardenFormPage } from "@/features/gardens/garden-form-page"

export default async function EditGardenPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return <GardenFormPage mode="edit" gardenId={id} />
}
