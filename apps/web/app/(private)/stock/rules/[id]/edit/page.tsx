import { StockRuleFormPage } from "@/features/stock/stock-rule-form-page"

type EditStockRulePageProps = {
  params: Promise<{ id: string }>
}

export default async function EditStockRulePage({
  params,
}: EditStockRulePageProps) {
  const { id } = await params

  return <StockRuleFormPage mode="edit" stockRuleId={id} />
}
