import { StockFormPage } from "@/features/stock/stock-form-page"

export default async function EditStockProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return <StockFormPage mode="edit" productId={id} />
}
