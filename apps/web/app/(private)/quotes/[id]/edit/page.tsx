import { QuoteFormPage } from "@/features/quotes/quote-form-page"

export default async function EditQuotePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return <QuoteFormPage mode="edit" quoteId={id} />
}
