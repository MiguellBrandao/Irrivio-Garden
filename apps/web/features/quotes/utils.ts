import type { Garden } from "@/features/gardens/types"
import type { QuoteFormValues } from "@/features/quotes/schema"
import type { Quote, SaveQuotePayload } from "@/features/quotes/types"

export function toQuotePayload(values: QuoteFormValues): SaveQuotePayload {
  return {
    garden_id: values.garden_id,
    valid_until: values.valid_until,
    price: Number(values.price),
    services: values.services
      .map((service) => service.value.trim())
      .filter(Boolean),
  }
}

export function toQuoteFormValues(quote: Quote): QuoteFormValues {
  return {
    garden_id: quote.garden_id,
    valid_until: quote.valid_until,
    price: quote.price,
    services: (quote.services.length ? quote.services : [""]).map((service) => ({
      value: service,
    })),
  }
}

export function formatQuoteDate(value: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "medium",
  }).format(new Date(value))
}

export function formatQuoteCurrency(value: number) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(value)
}

export function formatQuoteServicesPreview(services: string[]) {
  if (services.length <= 2) {
    return services.join(", ")
  }

  return `${services.slice(0, 2).join(", ")} +${services.length - 2}`
}

export function getGardenLabel(garden: Garden) {
  return `${garden.client_name} - ${garden.address}`
}

export function getQuoteValidUntilFallback(quote: Pick<Quote, "valid_until" | "created_at">) {
  if (quote.valid_until) {
    return quote.valid_until
  }

  const createdAt = new Date(quote.created_at)
  createdAt.setMonth(createdAt.getMonth() + 1)
  return createdAt.toISOString().slice(0, 10)
}

export function buildQuoteDocumentTitle(quote: Quote) {
  return `Orcamento - ${quote.garden_client_name}`
}
