import { GardenExpensesPage } from "@/features/gardens/garden-expenses-page"

export default async function GardenExpensesRoute({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return <GardenExpensesPage gardenId={id} />
}
